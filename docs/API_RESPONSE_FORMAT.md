# API Response Format (Backend)

This project uses a **global success wrapper** + a **global exception filter**.

> This document is the **single source of truth** for response/error wire format and CORS rules.

## TL;DR

- Success (HTTP `2xx`): `{ "data": <payload> }`
- Error (HTTP `4xx/5xx`): `{ "error": { "code": "<CODE>", "message": "<MESSAGE>", "details"?: <ANY> } }`

## Success responses (`data`)

All controllers return their “original payload”, but it is wrapped by `ResponseInterceptor`.

Example: `GET /me` (`200`)
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
- Frontend should treat **HTTP status** as the source of truth for success/failure.
- If an endpoint returns `{ "success": true }`, it still becomes `{ "data": { "success": true } }`.

## Error responses (`error`)

All exceptions are formatted by `HttpExceptionFilter`.

### Fields

- `error.code`: stable-ish string code for frontend branching.
  - `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`
  - fallback: `HTTP_<status>` (e.g. `HTTP_429`)
- `error.message`: string or string[] (validation errors can be arrays)
- `error.details` (optional):
  - may contain Nest default error fields (e.g. `statusCode`, `error`, `message`)
  - for unknown errors (non-HttpException), includes `{ "path": "<request.url>" }`

### Examples

Validation error (`400`)
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": ["email must be an email"],
    "details": { "statusCode": 400, "message": ["..."], "error": "Bad Request" }
  }
}
```

Auth error (`401`)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "유효하지 않은 토큰입니다.",
    "details": { "statusCode": 401, "message": "유효하지 않은 토큰입니다.", "error": "Unauthorized" }
  }
}
```

Server error (`500`)
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "서버 내부 오류가 발생했습니다.",
    "details": { "path": "/me" }
  }
}
```

## Sensitive data handling

- Passwords are never returned to clients.
- DB stores `User.passwordHash` only (bcrypt).
- APIs explicitly return safe fields (e.g. Auth returns `id/email/nickname`, `/me` uses Prisma `select`).

## CORS (Local Dev)

- Recommended local ports:
  - frontend: `http://localhost:3000`
  - backend: `http://localhost:3001` (set `PORT=3001`)
- Allowed origins:
  - `FRONTEND_ORIGIN` (default: `http://localhost:3000`)
  - `http://127.0.0.1:3000`
- Allowed methods: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`
- Allowed headers: `Content-Type`, `Authorization`, `X-Refresh-Token`

Notes:
- Requests without an `Origin` header (e.g. curl/Postman) are allowed.
- If your frontend origin differs, set `FRONTEND_ORIGIN` before running the backend.
