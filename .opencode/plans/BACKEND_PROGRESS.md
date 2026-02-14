# 🚀 백엔드 구현 진행 내역

## 🎯 프로젝트: 강아지 산책 매칭 앱

## 📅 시작일: 2025-02-05

> 메인 계획서(정본): `PLAN_BACKEND.md`  
> 이 문서는 “진행/로그”만 기록합니다. (상세 계획/우선순위는 PLAN을 따릅니다.)

---

## 📌 문서 목적

이 문서는 **강아지 산책 매칭 앱** 백엔드 개발 진행 상황을 기록하기 위한 것입니다.

### 🎯 사용 목적

- **학습**: NestJS, Prisma, PostgreSQL 등 기술 스택 학습
- **포트폴리오**: 풀스택 개발 경험 증명
- **작업 추적**: 중단 후 재개 시 어디까지 했는지 파악

### 🔄 작업 방식

- **프론트엔드 + 백엔드 연동 개발**
- **각 작업 완료 시마다 이 문서에 기록**
- **완료된 작업, 현재 작업, 예정 작업** 구분

### 📊 진행 방식

1. 각 Step/Task 완료 시 체크박스 체크
2. 완료된 코드/설명 추가
3. 학습 내용 기록
4. 다음 작업 계획 업데이트

---

## 📊 전체 진행률

- [x] Step 1: 환경 설정 (100%)
- [x] Step 2: Prisma 기반 구축 (100%)
- [x] Step 3: Common 모듈 생성 (100%)
- [ ] Step 4: Auth 모듈 구현 (85%) - signup/login/me + refresh/logout + JWT Guard/Strategy 완료
- [x] Step 5: 마이그레이션 (100%) - User 테이블 생성 완료
- [ ] Step 6: API 테스트 (0%)

---

## 📍 최근 작업 로그 (2026-02-14)

### Task 분할 및 진행 현황

- [x] Task 1: Auth 현재 상태 점검 (파일 불일치 원인 확인)
- [x] Task 2: 최신 Auth 구조로 `auth.service.ts` 정렬
- [x] Task 3: `RefreshToken` 스키마/마이그레이션 정합 확인
- [x] Task 4: Prisma Client 재생성 (`npx prisma generate`)
- [x] Task 5: 빌드 확인 (`npm run build`)
- [ ] Task 6: API 수동 검증 (Postman/Thunder)
- [x] Task 7: AuthService 타입 안정화 (`no-unsafe-*` 오류 해소)
- [x] Task 8: Prisma delegate 정합 재확인 (`prisma.refreshToken`)
- [x] Task 9: `MeModule` 추가 (`GET /me`, `PATCH /me`)
- [x] Task 10: `AppModule` 연동 확인
- [ ] Task 11: `/me` API 수동 검증 (Bearer access token)
- [x] Task 12: 프론트 전달용 Auth API 문서 작성 (`docs/AUTH_API.md`)
- [x] Task 13: 전역 성공 응답 포맷 통일 (`ResponseInterceptor`)
- [x] Task 14: 전역 에러 응답 포맷 통일 (`HttpExceptionFilter`)
- [x] Task 15: 프론트 전달용 응답/에러 포맷 문서화 (`docs/API_RESPONSE_FORMAT.md`)
- [x] Task 16: CORS 설정 (frontend `localhost:3000` 허용)

### 결과 요약

- 컨트롤러/서비스 불일치 해소: `refresh`, `logout` 메서드 정합 완료
- 최신 Auth 구조 반영: refresh token 해시 저장, rotation, revoke
- ESLint 타입 이슈 해소: `jwt decode(any)` 제거, `verify<JwtPayload>` 기반으로 변경
- `/me` 기능 추가: 내 정보 조회/수정 API 엔드포인트 연결
- 응답 포맷 공통화: 성공은 `{ data }`, 에러는 `{ error: { code, message, details? } }`로 통일
- 프론트 문서 업데이트: `docs/AUTH_API.md`에 전역 응답 포맷 반영 + `docs/API_RESPONSE_FORMAT.md` 추가
- 다음 작업: Auth + `/me` API 수동 검증 후 Step 4 완료 처리

### Task 13-14 작업 노트

- 변경 파일: `src/common/interceptors/response.interceptor.ts`, `src/common/filters/http-exception.filter.ts`, `src/main.ts`
- 검증 명령:
  - `npx eslint src/common/filters/http-exception.filter.ts src/common/interceptors/response.interceptor.ts src/main.ts`
  - `npm run build`
- 다음: Postman/Thunder로 성공/실패 케이스 응답 스키마 확인

### Task 15 작업 노트

- 변경 파일: `docs/API_RESPONSE_FORMAT.md`, `docs/AUTH_API.md`
- 다음: 프론트에서 공통 응답 파서/에러 핸들러 적용

### Task 16 작업 노트

- 변경 파일: `src/main.ts`, `docs/AUTH_API.md`, `docs/API_RESPONSE_FORMAT.md`
- 환경변수: `FRONTEND_ORIGIN` (기본: `http://localhost:3000`)
- 검증:
  - 브라우저에서 `http://localhost:3000` → `http://localhost:3001` 호출 시 preflight 통과 확인
  - `npm run build`, `npm run lint`

---

## ✅ 완료된 작업

### Step 1: 환경 설정 ✅

**날짜**: 2025-02-05

#### 1.1 Docker PostgreSQL 설정

- [x] `docker-compose.yml` 작성
  - 서비스명: db
  - 이미지: postgres:16-alpine
  - healthcheck 추가
  - volume 설정 (dog_walk_pgdata)

#### 1.2 .env 설정

```env
POSTGRES_USER=<local>
POSTGRES_PASSWORD=<local>
POSTGRES_DB=<local>
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<db>?schema=public"
JWT_SECRET="<local-secret>"
PORT=3001
```

> 실제 값은 `.env`(gitignore)에서만 관리하고, 이 문서에는 붙여넣지 않습니다.

#### 1.3 패키지 설치

- [x] @nestjs/jwt, bcrypt
- [x] passport, passport-jwt, @nestjs/passport
- [x] @types/bcrypt, @types/passport-jwt

#### 1.4 DBeaver 연결

- [x] PostgreSQL DB 연결 성공
- [x] 테이블 확인 가능 상태

---

### Step 2: Prisma 기반 구축 ✅

**날짜**: 2025-02-05

#### 2.1 PrismaService 구현

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 2.2 PrismaModule 설정

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

#### 2.3 User 모델 정의

```prisma
// prisma/schema.prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  nickname     String
  profileImage String?
  bio          String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**설명**:

- `@id`: 기본키 (UUID)
- `@unique`: email 중복 방지
- `@default(uuid())`: 자동 UUID 생성
- `@default(now())`: 생성일 자동 설정
- `@updatedAt`: 수정 시 자동 갱신
- `String?`: nullable (선택값)

---

### Step 3: 마이그레이션 실행 ✅

**날짜**: 2025-02-05

#### 3.1 마이그레이션 완료

```bash
npx prisma migrate dev --name init
```

**결과**:

- ✅ `prisma/migrations/20250205_xxxxx_init/migration.sql` 생성
- ✅ PostgreSQL에 User 테이블 생성
- ✅ Prisma Client TypeScript 타입 자동 생성

#### 3.2 DBeaver 확인

- [x] User 테이블 생성 확인
- [x] 컬럼 구조 정상 (id, email, passwordHash, nickname, etc.)

---

### Step 4: Common 모듈 생성 ✅

**날짜**: 2025-02-09

#### 4.1 파일 구조

```
src/common/constants/
├── env-keys.ts         # 환경변수 키 상수
├── error-messages.ts   # 에러 메시지 상수
└── index.ts
```

#### 4.2 env-keys.ts

```typescript
export const ENV_KEYS = {
  // Database
  DATABASE_URL: 'DATABASE_URL',

  // JWT
  JWT_SECRET: 'JWT_SECRET',
  ACCESS_EXPIRES: 'ACCESS_EXPIRES',
  REFRESH_EXPIRES: 'REFRESH_EXPIRES',

  // App
  PORT: 'PORT',

  // Postgres (Docker)
  POSTGRES_USER: 'POSTGRES_USER',
  POSTGRES_PASSWORD: 'POSTGRES_PASSWORD',
  POSTGRES_DB: 'POSTGRES_DB',
} as const;
```

**장점**:

- 오타 방지 (타입 안정성)
- 환경변수 키 중앙 관리
- IDE 자동완성 지원

#### 4.3 error-messages.ts

```typescript
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    EMAIL_ALREADY_EXISTS: '이미 존재하는 이메일입니다.',
    INVALID_TOKEN: '유효하지 않은 토큰입니다.',
    TOKEN_EXPIRED: '토큰이 만료되었습니다.',
    UNAUTHORIZED: '인증이 필요합니다.',
  },
  USER: {
    NOT_FOUND: '사용자를 찾을 수 없습니다.',
    ALREADY_EXISTS: '이미 존재하는 사용자입니다.',
  },
  INTERNAL: {
    SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    DATABASE_ERROR: '데이터베이스 오류가 발생했습니다.',
  },
} as const;
```

**장점**:

- 에러 메시지 일관성
- 다국어 지원 용이
- 중앙 관리

**확장 계획**: 나중에 필요시 dto, decorators, filters, guards 등 추가

---

## 🔄 현재 작업 중

### Step 4: Auth 모듈 구현 진행 중 (85%)

**최종 업데이트**: 2026-02-14

**진행 상황**:

- [x] DTO 작성 완료 (SignupDto, LoginDto, AuthResponseDto)
- [x] AuthService 구현 완료 (signup, login, refresh, logout)
- [x] ERROR_MESSAGES 적용 완료
- [x] 버그 수정 (existingUser 체크 로직)
- [x] ConfigService 적용 완료
- [x] ENV_KEYS 적용 완료
- [x] Enum(TokenType) 적용 완료
- [x] 토큰 타입 구분 로직 추가 (payload.type)
- [x] AuthController 구현 완료
- [x] JWT Strategy & Guard 구현 완료
- [x] AuthModule 조립 완료
- [x] RefreshToken 저장/회전/폐기 로직 반영
- [ ] API 수동 검증 예정

---

---

## 📝 예정된 작업

### Step 5: Auth 모듈 구현 (마무리 단계)

> 정본/우선순위: `PLAN_BACKEND.md` (Phase 1 — Auth API 완성)

코드 위치: `src/auth/*`

#### 5.1 남은 작업

- [ ] API 수동 검증
  - POST /auth/signup
  - POST /auth/login
  - POST /auth/refresh
  - POST /auth/logout
  - GET /auth/me (Bearer access token)
- [ ] .env 설정 최종 확인
  - ACCESS_EXPIRES='3h'
  - REFRESH_EXPIRES='7d'
  - HASH_ROUNDS='10'

### Step 6: API 테스트

- [ ] API 테스트 (Postman/Thunder Client)
  - POST /auth/signup
  - POST /auth/login

---

## 🔗 관련 파일

- `.env`: 환경변수 설정
- `docker-compose.yml`: PostgreSQL 컨테이너
- `prisma/schema.prisma`: DB 스키마
- `src/prisma/prisma.service.ts`: DB 연결 서비스
- `src/prisma/prisma.module.ts`: Prisma 모듈
- `src/common/constants/`: 환경변수 키, 에러 메시지 상수
- `src/auth/auth.service.ts`: 인증 서비스 (signup, login)
- `src/auth/dto/`: 인증 관련 DTO
- `.opencode/plans/BACKEND_PROGRESS.md`: 이 파일

---

## 📚 학습 내용

### DB 컬럼 모델 설명

- `id`: UUID 기본키
- `email`: 고유 이메일 (로그인용)
- `passwordHash`: bcrypt 암호화된 비밀번호
- `nickname`: 사용자 표시 이름
- `profileImage`: 프로필 이미지 URL (선택)
- `bio`: 자기소개 (선택)
- `createdAt`: 가입일시 (자동생성)
- `updatedAt`: 수정일시 (자동갱신)

### 마이그레이션 설명

- **마이그레이션**: Prisma Schema → DB 테이블 자동 생성
- `npx prisma migrate dev --name init`:
  - `migrate dev`: 개발 모드 마이그레이션 (자동으로 prisma generate 포함)
  - `--name init`: 마이그레이션 이름 지정

### JWT 토큰 설명

**토큰 발급 과정**:

1. payload 생성 (sub: user.id, email: user.email)
2. JwtService.sign(payload, secret, expiresIn)
3. SECRET_KEY로 서명 생성
4. JWT 반환 (Header.Payload.Signature)

**Access Token vs Refresh Token**:

- **Access Token**: 3시간 유효, API 요청 시 사용
- **Refresh Token**: 7일 유효, Access Token 재발급용

**시크릿 키 사용 시점**:

- ✅ 발급 (sign): SECRET_KEY로 서명
- ✅ 검증 (verify): SECRET_KEY로 확인

### Common 모듈 설명

**목적**: 상수, 공통 기능 중앙 관리

**장점**:

- 오타 방지 (타입 안정성)
- 일관성 확보
- 유지보수 용이
- 재사용성

**구조**:

```
src/common/
└── constants/
    ├── env-keys.ts         # 환경변수 키 상수
    ├── error-messages.ts   # 에러 메시지 상수
    └── index.ts
```

**확장 계획**: 나중에 필요시 dto, decorators, filters, guards, interceptors, pipes, interfaces 등 추가

### bcrypt 설명

- **목적**: 비밀번호 암호화 (단방향 해시)
- **salt rounds: 10**: 해시 강도 (높을수록 안전하지만 느림)
- **hash()**: 평문 → 해시
- **compare()**: 평문과 해시 비교

### ConfigService 설명

- **목적**: 환경변수 타입 안전하게 관리
- **장점**: 테스트 용이, 오타 방지, 환경별 설정
- **사용법**:

  ```typescript
  // ❌ process.env 직접
  const secret = process.env.JWT_SECRET; // string | undefined

  // ✅ ConfigService 사용
  const secret = this.configService.get<string>(ENV_KEYS.JWT_SECRET); // string
  ```

### Enum(TokenType) 설명

- **목적**: 토큰 타입 명시적 관리
- **장점**: Guard에서 토큰 종류 구분 가능, 확장성
- **사용법**:

  ```typescript
  enum TokenType {
    ACCESS = 'access',
    REFRESH = 'refresh',
  }

  // payload에 타입 포함
  const payload = {
    sub: user.id,
    email: user.email,
    type: TokenType.ACCESS, // 명시적
  };
  ```
