# Dogs API 기획서 (Phase 2)

작성일: 2026-02-27  
범위: `POST /dogs`, `GET /dogs/my`, `PATCH /dogs/:id`

---

## 1) 목표

Auth signup(1-step) 이후에도 사용자가 강아지 프로필을 추가/조회/수정할 수 있도록 Dogs 도메인 API를 제공한다.

---

## 2) 왜 필요한가 (문제 정의)

- 가입 시 강아지 1마리만 생성되므로, 이후 프로필 관리 기능이 없으면 사용자 경험이 끊긴다.
- 프론트에서 “내 강아지 목록 화면”과 “강아지 프로필 편집 화면”을 실제 API로 바인딩하려면 Dogs 전용 CRUD 일부가 필요하다.
- 매칭/지도 등 이후 도메인에서 강아지 정보를 참조하므로, Dogs 데이터의 조회/수정 경로가 먼저 안정화되어야 한다.

---

## 3) API별 필요성 + 기능 설명

### A. `POST /dogs`

왜 필요한가:
- 가입 이후 추가 반려견 등록 기능을 지원하기 위해 필요.
- 다견 가구 사용자 시나리오를 처리하기 위한 최소 엔드포인트.

기능:
- 로그인한 사용자(`ownerId`) 기준으로 새 강아지를 1마리 생성한다.
- 입력 검증 후 DB에 저장하고 생성된 강아지 프로필을 반환한다.

프론트 사용 화면:
- “강아지 추가” 버튼 → 등록 폼 제출
- 온보딩 이후 프로필 관리 화면의 “새 강아지 등록”

---

### B. `GET /dogs/my`

왜 필요한가:
- 사용자의 강아지 리스트를 화면에 그리기 위한 기준 데이터가 필요.
- 앱 진입 시 로컬 상태 복원/리프레시를 서버 기준으로 맞추기 위해 필요.

기능:
- 로그인한 사용자 소유 강아지 목록을 최신순(예: `createdAt desc`)으로 조회한다.
- 목록 렌더링에 필요한 필드만 반환한다.

프론트 사용 화면:
- “내 강아지 목록” 화면
- 프로필 탭/설정 탭의 강아지 카드 리스트

---

### C. `PATCH /dogs/:id`

왜 필요한가:
- 강아지 정보(이름/성격/사진 등) 수정 요구가 상시 발생.
- 프론트 편집 화면의 저장 액션을 서버 상태와 동기화하기 위해 필요.

기능:
- 로그인한 사용자가 소유한 강아지에 한해 부분 업데이트를 수행한다.
- 타 사용자 강아지 ID 접근은 권한 오류로 차단한다.

프론트 사용 화면:
- “강아지 상세/편집” 화면의 저장 버튼
- 이미지 변경/텍스트 수정 후 즉시 반영

---

## 4) 권한/보안 원칙

- 모든 Dogs API는 `Authorization: Bearer <accessToken>` 필수.
- `PATCH /dogs/:id`는 소유자 검증 필수(`dog.ownerId === currentUserId`).
- 타 사용자 자원 접근 시 `403 FORBIDDEN` 또는 `404 NOT_FOUND` 정책 중 하나로 일관 처리(구현 시 확정).

---

## 5) 요청/응답 설계 초안

## 공통

- 성공: `{ data: payload }`
- 실패: `{ error: { code, message, details? } }`
- 전역 규칙: `docs/API_RESPONSE_FORMAT.md`

### `POST /dogs` 요청 초안

- `name`: string, required, non-empty
- `breed`: string, required, non-empty
- `birthYear`: string, optional (`""` 허용 여부는 signup 정책과 일치)
- `gender`: `"male" | "female"`, required
- `personality`: `string[]`, required (빈 배열 허용 여부 명시)
- `photoFileId`: UUID, optional (`POST /media/upload` 응답 `file.id`)

응답 payload 초안:
- `dog`: `{ id, ownerId, name, breed, birthYear, gender, personality, photoFileId, createdAt, updatedAt }`

### `GET /dogs/my` 응답 초안

응답 payload 초안:
- `dogs`: `Dog[]`

### `PATCH /dogs/:id` 요청 초안

- 위 필드 모두 optional(부분 업데이트)

응답 payload 초안:
- `dog`: 업데이트된 Dog

---

## 6) 에러 케이스 초안

- `400 BAD_REQUEST`: DTO 검증 실패(필수값 누락/형식 오류)
- `401 UNAUTHORIZED`: 토큰 누락/만료/유효하지 않음
- `403 FORBIDDEN`: 본인 소유 강아지가 아닌 경우(정책 선택 시)
- `404 NOT_FOUND`: 강아지 ID 미존재(또는 소유자 은닉 정책 적용 시)
- `500 INTERNAL_SERVER_ERROR`: 서버 내부 오류

---

## 7) 프론트 바인딩 Happy Path

1. 내 강아지 화면 진입 시 `GET /dogs/my`
2. “추가”에서 폼 제출 시 `POST /dogs`
3. 생성 성공 후 목록 재조회 또는 optimistic append
4. 편집 화면 저장 시 `PATCH /dogs/:id`
5. 성공 응답 `data.dog`로 상세/리스트 동기화

---

## 8) 구현 전 확인사항 (결정 필요)

1. `birthYear`를 string으로 유지할지, number로 전환할지
2. 타 사용자 강아지 접근 에러를 `403`로 할지 `404`로 은닉할지
3. `GET /dogs/my` 정렬 기준을 `createdAt desc`로 고정할지

---

## 9) 완료 조건 (Definition of Done)

- Dogs 3개 API 구현 완료 (`POST /dogs`, `GET /dogs/my`, `PATCH /dogs/:id`)
- 입력 검증 + 소유자 권한 검증 적용
- `docs/DOGS_API.md` 계약 문서 작성(요청/응답/에러/예시)
- e2e 최소 3개 이상(성공, 검증 실패, 권한 실패)
