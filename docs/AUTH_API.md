# Auth API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (default: `3000`, 권장: `3001`)

## Global Conventions

- Success/Error wire format + CORS: `docs/API_RESPONSE_FORMAT.md`

## Tokens

- Access token: `Authorization: Bearer <accessToken>`
- Refresh token: `X-Refresh-Token: <refreshToken>`
- Important: `JwtStrategy` only accepts tokens with payload `type: "access"` for Bearer auth.
- Refresh token rotation: every successful refresh revokes the used refresh token and returns a new pair.

## Endpoints

### `POST /auth/signup`

Request (JSON):
```json
{ "email": "user@example.com", "password": "123456", "nickname": "cch" }
```

Validation:
- `email`: email format
- `password`: min length 6
- `nickname`: min length 2

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
- `400 BAD_REQUEST`: validation error (email/password/nickname)
- `401 UNAUTHORIZED`: invalid credentials, invalid/expired tokens (access/refresh), email already exists (signup)

## Quick cURL

```bash
BASE="http://localhost:${PORT:-3001}"

curl -X POST "$BASE/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","nickname":"cch"}'

curl -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

curl -X POST "$BASE/auth/refresh" -H "X-Refresh-Token: $REFRESH"
curl -X POST "$BASE/auth/logout" -H "X-Refresh-Token: $REFRESH"
curl -X GET  "$BASE/auth/me" -H "Authorization: Bearer $ACCESS"
```
