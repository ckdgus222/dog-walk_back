# Dogs API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (default: `3000`, 권장: `3001`)

## Global Conventions

- Success/Error wire format + CORS: `docs/API_RESPONSE_FORMAT.md`
- Auth: `Authorization: Bearer <accessToken>` (access token만 허용)

## Dog Object

```json
{
  "id": "<uuid>",
  "ownerId": "<user-id>",
  "name": "콩이",
  "breed": "푸들",
  "birthYear": null,
  "gender": "male",
  "personality": ["friendly", "active"],
  "photoFileId": "<media-file-id>",
  "createdAt": "2026-02-27T00:00:00.000Z",
  "updatedAt": "2026-02-27T00:00:00.000Z"
}
```

## Endpoints

### `POST /dogs`

Request (JSON):

```json
{
  "name": "콩이",
  "breed": "푸들",
  "birthYear": "",
  "gender": "male",
  "personality": ["friendly", "active"],
  "photoFileId": "<media-file-id>"
}
```

Validation:

- `name`: required string (non-empty)
- `breed`: required string (non-empty)
- `birthYear`: optional string (`""` 전달 시 `null` 저장)
- `gender`: `"male" | "female"`
- `personality`: `string[]`
- `photoFileId`: optional UUID (`POST /media/upload` 응답 `file.id`)

`photoFileId` rule:

- `Media.purpose === "DOG_PROFILE"` 이어야 함
- 다른 강아지에 이미 연결된 파일이면 실패
- `Media.uploaderUserId`가 `null` 또는 현재 사용자여야 함
- 성공 시 `Media.uploaderUserId`를 현재 사용자로 귀속 처리
- 임시 업로드 파일(`uploads/tmp/media/...`)이면 최종 경로(`uploads/media/...`)로 이동 후 `storageKey`, `url` 갱신

Response (`201`):

```json
{
  "data": {
    "dog": {
      "id": "<uuid>",
      "ownerId": "<user-id>",
      "name": "콩이",
      "breed": "푸들",
      "birthYear": null,
      "gender": "male",
      "personality": ["friendly", "active"],
      "photoFileId": "<media-file-id>",
      "createdAt": "2026-02-27T00:00:00.000Z",
      "updatedAt": "2026-02-27T00:00:00.000Z"
    }
  }
}
```

### `GET /dogs/my`

Response (`200`):

```json
{
  "data": {
    "dogs": [
      {
        "id": "<uuid>",
        "ownerId": "<user-id>",
        "name": "콩이",
        "breed": "푸들",
        "birthYear": null,
        "gender": "male",
        "personality": ["friendly", "active"],
        "photoFileId": "<media-file-id>",
        "createdAt": "2026-02-27T00:00:00.000Z",
        "updatedAt": "2026-02-27T00:00:00.000Z"
      }
    ]
  }
}
```

Notes:

- 현재 로그인 사용자(`ownerId`)의 강아지만 반환
- 정렬 기준: `createdAt desc` (최신 등록 순)

### `PATCH /dogs/:id`

Request (JSON, partial update):

```json
{
  "name": "콩이",
  "photoFileId": "<media-file-id>"
}
```

Validation:

- `POST /dogs` 필드와 동일 규칙의 partial update
- `birthYear: ""` 전달 시 `null` 저장
- `photoFileId`는 `POST /dogs`와 동일 검증 규칙 적용
- `photoFileId`가 임시 업로드 파일이면 저장 성공 시 최종 경로로 승격

Response (`200`):

```json
{
  "data": {
    "dog": {
      "id": "<uuid>",
      "ownerId": "<user-id>",
      "name": "콩이",
      "breed": "푸들",
      "birthYear": null,
      "gender": "male",
      "personality": ["friendly", "active"],
      "photoFileId": "<media-file-id>",
      "createdAt": "2026-02-27T00:00:00.000Z",
      "updatedAt": "2026-02-27T00:10:00.000Z"
    }
  }
}
```

Ownership policy:

- `PATCH /dogs/:id`는 `id + ownerId`로 조회
- 본인 소유가 아니거나 존재하지 않으면 동일하게 `404 NOT_FOUND` 반환

## Error Cases

- Error shape: `docs/API_RESPONSE_FORMAT.md`
- `400 BAD_REQUEST`
  - DTO validation 실패
  - `photoFileId`가 존재하지 않거나 목적 불일치
  - 다른 사용자 소유 파일이거나 이미 다른 강아지에 연결된 파일
- `401 UNAUTHORIZED`
  - 토큰 누락/형식 오류/만료/무효
- `404 NOT_FOUND`
  - `PATCH /dogs/:id` 대상이 없거나 비소유 리소스인 경우

Example (`400`, invalid photo file):

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "유효하지 않은 강아지 사진 파일입니다."
  }
}
```

Example (`404`, non-owned dog patch):

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "강아지를 찾을 수 없습니다."
  }
}
```

## Frontend Binding Note

- 강아지 상태 동기화는 `data.dog` 또는 `data.dogs`를 단일 소스로 사용
- 상세/편집 저장 시 `PATCH /dogs/:id` 결과를 로컬 캐시 상태에 merge
- 사진 업로드는 `POST /media/upload` 후 `data.file.id`를 `photoFileId`로 전달

## Quick cURL

```bash
BASE="http://localhost:${PORT:-3001}"

curl -X POST "$BASE/dogs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"name":"콩이","breed":"푸들","birthYear":"","gender":"male","personality":["friendly","active"],"photoFileId":"<media-file-id>"}'

curl -X GET "$BASE/dogs/my" \
  -H "Authorization: Bearer $ACCESS"

curl -X PATCH "$BASE/dogs/<DOG_ID>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"name":"콩이","photoFileId":"<media-file-id>"}'
```
