# Docs Index

작성일: 2026-02-20

이 레포는 **Dog Walk Mate (VillageMate) 백엔드**(NestJS v11 + Prisma + PostgreSQL) 입니다.

## 문서 맵

- `PLAN_BACKEND.md`  
  백엔드 계획서(정본): 목표/우선순위/도메인 설계 초안

- `.opencode/plans/BACKEND_PROGRESS.md`  
  진행 로그(체크리스트/작업 기록): “현재 어디까지 했는지”만 관리

- `docs/API_RESPONSE_FORMAT.md`  
  전역 규칙(단일 출처): 성공/에러 Wire Format + CORS 규칙

- `docs/AUTH_API.md`  
  Auth 엔드포인트 계약(전역 포맷은 `docs/API_RESPONSE_FORMAT.md` 링크로만 참조)

- `docs/ME_API.md`  
  `/me` 엔드포인트 계약(내 프로필 조회/수정)

- `docs/MEDIA_API.md`  
  공용 파일 업로드 계약(강아지 대표사진/피드 미디어)

- `docs/DOGS_API.md`  
  Dogs 엔드포인트 계약(추가/내 목록/수정)

- `docs/DOGS_API_PLAN.md`  
  Dogs 도메인 기획서(왜 필요한지/기능/진행 기준)

- `docs/PROJECT_STRUCTURE.md`  
  프로젝트 구조/아키텍처/환경변수(온보딩/참고용)

- `AGENTS.md`  
  AI 에이전트 작업 규칙(응답 포맷, 문서/테스트 업데이트 원칙 포함)

## 프론트 문서(참조)

- 문서 인덱스: `../../dog-walk_front/docs/README.md`
- 화면 기준 API 바인딩 체크리스트: `../../dog-walk_front/docs/API_CHECKLIST_FRONTEND.md`
- 프론트 로드맵: `../../dog-walk_front/docs/PLAN_FRONTEND.md`
- 프론트 작업 상태: `../../dog-walk_front/docs/TASK_BOARD.md`
- 프론트 검수 체크리스트: `../../dog-walk_front/docs/REVIEW_CHECKLIST_FRONTEND.md`
- 프론트 구조/아키텍처: `../../dog-walk_front/docs/PROJECT_STRUCTURE.md`

## 단일 책임 규칙

1. 전역 규칙(응답/에러/CORS)은 `docs/API_RESPONSE_FORMAT.md`에서만 관리합니다.
2. 엔드포인트 계약은 각 API 문서에서만 관리합니다. (중복 내용은 링크로 대체)
3. 계획/우선순위는 `PLAN_BACKEND.md`, 진행 상태는 `.opencode/plans/BACKEND_PROGRESS.md`에서만 관리합니다.
4. 구조/온보딩은 `docs/PROJECT_STRUCTURE.md`에만 씁니다. (Quick Start는 README에만 유지)

## AI 작업 지시 시 기본 입력

기능 추가/수정 작업을 AI에게 맡길 때, 아래를 함께 전달합니다.

1. `AGENTS.md`
2. `PLAN_BACKEND.md`
3. `docs/API_RESPONSE_FORMAT.md`
4. (해당 작업 범위) `docs/AUTH_API.md` 또는 `docs/ME_API.md` 등 관련 계약 문서

진행/우선순위 맥락이 필요하면 아래를 추가로 전달합니다.

5. `.opencode/plans/BACKEND_PROGRESS.md`

프론트 연동(화면 바인딩/필드 최소화) 맥락이 필요하면 아래 문서를 추가로 전달합니다.

- `../../dog-walk_front/docs/API_CHECKLIST_FRONTEND.md`
- `../../dog-walk_front/docs/PLAN_FRONTEND.md`
- `../../dog-walk_front/docs/TASK_BOARD.md`
- (검수/리뷰) `../../dog-walk_front/docs/REVIEW_CHECKLIST_FRONTEND.md`

버그/에러 해결을 요청할 때는 아래를 추가로 전달하면 속도가 크게 올라갑니다.

- 기대 동작 vs 실제 동작
- 재현 단계(최소)
- 에러/로그 전문
- 관련 코드 경로(컨트롤러/서비스/DTO/Prisma)
- 환경(로컬/도커/DB, 실행 커맨드, 사용한 `.env` **키 목록**)

## Quick Start (Local)

```bash
npm install
docker compose up -d
npx prisma migrate dev
npm run start:dev
```

`.env`는 gitignore 대상입니다. 최소 아래 키가 필요합니다(값은 로컬에서만).

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
FRONTEND_ORIGIN="http://localhost:3000"
```
