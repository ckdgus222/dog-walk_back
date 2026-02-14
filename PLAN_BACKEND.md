# Dog Walk Mate (VillageMate) — 백엔드 구현 계획서

작성일: 2026-02-12  
대상: NestJS(v11) + Prisma + PostgreSQL 기반 API 서버

> 이 계획서는 현재 백엔드 상태(Prisma User 모델 + AuthService 일부 구현, 컨트롤러/가드/전략 미구현)를 기준으로,
> 프론트의 mock 데이터를 실제 API로 치환할 수 있도록 **도메인별로 세로로 관통하는(vertical slice) 방식**의 실행 계획입니다.

---

## 문서 운영 (MD 2개로 관리)

- **전체(메인/정본)**: `PLAN_BACKEND.md`
- **진행(작업 로그)**: `.opencode/plans/BACKEND_PROGRESS.md`

원칙:
- 기능/설계/우선순위/계약 변경은 이 문서(PLAN)에 반영
- 작업 단위 완료 체크/메모/트러블슈팅은 진행 문서(PROGRESS)에만 기록

---

## 빠른 시작 (로컬)

### 1) 의존성 설치

```bash
npm install
```

### 2) DB(Postgres) 실행

```bash
docker compose up -d
```

### 3) 환경변수(.env)

`.env`는 gitignore 대상입니다. 최소 아래 키가 필요합니다.

```env
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB?schema=public"
JWT_SECRET="..."
ACCESS_EXPIRES="3h"
REFRESH_EXPIRES="7d"
HASH_ROUNDS="10"
PORT="3001"
```

### 4) Prisma 마이그레이션

```bash
npx prisma migrate dev
```

### 5) 서버 실행

```bash
npm run start:dev
```

---

## 0. 현재 상태 요약 (기준선)

- 스택: NestJS, Prisma, PostgreSQL(docker-compose), JWT/Passport, bcrypt
- DB 스키마: `User` 모델 1개(이메일/패스워드해시/닉네임/프로필 optional)
- 구현됨: `AuthService.signup/login` + 토큰 발급(Access/Refresh 분리)
- 미구현:
  - `AuthController` (라우팅 없음 → 외부에서 호출 불가)
  - `jwt-auth.guard.ts`, `jwt.strategy.ts` (파일 비어 있음)
  - refresh 저장/회전/폐기(logout)
- 테스트: Jest가 `src/...` 절대 import 해석 못해 실패(설정 문제)

---

## 1. 목표 / 비목표

### 목표
1. **Auth를 실제 API로 완성**하고, 프론트가 `/me`로 세션을 부트스트랩 할 수 있게 만든다.
2. `Dog / Location(Map) / Match / Chat / Feed / Safety` 순으로 MVP 도메인을 확장한다.
3. API는 **일관된 응답/에러 포맷**과 **검증(ValidationPipe)** 을 갖춘다.
4. 채팅은 **REST 기반 저장/조회**를 먼저 완성하고, 마지막에 **WS(Socket.IO)** 를 추가한다.

### 비목표(현재 단계에서 보류)
- 결제/정산/리뷰/운영자(Admin) 패널
- 고급 추천(ML, 복잡한 랭킹) — 1차 MVP 이후

---

## 2. 공통 합의(프론트와 계약 확정 필요)

### 2.1 Auth 계약(권장 기본값)
- Signup 2-step
  - `POST /auth/signup` : 유저 생성 + 토큰 발급
  - `POST /dogs` : 강아지 등록(온보딩에서 필수)
- Refresh
  - `POST /auth/refresh`
  - 요청: `X-Refresh-Token` 헤더
  - 응답: `{ accessToken, refreshToken }`

### 2.2 에러 응답 표준(강추)
- 성공: `{ data: T }`
- 실패: `{ error: { code, message, details? } }`

> 프론트에서 `code` 기반으로 UX 분기가 가능해집니다.

---

## 3. 공통 인프라/기반 작업

### 3.1 Nest 공통 설정
- `ValidationPipe` 전역 적용(whitelist/transform)
- `HttpExceptionFilter` 커스텀으로 에러 응답 통일
- `ConfigModule`에서 env 스키마 검증(권장: zod/joi)

### 3.2 Swagger(OpenAPI)
- `/docs`에 Swagger 활성화
- DTO/Response를 꾸준히 주석/데코레이터로 관리
- (추후) 프론트 타입 자동 생성 기반

### 3.3 테스트/품질
- Jest `moduleNameMapper`로 `src/*` 절대경로 import 해결
- 최소 스모크 테스트:
  - auth signup/login/refresh
  - /me 인증 접근

---

## 4. 도메인 모델 설계(초안)

> MVP 우선순위 기준으로, “나중에 확장해도 안 깨지게” 최소 컬럼부터 제안합니다.

### 4.1 Auth
- `RefreshToken`
  - `id`, `userId`, `tokenHash`, `revokedAt`, `expiresAt`, `createdAt`
  - **원문 토큰은 저장하지 않고 hash만 저장**(권장)
  - refresh 호출 시 rotation(기존 revoke + 신규 발급)

### 4.2 Dog
- `Dog`
  - `id`, `ownerId(User)`, `name`, `breed?`, `birthYear?`, `size?`, `energyLevel?`, `photoUrl?`, `createdAt/updatedAt`

### 4.3 Location / Map
- MVP 단순안(유저당 최신 1개)
- `Location`
  - `userId (unique)`, `lat`, `lng`, `accuracy?`, `updatedAt`
  - 인덱스: `(updatedAt)`, `(lat,lng)`(단순)

> 주변 검색이 커지면 PostGIS로 이동 고려.

### 4.4 Match
- `Match`
  - `id`, `fromUserId`, `toUserId`, `status`, `message?`, `createdAt`, `expiresAt`
- 상태 머신
  - `REQUESTED → ACCEPTED/REJECTED/CANCELLED/EXPIRED`
- 동시성 방지: accept는 `WHERE status='REQUESTED'` 조건 업데이트 + 트랜잭션

### 4.5 Chat
- `ChatRoom` (matchId unique)
- `ChatMember` (roomId + userId unique)
- `ChatMessage`
  - `id`, `roomId`, `senderId`, `content`, `createdAt`
  - 커서 페이지네이션용 인덱스: `(roomId, createdAt)`

### 4.6 Feed
- `Post`, `Media`, `Comment`, `Like`
  - 커서 페이지네이션 기준: `createdAt` + `id` 복합
- 업로드는 1차 MVP에서는 로컬 저장(혹은 MinIO)로 시작 가능 → 나중에 S3로 전환

### 4.7 Safety
- `Block` (blockerId, blockedId, createdAt)
- `Report` (reporterId, targetUserId?, targetPostId?, reason, createdAt)

---

## 5. 실행 계획 (Vertical Slice 순서)

### Phase 0 — 기반 정리(필수)
**Todo**
- Jest path alias 해결(`src/*` import)
- 전역 ValidationPipe + 에러 포맷 통일(Filter)
- Swagger 기동

**Acceptance**
- `npm run test` 최소 스모크 통과
- `/docs`에서 auth 스펙 확인 가능

---

### Phase 1 — Auth API 완성
**Todo**
- `AuthController`
  - `POST /auth/signup`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
- `JwtStrategy` + `JwtAuthGuard` 구현
- RefreshToken 저장/회전/폐기
  - refresh 성공 시 rotation
  - logout 시 해당 refresh revoke

**Acceptance**
- Postman으로 signup/login/refresh/logout 시나리오가 완결
- 보호 라우트(/me)에 access token으로 접근 가능

---

### Phase 2 — /me + Dog
**Todo**
- `MeController`
  - `GET /me`
  - `PATCH /me`
- `DogsController`
  - `POST /dogs`
  - `GET /dogs/my`
  - `PATCH /dogs/:id`
- signup 이후 “강아지 등록 필수” 흐름을 지원(프론트 온보딩)

**Acceptance**
- 프론트가 `GET /me`로 세션 부트스트랩 가능
- 강아지 프로필 생성/조회/수정 가능

---

### Phase 3 — Location/Map
**Todo**
- `POST /location` : 내 위치 업데이트(upsert)
- `GET /map/nearby?lat&lng&radiusM=...`
  - 서버에서 “최근 15분” 조건 필터 적용
  - 차단 관계(있다면) 필터 적용
- 거리 계산
  - 데이터 적으면 Haversine 계산으로 충분
  - 이후 필요 시 PostGIS로 전환

**Acceptance**
- 주변 유저 목록을 거리순으로 반환
- “최근 15분” 필터가 서버에서 강제됨

---

### Phase 4 — Match → accept 시 ChatRoom 생성
**Todo**
- `POST /matches/request`
- `GET /matches/inbox`
- `POST /matches/:id/accept|reject|cancel`
- accept 시 트랜잭션으로:
  - match 상태 변경
  - chatRoom 생성(matchId unique)
  - chatMember 2명 생성
  - roomId 반환
- 만료 처리
  - MVP: 조회 시 expiresAt 지났으면 EXPIRED로 간주(또는 lazy update)
  - 추후: cron/bullmq로 만료 처리

**Acceptance**
- 요청/수락/거절/취소가 API로 완결
- 수락 시 roomId가 생성되어 프론트가 채팅으로 진입 가능

---

### Phase 5 — Chat (REST) + WS(선택)
**REST Todo**
- `GET /chats`
- `GET /chats/:roomId/messages?cursor&limit`
- `POST /chats/:roomId/messages`

**WS Todo(후순위)**
- Socket.IO Gateway
- 연결 시 JWT 인증
- join room / send message / broadcast
- reconnect 처리(최소: 재조회)

**Acceptance**
- REST만으로도 채팅이 “저장/조회/전송” 가능
- WS 도입 시 실시간 송수신 확인

---

### Phase 6 — Feed/Media
**Todo**
- `GET /posts?cursor`
- `POST /posts`
- `POST /media/upload`
- `POST /posts/:id/like` 토글
- `POST /posts/:id/comments`

**Acceptance**
- 글/미디어 업로드/댓글/좋아요가 동작
- 커서 페이지네이션이 안정적

---

### Phase 7 — Safety(차단/신고) 전파
**Todo**
- `POST /blocks`, `DELETE /blocks/:id`(또는 blockedId 기반)
- `POST /reports`
- 필터 적용 범위:
  - map/nearby 결과에서 숨김
  - match inbox/request 대상 제외
  - chat 목록/메시지 접근 제한(정책 결정)
  - feed 목록에서 숨김

**Acceptance**
- 차단 후 프론트 전 영역에서 상대 노출 제거가 일관됨

---

## 6. 운영/보안 체크리스트(MVP 최소)

- 비밀번호: bcrypt salt rounds 고정
- 토큰: access 짧게, refresh 길게 + rotation
- refresh token 저장: hash만 저장
- Rate limiting(권장): auth endpoints에 적용
- CORS: 프론트 도메인만 허용
- 로깅: 요청 id / 주요 에러 로그

---

## 부록) 산출물(권장 모듈 구조)

- `src/common/*` : filters, pipes, decorators, guards
- `src/auth/*`
- `src/me/*`
- `src/dogs/*`
- `src/location/*`, `src/map/*`
- `src/matches/*`
- `src/chats/*` (+ `gateway` for ws)
- `src/posts/*`
- `src/safety/*` (blocks/reports)
