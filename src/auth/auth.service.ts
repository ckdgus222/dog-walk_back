import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TokenExpiredError } from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignupDto } from './dto/signup.dto';
import { ENV_KEYS, ERROR_MESSAGES } from '../common/constants';

type AuthUser = {
  id: string;
  email: string;
  nickname: string;
};

enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

type JwtPayload = {
  sub: string;
  email: string;
  type: TokenType;
  exp?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
    const { email, password, nickname } = signupDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    const rounds = Number(
      this.configService.get<string>(ENV_KEYS.HASH_ROUNDS) ?? '10',
    );
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname,
      },
    });

    return this.issueTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = this.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    const tokenRecord = await this.findValidRefreshToken(
      payload.sub,
      refreshToken,
    );

    if (!tokenRecord) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.verifyRefreshToken(refreshToken);
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

  private async issueTokens(user: AuthUser): Promise<AuthResponseDto> {
    const accessToken = this.signToken(user, TokenType.ACCESS);
    const refreshToken = this.signToken(user, TokenType.REFRESH);
    await this.storeRefreshToken(user.id, refreshToken);

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
  ): Promise<void> {
    const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
      secret: this.getJwtSecret(),
    });

    if (payload.type !== TokenType.REFRESH || typeof payload.exp !== 'number') {
      throw new Error('Refresh token payload is invalid.');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(payload.exp * 1000),
      },
    });
  }

  private async findValidRefreshToken(userId: string, refreshToken: string) {
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
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
