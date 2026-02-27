# Me Module Frontend Binding Note

## 개요

이 문서는 프론트에서 Me 관련 화면을 API에 바인딩할 때 필요한 최소 연결 정보를 정리한 노트입니다.
상세 계약(요청/응답 전체 스키마, 예시, 에러 원문)은 아래 canonical 문서를 기준으로 확인합니다.

- `docs/ME_API.md`
- `docs/AUTH_API.md`
- `docs/API_RESPONSE_FORMAT.md`

전역 응답 포맷:
- 성공: `{ "data": ... }`
- 실패: `{ "error": { "code", "message", "details?" } }`

## 화면 ↔ 엔드포인트 매핑

- 앱 부팅/세션 유효성 확인: `GET /auth/me`
- 내 정보 화면 조회: `GET /me`
- 프로필 수정 저장: `PATCH /me`

`/auth/me` vs `/me`:
- `/auth/me`: JWT payload 기반 확인용(가벼운 세션 체크, 필드 최소)
- `/me`: DB 조회 기반 프로필 데이터(화면 렌더링/수정 결과 반영 기준)

## 요청 필드 (수정 가능 필드)

대상: `PATCH /me`
모든 필드는 optional이며, 보낸 필드만 수정됩니다.

- `nickname`: string, 2~30자
- `profileImage`: string, 최대 500자
- `bio`: string, 최대 1000자

## 응답에서 UI가 써야 할 필드

프로필 UI는 `GET /me`, `PATCH /me`의 `data.user`를 기준으로 사용:

- `id`
- `email`
- `nickname`
- `profileImage`
- `bio`
- `createdAt`
- `updatedAt`

`GET /auth/me`의 `data.user`는 세션 확인/초기 인증 상태 판단 용도로만 사용:

- `id`
- `email`
- `type`

## 에러 핸들링 규칙

- 성공/실패 판단은 HTTP status 우선.
- 실패 시 `error.code` 기준으로 분기, `error.message` 노출.
- `400 BAD_REQUEST`: 입력 검증 실패(필드 에러 표시)
- `401 UNAUTHORIZED`: 토큰 누락/만료/유효하지 않음(재인증 또는 토큰 재발급 플로우)
- `404 NOT_FOUND`: 사용자 없음(탈퇴/비정상 세션 처리)

## Happy Path

1. 로그인 후 access token 저장
2. 앱 시작 시 `GET /auth/me`로 세션 유효성 확인
3. 내 정보 화면 진입 시 `GET /me`로 프로필 렌더링
4. 수정 저장 시 변경 필드만 `PATCH /me`로 전송
5. 성공 응답의 `data.user`로 화면 상태 즉시 갱신

## 구현 체크리스트

- API 클라이언트에서 전역 포맷 `{data}` / `{error}` 일관 처리
- `Authorization: Bearer <accessToken>` 공통 적용
- `/auth/me` 결과를 `/me` 대체 데이터로 사용하지 않기
- 수정 요청은 변경 필드만 전송(부분 업데이트)
- `error.message`가 string 또는 string[]일 수 있음
- 401 처리(재시도/로그아웃/재로그인) UX 규칙 고정
