# Dog Walk Backend — 프로젝트 전체 구조

> 최종 업데이트: 2026-02-25  
> 스택: **NestJS v11 + Prisma + PostgreSQL + JWT/Passport + bcrypt**

---

## 1. 디렉토리 트리

```
dog-walk_back/
├── README.md                      # 문서 인덱스 + Quick Start
├── .env                          # 환경변수 (gitignore)
├── .opencode/
│   └── plans/
│       └── BACKEND_PROGRESS.md   # 작업 진행 로그
├── docs/
│   ├── API_RESPONSE_FORMAT.md    # 전역 규칙 (응답/에러 + CORS)
│   ├── AUTH_API.md               # Auth API 계약 문서
│   ├── ME_API.md                 # /me API 계약 문서
│   └── PROJECT_STRUCTURE.md      # 이 파일
├── prisma/
│   ├── schema.prisma             # DB 스키마 (User, RefreshToken, Dog)
│   └── migrations/
│       ├── 20260209115639_init/                    # User 테이블 생성
│       ├── 20260214221000_add_refresh_token/       # RefreshToken 테이블 추가
│       └── 20260225150931_add_dog_model_for_signup/ # Dog 테이블 + DogGender enum 추가
├── src/
│   ├── main.ts                   # 앱 부트스트랩 (CORS, ValidationPipe, 전역 Filter/Interceptor)
│   ├── app.module.ts             # 루트 모듈 (ConfigModule, PrismaModule, AuthModule, MeModule)
│   ├── app.controller.ts         # 루트 컨트롤러 (빈 상태)
│   ├── app.service.ts            # 루트 서비스 (getHello)
│   │
│   ├── prisma/                   # --- Prisma 모듈 ---
│   │   ├── prisma.module.ts      # @Global 모듈, PrismaService export
│   │   └── prisma.service.ts     # PrismaClient 확장 (connect/disconnect 라이프사이클)
│   │
│   ├── common/                   # --- 공통 모듈 ---
│   │   ├── constants/
│   │   │   ├── index.ts          # barrel export
│   │   │   ├── env-keys.ts       # 환경변수 키 상수 (DATABASE_URL, JWT_SECRET, ...)
│   │   │   └── error-messages.ts # 에러 메시지 상수 (AUTH, USER, INTERNAL)
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # 전역 에러 포맷 변환 (정본: docs/API_RESPONSE_FORMAT.md)
│   │   └── interceptors/
│   │       └── response.interceptor.ts   # 전역 성공 래핑 (정본: docs/API_RESPONSE_FORMAT.md)
│   │
│   ├── auth/                     # --- Auth 모듈 ---
│   │   ├── auth.module.ts        # PassportModule, JwtModule, AuthService, JwtStrategy
│   │   ├── auth.controller.ts    # signup, login, refresh, logout, me(GET /auth/me)
│   │   ├── auth.service.ts       # 핵심 로직 (토큰 발급/검증/회전/폐기, bcrypt)
│   │   ├── dto/
│   │   │   ├── signup.dto.ts     # email, password(min6), nickname(min2), dog{name,breed,birthYear,gender,personality[],photoFileId?}
│   │   │   ├── login.dto.ts      # email, password
│   │   │   └── auth-response.dto.ts  # accessToken, refreshToken, user{id,email,nickname}
│   │   ├── guard/
│   │   │   └── jwt-auth.guard.ts # AuthGuard('jwt') 래퍼
│   │   └── strategies/
│   │       └── jwt.strategy.ts   # Bearer 토큰 검증, type='access'만 허용
│   │
│   ├── me/                       # --- Me 모듈 (내 정보) ---
│       ├── me.module.ts          # PrismaModule import
│       ├── me.controller.ts      # GET /me, PATCH /me (JwtAuthGuard 적용)
│       ├── me.service.ts         # getMe, updateMe (Prisma select로 안전 필드만 반환)
│       └── dto/
│           └── update-me.dto.ts  # nickname?(2~30), profileImage?(~500), bio?(~1000)
│   │
│   └── media/                    # --- Media 모듈 (공용 파일 업로드) ---
│       ├── media.module.ts
│       ├── media.controller.ts   # POST /media/upload
│       ├── media.service.ts      # 파일 검증/저장 + Media 메타데이터 저장
│       └── dto/
│           └── upload-media.dto.ts
│
├── test/
│   ├── jest-e2e.json             # e2e 테스트 설정
│   └── app.e2e-spec.ts           # Auth + Me 플로우 e2e 테스트
│
├── AGENTS.md                     # 에이전트 작업 규칙
├── PLAN_BACKEND.md               # 백엔드 구현 계획서 (Phase 0~7)
├── docker-compose.yml            # PostgreSQL 16 (dog-walk-postgres)
├── package.json                  # 의존성 + 스크립트
├── tsconfig.json                 # TypeScript 설정 (ES2023, strictNullChecks)
├── eslint.config.mjs             # ESLint 설정
├── nest-cli.json                 # Nest CLI 설정
└── prisma.config.ts              # Prisma config
```

---

## 2. 모듈 의존 관계

```
AppModule
├── ConfigModule.forRoot({ isGlobal: true })
├── PrismaModule          ← @Global, 모든 모듈에서 PrismaService 사용 가능
├── AuthModule
│   ├── PrismaModule
│   ├── ConfigModule
│   ├── PassportModule (defaultStrategy: 'jwt')
│   ├── JwtModule.registerAsync (secret from ConfigService)
│   ├── AuthController
│   └── AuthService, JwtStrategy
├── MeModule
│   ├── PrismaModule
│   ├── MeController
│   └── MeService
└── MediaModule
    ├── PrismaModule
    ├── MediaController
    └── MediaService
```

---

## 3. DB 스키마 (Prisma)

### User

| 컬럼         | 타입     | 제약              |
|--------------|----------|-------------------|
| id           | String   | PK, UUID 자동생성 |
| email        | String   | UNIQUE            |
| passwordHash | String   |                   |
| nickname     | String   |                   |
| profileImage | String?  | nullable          |
| bio          | String?  | nullable          |
| createdAt    | DateTime | default(now())    |
| updatedAt    | DateTime | @updatedAt        |

### RefreshToken

| 컬럼      | 타입      | 제약                              |
|-----------|-----------|-----------------------------------|
| id        | String    | PK, UUID 자동생성                 |
| userId    | String    | FK → User.id (CASCADE)           |
| tokenHash | String    | SHA-256 해시 (원문 미저장)        |
| expiresAt | DateTime  |                                   |
| revokedAt | DateTime? | nullable (revoke 시 설정)         |
| createdAt | DateTime  | default(now())                    |

**인덱스**: `userId`, `expiresAt`, `revokedAt`

### Dog

| 컬럼        | 타입      | 제약                              |
|-------------|-----------|-----------------------------------|
| id          | String    | PK, UUID 자동생성                 |
| ownerId     | String    | FK → User.id (CASCADE)           |
| name        | String    |                                   |
| breed       | String    |                                   |
| birthYear   | String?   | nullable (`""`은 null 권장)       |
| gender      | DogGender | Prisma enum (`male` \| `female`) |
| personality | String[]  |                                   |
| photoFileId | String?   | nullable, UNIQUE, FK → Media.id  |
| createdAt   | DateTime  | default(now())                    |
| updatedAt   | DateTime  | @updatedAt                        |

**인덱스**: `ownerId`

### Media

| 컬럼          | 타입        | 제약                                  |
|---------------|-------------|---------------------------------------|
| id            | String      | PK, UUID 자동생성                     |
| purpose       | MediaPurpose| enum (`DOG_PROFILE` \| `FEED_POST`)   |
| storageKey    | String      | UNIQUE                                |
| url           | String      | 업로드 파일 접근 URL                  |
| mimeType      | String      |                                       |
| size          | Int         | bytes                                 |
| uploaderUserId| String?     | FK → User.id (SET NULL)               |
| createdAt     | DateTime    | default(now())                        |

**인덱스**: `purpose`, `uploaderUserId`

---

## 4. API 엔드포인트 목록

### Auth (`/auth`)

| Method | Path            | 인증 | 설명                            |
|--------|-----------------|------|---------------------------------|
| POST   | /auth/signup    | ✗    | 회원가입(user+dog) + 토큰 발급  |
| POST   | /auth/login     | ✗    | 로그인 + 토큰 발급              |
| POST   | /auth/refresh   | ✗    | Refresh Token 회전 (X-Refresh-Token 헤더) |
| POST   | /auth/logout    | ✗    | Refresh Token 폐기              |
| GET    | /auth/me        | JWT  | JWT 페이로드 기반 유저 정보     |

### Me (`/me`)

| Method | Path   | 인증 | 설명                                  |
|--------|--------|------|---------------------------------------|
| GET    | /me    | JWT  | 내 프로필 조회 (DB 기반, 안전 필드)   |
| PATCH  | /me    | JWT  | 내 프로필 수정 (nickname, profileImage, bio) |

### Media (`/media`)

| Method | Path          | 인증 | 설명                          |
|--------|---------------|------|-------------------------------|
| POST   | /media/upload | ✗    | 이미지 업로드 + fileId 발급   |

---

## 5. 전역 응답/에러 포맷 (Wire Format)

전역 규칙(성공/에러 Wire Format + CORS)은 아래 문서를 **단일 출처**로 관리합니다.

- `docs/API_RESPONSE_FORMAT.md`

관련 코드:
- `src/common/interceptors/response.interceptor.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/main.ts` (CORS)

---

## 6. 인증/보안 구조

```
[Client]
   │
   │  Authorization: Bearer <accessToken>
   ▼
JwtAuthGuard → JwtStrategy.validate()
   │  - Bearer에서 토큰 추출
   │  - JWT 서명 검증
   │  - payload.type === 'access' 확인
   │  - request.user = { id, email, type }
   ▼
[Controller] → [Service]
```

- **Access Token**: 짧은 수명 (기본 3h), API 요청 인증용
- **Refresh Token**: 긴 수명 (기본 7d), Access Token 재발급용
  - DB에 SHA-256 해시로 저장 (원문 미저장)
  - 사용 시 rotation (기존 revoke + 새 토큰 발급)
- **비밀번호**: bcrypt 해시 저장 (기본 10 rounds)

---

## 7. 전역 설정 (main.ts)

| 설정                | 내용                                              |
|---------------------|---------------------------------------------------|
| CORS                | 정본: `docs/API_RESPONSE_FORMAT.md` (`FRONTEND_ORIGIN`) |
| ValidationPipe      | `whitelist: true`, `transform: true`              |
| ResponseInterceptor | 성공 응답 래핑 (정본: `docs/API_RESPONSE_FORMAT.md`) |
| HttpExceptionFilter | 에러 응답 변환 (정본: `docs/API_RESPONSE_FORMAT.md`) |
| 포트                | `PORT` 환경변수 (기본 3000, 권장 3001)            |

---

## 8. 환경변수 (.env)

| 키                | 용도                     | 기본값            |
|-------------------|--------------------------|-------------------|
| DATABASE_URL      | PostgreSQL 연결 문자열   | 필수              |
| JWT_SECRET        | JWT 서명 시크릿          | 필수              |
| ACCESS_EXPIRES    | Access Token 만료        | 3h                |
| REFRESH_EXPIRES   | Refresh Token 만료       | 7d                |
| HASH_ROUNDS       | bcrypt salt rounds       | 10                |
| PORT              | 서버 포트                | 3000 (권장 3001)  |
| POSTGRES_USER     | Docker PG 유저           | dogwalk           |
| POSTGRES_PASSWORD | Docker PG 비밀번호       | dogwalk_pw        |
| POSTGRES_DB       | Docker PG DB명           | dogwalk           |
| FRONTEND_ORIGIN   | CORS 허용 프론트 주소    | http://localhost:3000 |

---

## 9. 주요 의존성

### Runtime

| 패키지              | 버전    | 용도                        |
|---------------------|---------|-----------------------------|
| @nestjs/common      | ^11.0.1 | NestJS 핵심                 |
| @nestjs/config      | ^4.0.2  | 환경변수 관리               |
| @nestjs/jwt         | ^11.0.2 | JWT 발급/검증               |
| @nestjs/passport    | ^11.0.5 | Passport 통합               |
| @prisma/client      | ^6.19.2 | Prisma ORM 클라이언트       |
| bcrypt              | ^6.0.0  | 비밀번호 해싱               |
| class-validator     | ^0.14.3 | DTO 유효성 검증             |
| class-transformer   | ^0.5.1  | DTO 변환                    |
| passport-jwt        | ^4.0.1  | JWT 전략                    |

### Dev

| 패키지              | 버전    | 용도                        |
|---------------------|---------|-----------------------------|
| prisma              | ^6.19.2 | Prisma CLI                  |
| jest                | ^29.7.0 | 테스트 프레임워크           |
| supertest           | ^7.0.0  | HTTP 테스트                 |
| typescript          | ^5.7.3  | TypeScript 컴파일러         |
| eslint              | ^9.18.0 | 코드 린트                   |
| prettier            | ^3.4.2  | 코드 포맷터                 |

---

## 10. 스크립트 (npm)

| 명령어              | 설명                        |
|---------------------|-----------------------------|
| `npm run start:dev` | 개발 서버 (watch 모드)      |
| `npm run build`     | 프로덕션 빌드               |
| `npm run start:prod`| 프로덕션 실행               |
| `npm run lint`      | ESLint 실행 + 자동 수정     |
| `npm run format`    | Prettier 실행               |
| `npm run test`      | 단위 테스트                 |
| `npm run test:e2e`  | e2e 테스트                  |

---

## 11. 인프라 (Docker)

- **PostgreSQL 16 Alpine** (`dog-walk-postgres`)
  - 포트: 5432
  - Volume: `dog_walk_pgdata`
  - Healthcheck: `pg_isready`

---

## 12. 테스트 현황

### e2e 테스트 (`test/app.e2e-spec.ts`)

- **Auth + Me 플로우**: signup → login → GET /me → refresh (rotation 검증) → logout → 재사용 차단 확인
- 환경: 실제 DB 사용 (beforeEach에서 데이터 초기화)

---

## 13. 현재 진행률 및 남은 작업

### 완료된 Phase

| Phase | 내용                  | 상태  |
|-------|-----------------------|-------|
| 0     | 기반 정리 (ValidationPipe, Filter, Interceptor) | ✅ |
| 1     | Auth API 완성 (signup/login/refresh/logout/guard) | ✅ (수동검증 미완) |
| 2-1   | /me (GET, PATCH)      | ✅ (수동검증 미완) |

### 미구현 Phase (PLAN_BACKEND.md 기준)

| Phase | 내용                  | 상태  |
|-------|-----------------------|-------|
| 2-2   | Dog 모듈              | ❌    |
| 3     | Location / Map        | ❌    |
| 4     | Match → ChatRoom 생성 | ❌    |
| 5     | Chat (REST + WS)      | ❌    |
| 6     | Feed / Media          | ❌    |
| 7     | Safety (차단/신고)    | ❌    |

---

## 14. 문서 목록

| 파일                                   | 설명                          |
|----------------------------------------|-------------------------------|
| `README.md`                            | 문서 인덱스 + Quick Start     |
| `PLAN_BACKEND.md`                      | 전체 구현 계획서 (Phase 0~7)  |
| `.opencode/plans/BACKEND_PROGRESS.md`  | 작업 진행 로그                |
| `docs/AUTH_API.md`                     | Auth API 계약 문서            |
| `docs/ME_API.md`                       | /me API 계약 문서             |
| `docs/API_RESPONSE_FORMAT.md`          | 전역 규칙 (응답/에러 + CORS)  |
| `docs/PROJECT_STRUCTURE.md`            | 프로젝트 전체 구조 (이 파일)  |
| `AGENTS.md`                            | 에이전트 작업 규칙            |
