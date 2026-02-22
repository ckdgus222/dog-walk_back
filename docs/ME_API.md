# Me API (Backend)

## Base URL

- Local: `http://localhost:${PORT}` (default: `3000`, recommended: `3001`)

## Global Conventions

- Success/Error wire format + CORS: `docs/API_RESPONSE_FORMAT.md`
- Auth: `Authorization: Bearer <accessToken>` (must be an **access** token: `payload.type === "access"`)

## Endpoints

### `GET /me`

Headers:
- `Authorization: Bearer <accessToken>`

Response (`200`):
```json
{
  "data": {
    "user": {
      "id": "<uuid>",
      "email": "user@example.com",
      "nickname": "cch",
      "profileImage": null,
      "bio": null,
      "createdAt": "2026-02-14T00:00:00.000Z",
      "updatedAt": "2026-02-14T00:00:00.000Z"
    }
  }
}
```

Notes:
- This endpoint reads from DB and returns **safe fields only** (no password hash).

### `PATCH /me`

Headers:
- `Authorization: Bearer <accessToken>`

Request (JSON):
```json
{
  "nickname": "cch",
  "profileImage": "https://example.com/avatar.png",
  "bio": "Hello!"
}
```

Validation:
- `nickname` (optional): string, min 2, max 30
- `profileImage` (optional): string, max 500
- `bio` (optional): string, max 1000

Response (`200`): same shape as `GET /me`.

Notes:
- Omit fields to keep existing values.
- If the request body is empty (no updatable fields), it returns the same payload as `GET /me`.

## Error Cases

- Error shape: `docs/API_RESPONSE_FORMAT.md`
- `400 BAD_REQUEST`: validation error
- `401 UNAUTHORIZED`: missing/invalid/expired token, or using a refresh token in Bearer auth
- `404 NOT_FOUND`: user not found (e.g. user deleted but token still exists)

## Quick cURL

```bash
BASE="http://localhost:${PORT:-3001}"

curl -X GET "$BASE/me" -H "Authorization: Bearer $ACCESS"

curl -X PATCH "$BASE/me" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"nickname":"cch","profileImage":"https://example.com/avatar.png","bio":"Hello!"}'
```

