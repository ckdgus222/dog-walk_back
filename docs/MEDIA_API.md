# Media API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (default: `3000`, 권장: `3001`)

## Global Conventions

- Success/Error wire format + CORS: `docs/API_RESPONSE_FORMAT.md`
- 업로드 응답의 `file.id`는 다른 도메인(예: Auth Signup, Feed)에서 참조 가능합니다.

## Endpoint

### `POST /media/upload`

Multipart form-data:
- `file`: 이미지 파일 (required)
- `purpose`: `"DOG_PROFILE" | "FEED_POST"` (required)

Validation:
- 파일 타입: `image/jpeg`, `image/png`, `image/webp`
- 파일 크기: 최대 5MB

Response (`201`):
```json
{
  "data": {
    "file": {
      "id": "<uuid>",
      "purpose": "DOG_PROFILE",
      "url": "/uploads/tmp/media/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg",
      "mimeType": "image/jpeg",
      "size": 102400
    }
  }
}
```

Storage behavior:

- `purpose="DOG_PROFILE"` 업로드는 **임시 경로**(`uploads/tmp/media/...`)에 저장됩니다.
- 이후 `POST /auth/signup`, `POST /dogs`, `PATCH /dogs/:id`에서 해당 `file.id`가 강아지 대표사진으로 확정 연결되면, 서버가 파일을 **최종 경로**(`uploads/media/...`)로 이동시키고 DB(`storageKey`, `url`)를 갱신합니다.
- 따라서 프론트는 업로드 직후 `url`을 장기 보관하지 말고, `file.id`를 도메인 요청에 전달한 뒤 최종 `dog.photoFileId` 기준으로 상태를 동기화해야 합니다.

## Error Cases

- Error shape: `docs/API_RESPONSE_FORMAT.md`
- `400 BAD_REQUEST`:
  - 파일 누락
  - 지원하지 않는 형식
  - 5MB 초과

## Usage in Signup

1. `POST /media/upload`로 강아지 사진 업로드
2. 응답의 `data.file.id`를 signup 요청의 `dog.photoFileId`로 전달
3. `POST /auth/signup`에서 강아지 대표사진으로 연결 + 임시 파일을 최종 경로로 승격

## Quick cURL

```bash
BASE="http://localhost:${PORT:-3001}"

curl -X POST "$BASE/media/upload" \
  -F "purpose=DOG_PROFILE" \
  -F "file=@/absolute/path/to/dog.jpg"
```
