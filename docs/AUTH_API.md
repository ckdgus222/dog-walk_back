# Auth API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (if `PORT` is unset, defaults to `3000`)

## Global Response Format

- Success (HTTP `2xx`): `{ "data": <payload> }`
- Error (HTTP `4xx/5xx`): `{ "error": { "code": "<CODE>", "message": "<MESSAGE>", "details"?: <ANY> } }`
- Full spec: `docs/API_RESPONSE_FORMAT.md`

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

## Error Format

- Validation error (`400`) example:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": ["..."],
    "details": { "statusCode": 400, "message": ["..."], "error": "Bad Request" }
  }
}
```

- Auth error (`401`) examples:
  - invalid credentials
  - invalid token / expired token

## Quick cURL

```bash
BASE="http://localhost:3000"

curl -X POST "$BASE/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","nickname":"cch"}'

curl -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

curl -X POST "$BASE/auth/refresh" -H "X-Refresh-Token: $REFRESH"
curl -X POST "$BASE/auth/logout" -H "X-Refresh-Token: $REFRESH"
curl -X GET  "$BASE/auth/me" -H "Authorization: Bearer $ACCESS"
```

## CORS Note (Browser Calls)

Local dev expects:
- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

Backend enables CORS for `http://localhost:3000` and allows header `X-Refresh-Token`.

If your frontend origin differs, set `FRONTEND_ORIGIN` when running the backend.
