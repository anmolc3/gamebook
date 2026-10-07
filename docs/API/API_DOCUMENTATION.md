# 📡 API Documentation & Standards

## Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://api.yourdomain.com/api/v1`

## Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Optional operational feedback"
}
```

## Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The username or password provided was incorrect",
    "details": []
  }
}
```

## Authentication Header
Protected endpoints require:
`Authorization: Bearer <jwt_access_token>`

## HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure.
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Authenticated user lacks permission.
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unhandled server exception.
