# Auth API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (default: `3000`, 권장: `3001`)

## Global Conventions

- Success/Error wire format + CORS: `docs/API_RESPONSE_FORMAT.md`
- 파일 업로드 계약: `docs/MEDIA_API.md`

## Tokens

- Access token: `Authorization: Bearer <accessToken>`
- Refresh token: `X-Refresh-Token: <refreshToken>`
- Important: `JwtStrategy` only accepts tokens with payload `type: "access"` for Bearer auth.
- Refresh token rotation: every successful refresh revokes the used refresh token and returns a new pair.

## Endpoints

### `POST /auth/signup`

Request (JSON):
```json
{
  "email": "user@example.com",
  "password": "123456",
  "nickname": "cch",
  "dog": {
    "name": "콩이",
    "breed": "푸들",
    "birthYear": "",
    "gender": "male",
    "personality": ["friendly", "active"],
    "photoFileId": "<media-file-id>"
  }
}
```

Validation:
- `email`: email format
- `password`: min length 6
- `nickname`: min length 2
- `dog`: required object
  - `dog.name`: required string (non-empty)
  - `dog.breed`: required string (non-empty)
  - `dog.birthYear`: string (`""` allowed)
  - `dog.gender`: `"male" | "female"`
  - `dog.personality`: `string[]` (empty array allowed)
  - `dog.photoFileId`: optional UUID (`POST /media/upload` 응답의 `file.id`)

Response (`201`):
```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": { "id": "<uuid>", "email": "user@example.com", "nickname": "cch" }
  }
}
```

Notes:
- Signup 응답은 기존과 동일하게 `accessToken`, `refreshToken`, `user`만 포함합니다.
- `dog` 객체는 DB에 저장되지만 응답 payload에는 포함되지 않습니다.
- `dog.photoFileId`를 전달하면 서버가 해당 파일을 강아지 대표사진으로 연결하고, `DOG_PROFILE` 임시 업로드 파일(`uploads/tmp/media/...`)을 최종 경로(`uploads/media/...`)로 이동시킵니다.

### `POST /auth/login`

Request (JSON):
```json
{ "email": "user@example.com", "password": "123456" }
```

Response (`201`): same shape as `/auth/signup`.

### `POST /auth/refresh`

Headers:
- `X-Refresh-Token: <refreshToken>`

Response (`201`): same shape as `/auth/signup` (new tokens).

Notes:
- Frontend must overwrite stored refresh token with the new `refreshToken`.

### `POST /auth/logout`

Headers:
- `X-Refresh-Token: <refreshToken>`

Response (`200`):
```json
{ "data": { "success": true } }
```

Notes:
- Logout revokes the provided refresh token (session-scoped).

### `GET /auth/me`

Headers:
- `Authorization: Bearer <accessToken>`

Response (`200`):
```json
{
  "data": {
    "user": { "id": "<uuid>", "email": "user@example.com", "type": "access" }
  }
}
```

Notes:
- This is derived from JWT payload (not full DB profile).

## Error Cases

- Error shape: `docs/API_RESPONSE_FORMAT.md`
- `400 BAD_REQUEST`: validation error (email/password/nickname/dog)
- `401 UNAUTHORIZED`: invalid credentials, invalid/expired tokens (access/refresh), email already exists (signup)

Example (`401`, duplicate email):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "이미 존재하는 이메일입니다."
  }
}
```

## Quick cURL

```bash
BASE="http://localhost:${PORT:-3001}"

curl -X POST "$BASE/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","nickname":"cch","dog":{"name":"콩이","breed":"푸들","birthYear":"","gender":"male","personality":["friendly","active"],"photoFileId":"<media-file-id>"}}'

curl -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

curl -X POST "$BASE/auth/refresh" -H "X-Refresh-Token: $REFRESH"
curl -X POST "$BASE/auth/logout" -H "X-Refresh-Token: $REFRESH"
curl -X GET  "$BASE/auth/me" -H "Authorization: Bearer $ACCESS"
```
