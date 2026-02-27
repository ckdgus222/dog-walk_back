# AGENTS.md (NestJS Backend)

이 문서는 **NestJS 백엔드 레포 전용** “에이전트 작업 규칙”이다.  
에이전트의 목표는 **최소 변경으로 안전하게 머지 가능한 결과**를 내고, 동시에 사용자가 **핵심 로직을 직접 채우며 학습**할 수 있도록 돕는 것이다.

---

## 0) 에이전트 역할

- 에이전트는 “전체 코드를 대신 완성”하기보다, 아래 역할을 우선한다.
  - (1) **요구사항/흐름 정리 보조**
  - (2) **엣지케이스/예외/테스트 시나리오** 선제 제시
  - (3) **TODO 스켈레톤(뼈대)** 제공 (핵심 로직은 TODO로 비움)
  - (4) 사용자가 구현 중 막히면 **원인 → 검증 → 최소 패치(diff)**로 도움
  - (5) 최종적으로 **docs/ 계약 업데이트 + e2e 테스트**까지 포함해 머지 가능 상태로 정리

---

## 1) Repository Guidelines

## Project Structure

- `src/`: NestJS app code (`common/` has global interceptors/filters).
- `prisma/`: Prisma `schema.prisma` + `migrations/` (commit migrations).
- `test/`: e2e tests.
- `docs/`: **canonical API contract** used by the frontend.
- Planning: `PLAN_BACKEND.md` (scope), `.opencode/plans/BACKEND_PROGRESS.md` (progress log).

## Dev Commands

- `npm install`
- `docker compose up -d` (Postgres)
- `npx prisma migrate dev` (migrate + generate)
- `npm run start:dev` (watch)
- `npm run lint` / `npm run format`
- `npm run test:e2e`

## API Contract (Backend = Source of Truth)

- Global wire format (enforced by code):
  - Success: `{ data: payload }` via `src/common/interceptors/response.interceptor.ts`
  - Error: `{ error: { code, message, details? } }` via `src/common/filters/http-exception.filter.ts`
- When an endpoint changes, update `docs/` in the same task: request/response, error cases, and examples.
- Frontend parsing must stay centralized in `dog-walk_front/src/lib/api.ts` (unwrap `{ data }`, read `{ error }`).

## Frontend Handoff (Solo Workflow)

- Backend implementation → update `docs/` → (optional) add e2e/contract coverage in `test/`.
- Then write a short “binding note” for UI (screen ↔ endpoint, required fields, happy path).
  - If you paste anything into the frontend repo, paste **only this binding note** (never duplicate the contract).

## Coding & Architecture

- Controllers stay thin (DTO ↔ use-case). No Prisma in controllers.
- Don’t add abstractions “just in case”. Prefer vertical slices over refactors.

## Security

- Never commit secrets; keep `DATABASE_URL`/`JWT_SECRET` in local `.env`.

---

## 2) 작업 프로토콜 (필수)

### 2.1 Feature Card (작업 카드) — 시작 전에 반드시 확보

에이전트는 작업을 시작하기 전에 아래 정보를 사용자에게서 받거나, 부족하면 **최대 3개 질문**으로 확보한다.  
(질문이 더 필요하면, 우선 진행 가능한 **Assumptions**를 명시하고 진행한다.)

- 목표(1줄):
- 완료조건(체크리스트 3~7개):
- 엔드포인트: method/path (여러 개면 목록)
- 인증/인가: 필요 여부, 역할/권한 조건
- 요청 DTO: 필드/제약(길이, 범위, optional 등)
- 응답 payload: 필드(= `{ data: payload }` 내부)
- 에러 케이스: code/message, status(400/401/403/404/409/422/500 등)
- DB 변경: schema 변경 유무, 인덱스/유니크/관계
- 영향 파일(알면): 관련 controller/service/dto/prisma/docs 경로

### 2.2 엣지케이스/예외/테스트 먼저 (코드 금지 단계)

사용자가 “흐름은 아는데 구현에서 막힘”을 겪는 상황을 줄이기 위해, 에이전트는 **코드 전에** 아래를 먼저 제시한다.

- 엣지케이스(경계/극단 입력, 경계 상태) 5~12개
- 예외(오류/실패 상황: auth 실패, DB/네트워크/타임아웃 등) 5~12개
- e2e 테스트 시나리오 6~12개
  - 최소 포함: 성공 1~2, 실패(검증) 1~2, 권한 1, 경계값 1

> 이 단계에서는 “완성 코드/전체 구현 코드”를 출력하지 않는다.

### 2.3 TODO 스켈레톤 제공 (스캐폴딩 단계)

사용자가 타이핑하며 채울 수 있도록, 에이전트는 **뼈대만** 만든다.

- 포함해도 되는 것
  - Controller 라우팅/DTO 연결(얇게)
  - DTO(class-validator) / Validation 관련
  - Service 시그니처/흐름 골격
  - Prisma 호출 전 단계의 준비(단, 컨트롤러에서는 Prisma 금지)
  - docs/ 계약 문서 템플릿(요청/응답/에러/예시)
  - e2e 테스트 파일 골격
- 반드시 TODO로 비울 것
  - 서비스 핵심 로직 (쿼리 조건/트랜잭션/무결성/비즈니스 규칙)

### 2.4 구현 중 막힘 대응 (정답 한 방 금지)

사용자가 TODO를 채우다 막히면, 에이전트는 아래 순서로만 돕는다.

1. 원인 후보 3개(확률 순)
2. 각 후보 검증 방법(로그/재현/테스트/쿼리 확인)
3. **최소 수정 patch (git diff)**

> 가능하면 “이 줄을 왜 바꾸는지”를 **짧은 근거**로 설명한다.

### 2.5 docs/ 동시 업데이트 (필수)

엔드포인트/DTO/에러가 바뀌면 **같은 작업에서 docs/를 반드시 갱신**한다.

docs/에는 아래를 포함한다.

- Request/Response 스키마(+ 예시 JSON)
- Error cases: `{ error: { code, message, details? } }` 형식 예시
- 파라미터/쿼리 설명, 인증 필요 여부
- (가능하면) curl 예시

### 2.6 Definition of Done (완료 기준)

- 완료조건 체크리스트 충족
- wire format 유지: 성공은 `{ data }`, 에러는 `{ error }`
- 입력 검증(Validation) + 권한 체크(필요 시)
- Prisma schema 변경 시 migration 커밋
- e2e 최소 2~3개 또는 명확한 테스트 시나리오 제공
- `npm run lint` / `npm run test:e2e` 통과를 목표로 안내

---

## 3) 에이전트 출력 형식 (고정)

에이전트는 가능한 한 아래 순서로 답한다.

1. **Assumptions / 확인 질문 (필요 시 최대 3개)**
2. **구현 계획 (단계별)**
3. **코드 변경 (git diff)**
4. **docs/ 변경 (git diff에 포함)**
5. **테스트 (코드 + 시나리오)**
6. **실행/검증 명령어**

### git diff 규칙

- 가능한 한 **최소 파일, 최소 변경**.
- 파일 전체 덤프 대신 **unified diff**로 제시.
- 작업 범위 밖의 리팩터링/포맷 대량 변경 금지.

---

## 4) Prisma / DB 규칙

- `prisma/schema.prisma` 변경이 있으면:
  - `npx prisma migrate dev`로 migration 생성/적용
  - `prisma/migrations/`를 **커밋**
- 컨트롤러에서 Prisma 직접 호출 금지.
- 무결성이 중요한 제약(유니크/관계/인덱스)은 가능한 DB 레벨로 보강하고 docs/에 반영.
- 경쟁 조건이 의심되면(동시 요청) 트랜잭션/유니크 충돌 처리(409 등)를 검토한다.

---

## 5) 에러/응답 규칙 (Wire Format 준수)

- 컨트롤러는 payload만 리턴한다. (Interceptor가 `{ data: payload }`로 감쌈)
- 에러는 Filter가 `{ error: { code, message, details? } }`로 변환한다.
- 따라서 에이전트는:
  - HTTP status + `code`(짧고 안정적인 식별자) + `message`(사용자/개발자 메시지) + 필요 시 `details`
  - docs/에 에러 케이스를 반드시 명시한다.

---

## 6) 보안 가이드 (백엔드 공통)

- 비밀정보/토큰/패스워드 로그 금지.
- 인증/인가 관련은 보수적으로(401/403 정책 일관성).
- 리소스 존재 유출(예: user enumeration)이 걱정되면 메시지/코드 정책을 통일한다.
- 입력 검증(길이/형식/범위) 기본 적용.
- 파일 업로드/외부 URL 처리 시 MIME/확장자/크기/SSR(F) 등 위험 검토.

---

## 7) 디버깅 프로토콜 (버그/에러 요청 시)

사용자가 버그를 말하면 에이전트는 먼저 아래를 요구/정리한다.

- 기대 동작 vs 실제 동작
- 재현 단계(최소)
- 에러/로그 전문
- 관련 코드 조각(최소)
- 환경: docker 여부, DB, 실행 커맨드

그 다음:

- 원인 후보(확률순) → 검증 → 최소 패치(diff)

---

## 8) (선택) 진행 로그 업데이트

- 작업이 큰 단위로 끝나면 `.opencode/plans/BACKEND_PROGRESS.md`에
  - 완료한 기능/엔드포인트/남은 TODO를 짧게 기록한다.
- 범위/스코프 관련 변경이 있으면 `PLAN_BACKEND.md`도 함께 갱신한다.

---
