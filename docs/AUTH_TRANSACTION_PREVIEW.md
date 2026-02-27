# Auth Service Transaction Preview (Not Applied)

이 문서는 `src/auth/auth.service.ts`에 적용할 **예정 구조**를 검수용으로 정리한 문서입니다.  
아직 실제 코드 수정은 하지 않았습니다.

## 1) 적용 범위

- 대상 파일: `src/auth/auth.service.ts`
- 대상 메서드:
  - `signup()` -> `user.create + dog.create + refreshToken.create`를 같은 트랜잭션으로 처리
  - `refresh()` -> refresh token rotation 전체를 같은 트랜잭션으로 처리
  - `issueTokens()/storeRefreshToken()` -> 트랜잭션 클라이언트 전달 가능하도록 시그니처 확장

## 2) 변경 후 흐름

### `signup()` 흐름

1. 중복 이메일 확인
2. 비밀번호 해시 생성
3. `prisma.$transaction(async (tx) => { ... })`
4. `tx.user.create(...)`
5. `tx.dog.create(...)` (ownerId = user.id)
6. `issueTokens(user, tx)` 호출
7. 내부에서 `tx.refreshToken.create(...)` 저장
8. 성공 시 commit, 실패 시 rollback

### `refresh()` 흐름

1. `verifyRefreshToken()`으로 JWT 검증
2. 토큰 해시 계산
3. `prisma.$transaction(async (tx) => { ... })`
4. `tx.user.findUnique(...)`로 사용자 확인
5. `tx.refreshToken.updateMany(...)`로 기존 토큰 조건부 revoke
6. `count !== 1`이면 `401` 예외
7. `issueTokens(user, tx)` 호출
8. 내부에서 새 refresh token row 저장
9. 성공 시 commit, 실패 시 rollback

## 3) 교체 예정 코드 (검수용)

### 3-1. import/type 추가

```ts
import { Prisma } from '@prisma/client';

type DbClient = PrismaService | Prisma.TransactionClient;
```

### 3-2. `signup()` 교체안

```ts
async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
  const { email, password, nickname, dog } = signupDto;

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

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        nickname,
      },
    });

    await tx.dog.create({
      data: {
        ownerId: user.id,
        name: dog.name,
        breed: dog.breed,
        birthYear: dog.birthYear === '' ? null : dog.birthYear,
        gender: dog.gender,
        personality: dog.personality,
        photoUrl: dog.photoUrl,
      },
    });

    return this.issueTokens(user, tx);
  });
}
```

### 3-3. `refresh()` 교체안

```ts
async refresh(refreshToken: string): Promise<AuthResponseDto> {
  const payload = this.verifyRefreshToken(refreshToken);
  const tokenHash = this.hashRefreshToken(refreshToken);

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    const now = new Date();
    const revoked = await tx.refreshToken.updateMany({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        revokedAt: now,
      },
    });

    if (revoked.count !== 1) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_TOKEN);
    }

    return this.issueTokens(user, tx);
  });
}
```

### 3-4. `issueTokens()` 시그니처 교체안

```ts
private async issueTokens(
  user: AuthUser,
  db: DbClient = this.prisma,
): Promise<AuthResponseDto> {
  const accessToken = this.signToken(user, TokenType.ACCESS);
  const refreshToken = this.signToken(user, TokenType.REFRESH);
  await this.storeRefreshToken(user.id, refreshToken, db);

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
```

### 3-5. `storeRefreshToken()` 시그니처 교체안

```ts
private async storeRefreshToken(
  userId: string,
  refreshToken: string,
  db: DbClient = this.prisma,
): Promise<void> {
  const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
    secret: this.getJwtSecret(),
  });

  if (payload.type !== TokenType.REFRESH || typeof payload.exp !== 'number') {
    throw new Error('Refresh token payload is invalid.');
  }

  const tokenHash = this.hashRefreshToken(refreshToken);

  await db.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(payload.exp * 1000),
    },
  });
}
```

## 4) 검수 포인트

- `refresh` 동시 요청 시 같은 토큰으로 1건만 revoke 성공하고, 나머지는 `401`로 떨어지는지
- `refresh` 중간 실패 시 revoke/create가 부분 반영되지 않는지
- `signup` 중간 실패 시 user row만 남는 반쪽 상태가 사라지는지
- 기존 wire format(`{ data }`, `{ error }`)이 그대로 유지되는지

## 5) 이번 문서 상태

- 이 문서는 검수용 제안안입니다.
- 실제 반영은 승인 후 진행합니다.
