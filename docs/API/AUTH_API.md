# 🔑 Authentication API Specification *(Planned - Phase 3)*

### `POST /api/v1/auth/register`
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "username": "alex_gamer",
    "password": "StrongPassword123!",
    "displayName": "Alex"
  }
  ```
- **Response `201`**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "username": "alex_gamer", "email": "user@example.com" },
      "token": "jwt_token_string"
    }
  }
  ```

### `POST /api/v1/auth/login`
- **Auth**: None
- **Body**:
  ```json
  {
    "usernameOrEmail": "alex_gamer",
    "password": "StrongPassword123!"
  }
  ```
- **Response `200`**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "username": "alex_gamer", "displayName": "Alex" },
      "token": "jwt_token_string"
    }
  }
  ```

### `GET /api/v1/auth/me`
- **Auth**: Bearer JWT
- **Response `200`**: Returns current authenticated user and profile record.
