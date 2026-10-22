# CampusHub Backend — API Documentation

Base URL: `http://localhost:5000/api`

All responses follow this envelope:
```json
{ "success": true, "message": "...", "data": {} }
```
Errors:
```json
{ "success": false, "message": "...", "errors": [] }
```

---

## Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new account |
| POST | `/auth/login` | ❌ | Login, returns token pair |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ❌ | Invalidate refresh token |
| POST | `/auth/logout-all` | ✅ | Invalidate all sessions |
| GET | `/auth/me` | ✅ | Get current user |
| GET | `/auth/verify-email/:token` | ❌ | Verify email address |
| POST | `/auth/resend-verification` | ✅ | Resend verification email |
| POST | `/auth/forgot-password` | ❌ | Send reset link |
| POST | `/auth/reset-password` | ❌ | Reset with token |
| GET | `/auth/google` | ❌ | Google OAuth redirect |
| GET | `/auth/google/callback` | ❌ | Google OAuth callback |

### Register
```json
POST /auth/register
{
  "firstName": "Alex",
  "lastName": "Rivera",
  "email": "alex@campus.edu",
  "password": "SecurePass1",
  "department": "Computer Science",
  "yearOfStudy": "YEAR_3"
}
```

### Login
```json
POST /auth/login
{
  "email": "demo@campus.edu",
  "password": "Demo1234!"
}
// Response: { accessToken, refreshToken, expiresIn, user }
```

---

## Study Groups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/study-groups` | ⭕ | List all (filter: subject, search, page, limit) |
| POST | `/study-groups` | ✅ | Create study group |
| GET | `/study-groups/:id` | ⭕ | Get single group |
| PUT | `/study-groups/:id` | ✅ | Update group (owner only) |
| DELETE | `/study-groups/:id` | ✅ | Delete group (owner/admin) |
| POST | `/study-groups/:id/join` | ✅ | Join group |
| POST | `/study-groups/:id/leave` | ✅ | Leave group |
| POST | `/study-groups/:id/resources` | ✅ | Add resource link |
| DELETE | `/study-groups/:id/resources/:resourceId` | ✅ | Remove resource |

Query params: `?page=1&limit=20&subject=Computer+Science&search=ML`

---

## Carpool

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/carpools` | ⭕ | List (filter: type, origin, destination) |
| POST | `/carpools` | ✅ | Post carpool |
| GET | `/carpools/:id` | ⭕ | Get carpool detail |
| PUT | `/carpools/:id` | ✅ | Update (driver only) |
| DELETE | `/carpools/:id` | ✅ | Delete |
| POST | `/carpools/:id/request` | ✅ | Request a seat |
| PATCH | `/carpools/:id/requests/:requestId` | ✅ | Approve/reject request |

```json
POST /carpools
{
  "type": "OFFERING",
  "origin": "Downtown Apts",
  "destination": "North Campus",
  "departureTime": "2025-09-15T08:00:00Z",
  "seatsTotal": 3,
  "pricePerSeat": 5,
  "recurringDays": ["Mon","Wed","Fri"]
}
```

---

## Lost & Found

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/lost-found` | ⭕ | List items (filter: status, category) |
| POST | `/lost-found` | ✅ | Report item |
| GET | `/lost-found/:id` | ⭕ | Get item |
| PUT | `/lost-found/:id` | ✅ | Update item |
| PATCH | `/lost-found/:id/resolve` | ✅ | Mark as resolved |
| DELETE | `/lost-found/:id` | ✅ | Delete item |

---

## Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events` | ⭕ | List (filter: category, upcoming) |
| POST | `/events` | ✅ | Create event |
| GET | `/events/:id` | ⭕ | Get event |
| PUT | `/events/:id` | ✅ | Update (organizer only) |
| DELETE | `/events/:id` | ✅ | Delete |
| POST | `/events/:id/rsvp` | ✅ | RSVP (body: `{ status: "GOING"|"MAYBE"|"NOT_GOING" }`) |
| DELETE | `/events/:id/rsvp` | ✅ | Cancel RSVP |

---

## Chat (REST)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/rooms/mine` | ✅ | My rooms with last message |
| GET | `/chat/rooms/explore` | ⭕ | Browse public rooms |
| POST | `/chat/rooms` | ✅ | Create room |
| GET | `/chat/rooms/:id` | ⭕ | Room detail (id or slug) |
| POST | `/chat/rooms/:id/join` | ✅ | Join room |
| POST | `/chat/rooms/:id/leave` | ✅ | Leave room |
| GET | `/chat/rooms/:id/messages` | ✅ | Message history (paginated) |
| POST | `/chat/rooms/:id/messages` | ✅ | Send message (REST fallback) |
| DELETE | `/chat/messages/:messageId` | ✅ | Soft-delete message |

### Socket.io Events

Connect: `io({ auth: { token: accessToken } })`

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:join` | `roomId` | Join socket room |
| `chat:leave` | `roomId` | Leave socket room |
| `chat:message` | `{ roomId, content, replyToId? }` | Send message |
| `chat:typing` | `{ roomId, isTyping }` | Typing indicator |
| `chat:editMessage` | `{ messageId, content }` | Edit message |
| `chat:deleteMessage` | `messageId` | Delete message |
| `chat:markRead` | `roomId` | Update read cursor |

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:message` | Message object | New message broadcast |
| `chat:userJoined` | `{ userId, userName }` | User joined room |
| `chat:userLeft` | `{ userId, userName }` | User left room |
| `chat:typing` | `{ userId, userName, isTyping }` | Typing status |
| `chat:messageEdited` | Updated message | Message was edited |
| `chat:messageDeleted` | `{ messageId }` | Message was deleted |
| `notification:new` | Notification object | Real-time notification |

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | List (filter: `?unread=true`) |
| PATCH | `/notifications/:id/read` | ✅ | Mark one as read |
| POST | `/notifications/read-all` | ✅ | Mark all as read |
| DELETE | `/notifications/:id` | ✅ | Delete one |
| DELETE | `/notifications` | ✅ | Clear all |

---

## Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search?q=machine+learning` | ⭕ | Search across all modules |

Response includes `{ studyGroups, events, lostFound, carpools, users, chatRooms }`.

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/:username` | ❌ | Public profile |
| PATCH | `/users/me` | ✅ | Update profile |
| POST | `/users/me/password` | ✅ | Change password |
| DELETE | `/users/me` | ✅ | Deactivate account |
| PATCH | `/users/me/notifications` | ✅ | Update notification prefs |

---

## File Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/image` | ✅ | Upload image (multipart, field: `file`) |
| POST | `/upload/avatar` | ✅ | Upload & set avatar |

Returns: `{ url: "/uploads/filename.jpg" }`

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global | 100 req / 15 min |
| Auth endpoints | 10 req / 15 min |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (no permission) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Validation failed |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Data Models (Key Fields)

### yearOfStudy enum
`YEAR_1` `YEAR_2` `YEAR_3` `YEAR_4` `MASTERS` `PHD` `OTHER`

### EventCategory enum
`ACADEMIC` `SOCIAL` `SPORTS` `WORKSHOP` `CULTURAL` `CAREER` `OTHER`

### CarpoolType enum
`OFFERING` `LOOKING`

### ItemStatus enum
`LOST` `FOUND` `RESOLVED`
