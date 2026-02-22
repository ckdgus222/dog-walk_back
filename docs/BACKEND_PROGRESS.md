# Backend Progress

프로젝트: 강아지 산책 매칭 앱 (Dog Walk Mate / VillageMate)  
시작일: 2025-02-05  
최종 업데이트: 2026-02-20

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
- [ ] Step 6: API 수동 검증 + e2e 점검

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

---

## Next

- [ ] Postman/Thunder로 Auth + /me 성공/실패 케이스 확인
- [ ] `npm run test:e2e` 실행

