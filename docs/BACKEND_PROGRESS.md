# Backend Progress

프로젝트: 강아지 산책 매칭 앱 (Dog Walk Mate / VillageMate)  
시작일: 2025-02-05  
최종 업데이트: 2026-02-27

- 문서 인덱스/Quick Start: `README.md`
- 계획(정본): `PLAN_BACKEND.md`
- API 계약/전역 규칙: `docs/`

> 이 문서는 “진행 상태”만 기록합니다. 코드 스니펫/학습 노트/긴 설명은 남기지 않습니다.

---

## 전체 진행률

- [x] Step 1: 환경 설정
- [x] Step 2: Prisma 기반 구축
- [x] Step 3: Common 구성 (ValidationPipe/Filter/Interceptor)
- [x] Step 4: Auth 모듈 (signup/login/refresh/logout + guard/strategy)
- [x] Step 5: 마이그레이션 (User, RefreshToken)
- [x] Step 6: API 수동 검증 체크리스트(Auth + /me) + e2e 점검

---

## 최근 작업 로그

### 2026-02-14

- [x] AuthService 정리 + refresh token rotation/revoke
- [x] MeModule 추가 (`GET /me`, `PATCH /me`)
- [x] 전역 응답/에러 포맷 통일 (Filter/Interceptor)
- [x] CORS 설정 (`FRONTEND_ORIGIN`, `X-Refresh-Token` 허용)
- [x] 문서 추가: `docs/AUTH_API.md`, `docs/API_RESPONSE_FORMAT.md`

### 2026-02-20

- [x] 문서 정리: 중복 제거 + 역할 분리 (README Docs Index, /me 계약 문서 추가)

### 2026-02-27

- [x] Auth + /me 검증 체크리스트 완료
  - signup/login/refresh/logout + refresh rotation/reuse 방지
  - `GET /auth/me`, `GET/PATCH /me` 정상 동작
  - duplicate signup / wrong login / invalid PATCH / refresh 토큰 Bearer 사용 실패 케이스 확인
- [x] `npm run test:e2e` 통과 (5 passed)
- [x] Dogs 기획/계약 초안 문서 추가 (`docs/DOGS_API_PLAN.md`, `docs/DOGS_API.md`)
- [x] Dogs 모듈 스켈레톤 추가 (`POST /dogs`, `GET /dogs/my`, `PATCH /dogs/:id`, TODO 로직)
- [x] Dogs e2e 시나리오 뼈대 추가 (`test/dogs.e2e-spec.ts`)
- [x] Media 업로드 초안 구현 (`POST /media/upload`, `docs/MEDIA_API.md`)
- [x] signup dog 사진 연결 방식 전환 (`dog.photoUrl` -> `dog.photoFileId`)
- [x] DB 스키마 확장 초안 (`Media` 테이블 + `Dog.photoFileId` 1:1)
- [x] Prisma migration 적용 (`20260227213000_add_media_and_dog_photo_file`)
- [x] DogsService 구현 완료 (`POST /dogs`, `GET /dogs/my`, `PATCH /dogs/:id`)
  - `birthYear` 빈 문자열 `null` 정규화
  - `photoFileId` 목적/소유/중복 연결 검증
  - `PATCH /dogs/:id` 비소유 접근 은닉 정책 `404` 확정
- [x] Dogs e2e 구현 전환 (todo -> 실행 테스트)
  - `test/dogs.e2e-spec.ts` 7개 시나리오 통과
- [x] Dogs API 계약 문서 확정 (`docs/DOGS_API.md`)
- [x] DOG_PROFILE 업로드 임시저장/최종승격 반영
  - `/media/upload` → `uploads/tmp/media/...` 임시 저장
  - `signup`/`dogs` 연결 성공 시 `uploads/media/...`로 이동 + DB 경로 갱신
  - 관련 e2e 검증 추가 (업로드 경로 승격 확인)

---

## Next

- [x] Phase 2 착수: Dogs API (`POST /dogs`, `GET /dogs/my`, `PATCH /dogs/:id`)
- [ ] `/media/upload` 인증/임시파일 정책 확정 (signup 이전 업로드 정책)
