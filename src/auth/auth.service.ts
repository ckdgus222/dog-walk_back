import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TokenExpiredError } from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignupDto } from './dto/signup.dto';
import { ENV_KEYS, ERROR_MESSAGES } from '../common/constants';
import {
  moveUploadFile,
  resolveFinalStorageKey,
  toUploadsUrl,
} from '../media/media-storage.util';

type AuthUser = {
  // 예: "user_123"
  id: string;
  // 예: "test@example.com"
  email: string;
  // 예: "멍멍이아빠"
  nickname: string;
};

enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

type JwtPayload = {
  // JWT의 subject(사용자 ID)
  sub: string;
  // 로그인한 사용자 이메일
  email: string;
  // access 토큰인지 refresh 토큰인지 구분
  type: TokenType;
  // 만료시각(초 단위 Unix time), 일부 상황에선 없을 수 있어 optional
  exp?: number;
};

type DbClient = PrismaService | Prisma.TransactionClient;

type MovedUploadFile = {
  // 예: "tmp/media/abc.jpg"
  fromStorageKey: string;
  // 예: "media/abc.jpg"
  toStorageKey: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    // signupDto 예시:
    // {
    //   email: "u@u.com",
    //   password: "123456",
    //   nickname: "코기집사",
    //   dog: { name: "초코", ..., photoFileId: "cm_media_id" }
    // }
    const { email, password, nickname, dog } = signupDto;

    // 1) 이메일 중복 차단: 이미 같은 이메일 유저가 있으면 가입 거절
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    // 비밀번호를 평문으로 저장하면 위험하므로 hash로 저장
    const rounds = this.getHashRounds();
    const passwordHash = await bcrypt.hash(password, rounds);
    // passwordHash 예: "$2b$10$G2y..."

    // 파일 이동(임시 -> 최종)이 발생했을 때 DB 실패 시 되돌리기 위한 상태값입니다.
    let movedDogPhoto: MovedUploadFile | null = null;

    try {
      // 2) signup 핵심 단위를 트랜잭션으로 묶습니다.
      return await this.prisma.$transaction(async (tx) => {
        // 최종 경로 계산 결과(예: "media/abc.jpg"), 이동이 없으면 null 유지
        let finalizedPhotoStorageKey: string | null = null;

        // 프로필 파일 id를 같이 보낸 경우에만 파일 검증/승격 수행
        if (dog.photoFileId) {
          // 2-1) 선업로드 파일이 "미귀속 DOG_PROFILE"인지 검증
          const media = await tx.media.findUnique({
            where: { id: dog.photoFileId },
            select: {
              // 조회 결과 예:
              // {
              //   id: "cm_media_id",
              //   purpose: "DOG_PROFILE",
              //   uploaderUserId: null,
              //   storageKey: "tmp/media/abc.jpg"
              // }
              id: true,
              purpose: true,
              uploaderUserId: true,
              storageKey: true,
            },
          });

          if (
            !media ||
            media.purpose !== 'DOG_PROFILE' ||
            media.uploaderUserId !== null
          ) {
            // 아래 중 하나라도 true면 잘못된 파일:
            // 1) 파일 없음 2) DOG_PROFILE 아님 3) 이미 누군가 소유 중
            throw new BadRequestException(
              ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE,
            );
          }

          // 2-2) tmp/media/... 파일이면 media/...로 승격할 최종 키를 계산
          // 예: "tmp/media/abc.jpg" -> "media/abc.jpg"
          finalizedPhotoStorageKey = resolveFinalStorageKey(media.storageKey);
          if (finalizedPhotoStorageKey !== media.storageKey) {
            // 2-3) 실제 파일 이동(디스크)을 먼저 수행
            await this.movePhotoFileOrThrow({
              sourceStorageKey: media.storageKey,
              targetStorageKey: finalizedPhotoStorageKey,
            });
            // 트랜잭션 중 실패 시 원복하기 위해 이동 이력 저장
            movedDogPhoto = {
              fromStorageKey: media.storageKey,
              toStorageKey: finalizedPhotoStorageKey,
            };
          }
        }

        // 2-4) User 생성
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            nickname,
          },
        });
        // user 예: { id: "user_123", email: "...", nickname: "..." }

        // 2-5) Dog 생성(요청의 dog payload 반영)
        await tx.dog.create({
          data: {
            ownerId: user.id,
            name: dog.name,
            breed: dog.breed,
            birthYear: dog.birthYear === '' ? null : dog.birthYear,
            gender: dog.gender,
            personality: dog.personality,
            photoFileId: dog.photoFileId,
          },
        });
        // dog.photoFileId가 있으면 Dog.photoFileId(FK) -> Media.id 연결

        if (dog.photoFileId) {
          // 2-6) Media를 최종 귀속(uploaderUserId) + 경로(storageKey/url)로 확정
          await tx.media.update({
            where: { id: dog.photoFileId },
            data: {
              uploaderUserId: user.id,
              ...(finalizedPhotoStorageKey && movedDogPhoto
                ? {
                    storageKey: finalizedPhotoStorageKey,
                    url: toUploadsUrl(finalizedPhotoStorageKey),
                  }
                : {}),
            },
          });
          // update 결과 개념:
          // uploaderUserId: null -> "user_123"
          // storageKey: "tmp/media/abc.jpg" -> "media/abc.jpg"(필요할 때만)
        }

        // 가입 성공 응답으로 access/refresh/user를 반환
        return this.issueTokens(user, tx);
      });
    } catch (error) {
      // 트랜잭션 실패 시, 이미 이동한 파일이 있다면 원복 시도
      await this.rollbackMovedUploadFile(movedDogPhoto);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // loginDto 예: { email: "u@u.com", password: "123456" }
    const { email, password } = loginDto;

    // 이메일로 사용자 1명 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // 입력한 비밀번호와 DB의 hash를 비교
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // 로그인 성공 시 access/refresh 토큰을 새로 발급합니다.
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    // refresh 토큰 검증 -> 기존 토큰 revoke -> 새 토큰 재발급
    const payload = this.verifyRefreshToken(refreshToken);
    // payload 예: { sub: "user_123", email: "u@u.com", type: "refresh", exp: ... }

    // payload.sub(userId)로 실제 사용자 존재 확인
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    // DB에 살아있는 refresh token 레코드가 있는지 확인
    const tokenRecord = await this.findValidRefreshToken(
      payload.sub,
      refreshToken,
    );

    if (!tokenRecord) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    // 기존 refresh 토큰은 즉시 revoke 처리(재사용 방지)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    // 전달받은 refresh 토큰만 무효화(세션 단위 로그아웃)
    const payload = this.verifyRefreshToken(refreshToken);
    // payload.sub = 로그아웃 대상 사용자 ID
    const tokenRecord = await this.findValidRefreshToken(
      payload.sub,
      refreshToken,
    );

    if (!tokenRecord) {
      return;
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: AuthUser,
    db: DbClient = this.prisma,
  ): Promise<AuthResponseDto> {
    // access/refresh를 함께 발급하고, refresh 해시를 DB에 저장합니다.
    const accessToken = this.signToken(user, TokenType.ACCESS);
    const refreshToken = this.signToken(user, TokenType.REFRESH);
    await this.storeRefreshToken(user.id, refreshToken, db);

    // 최종 반환 예:
    // {
    //   accessToken: "...",
    //   refreshToken: "...",
    //   user: { id: "user_123", email: "u@u.com", nickname: "코기집사" }
    // }
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    db: DbClient = this.prisma,
  ): Promise<void> {
    // refresh 토큰의 exp를 꺼내 DB 만료시각과 일치시킵니다.
    const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
      secret: this.getJwtSecret(),
    });

    if (payload.type !== TokenType.REFRESH || typeof payload.exp !== 'number') {
      throw new Error('Refresh token payload is invalid.');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    // tokenHash 예: "f7a9... (sha256 hex)"

    await db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(payload.exp * 1000),
      },
    });
  }

  private async findValidRefreshToken(userId: string, refreshToken: string) {
    // 조건: 같은 사용자 + 같은 해시 + revoke 안됨 + 만료 안됨
    return this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private verifyRefreshToken(refreshToken: string): JwtPayload {
    if (!refreshToken) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.getJwtSecret(),
      });

      // refresh 엔드포인트에는 refresh 타입만 허용합니다.
      if (payload.type !== TokenType.REFRESH) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
      }

      return payload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException(ERROR_MESSAGES.AUTH.TOKEN_EXPIRED);
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }
  }

  private signToken(user: AuthUser, tokenType: TokenType): string {
    // 토큰 재사용 식별을 위해 jti를 매번 새 UUID로 발급합니다.
    const payload = {
      email: user.email,
      sub: user.id,
      type: tokenType,
      jti: randomUUID(),
    };

    const expiresIn =
      tokenType === TokenType.REFRESH
        ? ((this.configService.get<string>(ENV_KEYS.REFRESH_EXPIRES) ??
            '7d') as JwtSignOptions['expiresIn'])
        : ((this.configService.get<string>(ENV_KEYS.ACCESS_EXPIRES) ??
            '3h') as JwtSignOptions['expiresIn']);

    // payload 예:
    // { email: "u@u.com", sub: "user_123", type: "access", jti: "uuid" }
    return this.jwtService.sign(payload, {
      expiresIn,
      secret: this.getJwtSecret(),
    });
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>(ENV_KEYS.JWT_SECRET);

    if (!secret) {
      throw new Error('JWT_SECRET is not configured.');
    }

    return secret;
  }

  private getHashRounds(): number {
    const rounds = Number(this.configService.get<string>(ENV_KEYS.HASH_ROUNDS));

    if (Number.isFinite(rounds) && rounds > 0) {
      return rounds;
    }

    return 10;
  }

  private hashRefreshToken(refreshToken: string): string {
    // 토큰 원문을 DB에 저장하지 않고 해시만 저장(유출 위험 감소)
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private async movePhotoFileOrThrow(params: {
    sourceStorageKey: string;
    targetStorageKey: string;
  }): Promise<void> {
    // 예: source="tmp/media/abc.jpg", target="media/abc.jpg"
    try {
      await moveUploadFile(params.sourceStorageKey, params.targetStorageKey);
    } catch {
      // 파일이 없거나 이동 실패하면 비즈니스적으로 "유효하지 않은 파일"로 취급합니다.
      throw new BadRequestException(ERROR_MESSAGES.DOG.INVALID_PHOTO_FILE);
    }
  }

  private async rollbackMovedUploadFile(
    movedUploadFile: MovedUploadFile | null,
  ): Promise<void> {
    if (!movedUploadFile) {
      return;
    }

    try {
      // DB 실패 시 반대로 되돌림: "media/abc.jpg" -> "tmp/media/abc.jpg"
      await moveUploadFile(
        movedUploadFile.toStorageKey,
        movedUploadFile.fromStorageKey,
      );
    } catch {
      // 파일 롤백 실패는 원본 예외를 가리지 않도록 무시합니다.
    }
  }
}
