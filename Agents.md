# Go-Stream — AI Agent Skill File

## Project Overview

**Go-Stream** is a high-performance backend livestreaming platform written in pure Go (`net/http`), built on Clean Architecture.
It supports HLS livestreaming, realtime chat via SSE, short-form video, an author/creator system, and global search.

## Tech Stack

| Component        | Technology                                                                    |
| ---------------- | ----------------------------------------------------------------------------- |
| Language         | Go 1.25+                                                                      |
| HTTP Framework   | `net/http` (stdlib) — **DO NOT** use Fiber, Gin, Echo, or any other framework |
| Database         | SQLite via GORM (`gorm.io/driver/sqlite`)                                     |
| ORM              | GORM v2 (`gorm.io/gorm`)                                                      |
| Auth             | JWT (access + refresh token) — `github.com/golang-jwt/jwt/v5`                 |
| Password Hashing | bcrypt — `golang.org/x/crypto/bcrypt`                                         |
| UUID             | `github.com/google/uuid`                                                      |
| Config           | `.env` via `github.com/joho/godotenv`                                         |
| Logger           | `log/slog` (stdlib) — JSON output                                             |
| Reverse Proxy    | Nginx (load balancing, WebSocket, SSL-ready)                                  |
| Realtime         | SSE (Server-Sent Events) for chat                                             |
| Streaming        | HLS — local file storage for live segments and VOD                            |

## Architecture — Clean Architecture Layers

```
cmd/server/main.go          ← Entry point, DI wiring, middleware chain
internal/
├── config/                  ← Read .env, helper GetEnv()
├── database/                ← GORM connect + AutoMigrate
├── domain/                  ← Entities + Interface definitions (Repository, Service)
├── repository/              ← GORM implementations of domain interfaces
├── service/                 ← Business logic, implements domain service interfaces
├── handler/                 ← HTTP handlers (request/response layer)
├── middleware/              ← Auth, OptionalAuth, IngestOnly
├── router/                  ← Route registration (http.ServeMux)
└── utils/                   ← JWT token generation/validation
pkg/
├── chat/                    ← In-memory Chat Hub (ring buffer + SSE broadcast)
├── logger/                  ← Structured JSON logger wrapper (slog)
├── response/                ← Standardized API response {status, statusCode, data/message}
└── storage/                 ← File storage utilities (HLS paths, uploads, public URLs)
```

### Dependency Flow (Strict)

```
handler → service (via domain interface) → repository (via domain interface) → GORM/DB
```

- **Handler** must NOT import repository directly
- **Service** must NOT import GORM/DB directly (except SearchService — justified exception)
- **Repository** must NOT contain business logic
- All interfaces are defined in `internal/domain/`

## Coding Conventions

### File Naming

| Layer      | Naming Pattern           | Example                         |
| ---------- | ------------------------ | ------------------------------- |
| Domain     | `{entity}.go`            | `user.go`, `room.go`, `auth.go` |
| Repository | `{entity}_repository.go` | `user_repository.go`            |
| Service    | `{entity}_service.go`    | `auth_service.go`               |
| Handler    | `{entity}_handler.go`    | `room_handler.go`               |

### Struct Patterns

```go
// Domain entity — always has GORM tags + JSON tags
type Room struct {
    ID    uint           `gorm:"primaryKey" json:"id"`
    Title string         `gorm:"not null;size:255" json:"title"`
    // ...
}

// Domain interface — defined in domain package
type RoomRepository interface {
    FindAll(filter RoomFilter) ([]Room, error)
    FindByID(id uint) (*Room, error)
    // ...
}

type RoomService interface {
    GetLiveRooms(categoryID *uint, gameID *uint) ([]Room, error)
    // ...
}
```

### Handler Pattern

```go
type RoomHandler struct {
    svc domain.RoomService
}

func NewRoomHandler(svc domain.RoomService) *RoomHandler {
    return &RoomHandler{svc: svc}
}

func (h *RoomHandler) GetRoom(w http.ResponseWriter, r *http.Request) {
    id, err := parseID(r, "id")
    if err != nil {
        response.Error(w, http.StatusBadRequest, "Invalid room ID")
        return
    }
    room, err := h.svc.GetRoomByID(id)
    if err != nil {
        response.Error(w, http.StatusNotFound, "Room not found")
        return
    }
    response.Success(w, http.StatusOK, room)
}
```

### Repository Pattern

```go
type roomRepository struct {
    db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
    return &roomRepository{db: db}
}
```

### Service Pattern

```go
type roomService struct {
    repo domain.RoomRepository
}

func NewRoomService(repo domain.RoomRepository) domain.RoomService {
    return &roomService{repo: repo}
}
```

## API Response Format

All responses follow the `pkg/response` standard:

```json
// Success
{
  "status": true,
  "statusCode": 200,
  "data": { ... }
}

// Error
{
  "status": false,
  "statusCode": 400,
  "message": "Error description"
}
```

Usage:

```go
response.Success(w, http.StatusOK, data)
response.Error(w, http.StatusBadRequest, "message")
```

## Routing

Uses Go 1.22+ enhanced `http.ServeMux` with method-based routing:

```go
mux.HandleFunc("GET /api/rooms", handler.GetLiveRooms)           // public
mux.Handle("POST /api/rooms", auth(handler.CreateRoom))          // protected
mux.Handle("POST /ingest/on-publish", ingestOnly(handler.OnPublish)) // internal
```

### Middleware Wrappers

```go
func auth(h http.HandlerFunc) http.Handler {
    return middleware.Auth(h)
}

func ingestOnly(h http.HandlerFunc) http.Handler {
    return middleware.IngestOnly(h)
}
```

### Middleware Chain (main.go)

```go
Handler: loggerMiddleware(corsMiddleware(mux))
```

## Authentication System

### JWT Token Pair

- **Access Token**: 15 minutes, used for API requests
- **Refresh Token**: 7 days, used to renew the access token
- Signing: HMAC-SHA256
- Secret: `JWT_SECRET` from `.env`

### Identity Model (Multi-provider Auth)

Supports multiple login methods per User:

| Provider | Fields Used                                         |
| -------- | --------------------------------------------------- |
| `local`  | `email`, `password_hash`                            |
| `google` | `provider_user_id`, `access_token`, `refresh_token` |
| `github` | `provider_user_id`, `access_token`, `refresh_token` |
| `saml`   | `idp_id`, `name_id`                                 |
| `oidc`   | `provider_user_id`, `access_token`, `refresh_token` |

### Context Keys (Middleware)

```go
middleware.ContextKeyUserID   // contextKey("user_id")   → uint
middleware.ContextKeyEmail    // contextKey("email")     → string
middleware.ContextKeyUserName // contextKey("user_name") → string
middleware.ContextKeyAvatar   // contextKey("avatar")    → string
```

**Note**: Current handlers use `r.Context().Value("user_id")` (string key) instead of `middleware.ContextKeyUserID` (typed key). These should be unified during refactoring.

## Domain Models

### Core Entities

| Entity          | DB Table          | Description                                               |
| --------------- | ----------------- | --------------------------------------------------------- |
| `User`          | `users`           | Basic user account                                        |
| `Identity`      | `identities`      | Login provider (local, OAuth, SAML)                       |
| `Author`        | `authors`         | Creator profile (1-1 with User, requires approval)        |
| `SocialLink`    | `social_links`    | Author's social media links                               |
| `Category`      | `categories`      | Stream categories (Gaming, Music, Talk, ...)              |
| `Game`          | `games`           | Specific game under the Gaming category                   |
| `Room`          | `rooms`           | Livestream room                                           |
| `StreamSession` | `stream_sessions` | Historical record of ended livestreams                    |
| `ShortVideo`    | `short_videos`    | Short-form videos (author uploads, fan clips, highlights) |
| `ChatMessage`   | —                 | Chat message (in-memory only, not persisted to DB)        |

### Enum Types

```go
// Room
RoomStatusOffline / RoomStatusLive / RoomStatusEnded
RoomVisibilityPublic / RoomVisibilityPrivate / RoomVisibilityUnlisted

// Author
AuthorStatusPending / AuthorStatusApproved / AuthorStatusSuspended / AuthorStatusRejected
AuthorCategory: gaming, music, sports, education, tech, lifestyle, other

// Category
CategoryType: game, talk, music, sports, education, creative, other

// ShortVideo
VideoStatus: processing, published, failed, private
VideoSource: author, fan, clip

// Chat
ChatMessageType: text, gift, system

// Identity
IdentityProvider: local, google, github, saml, oidc

// JWT
TokenType: access, refresh
```

## Realtime Chat (SSE)

### Architecture

```
Client → POST /api/rooms/{id}/chat        (send message, JWT protected)
Client ← GET  /api/rooms/{id}/chat/stream (SSE, public)
```

### Chat Hub (`pkg/chat/hub.go`)

- **Ring Buffer**: Each room stores up to 300 messages in a circular buffer
- **SSE Broadcast**: New message → broadcast to all subscribers
- **Subscribe**: SSE client connects → receives chat history + realtime messages
- **Cleanup**: Stream ends → full state cleared (buffer + subscribers)
- **Non-blocking**: Slow clients are skipped, never blocking other clients

## HLS Streaming Pipeline

### Flow

```
OBS/Streamer → RTMP Ingest Server → POST /ingest/on-publish      → Room goes live
                                   → HLS written to storage/live/{stream_key}/
                                   → Client plays via storage/live/{stream_key}/index.m3u8

OBS Disconnects → POST /ingest/on-publish-done → Room status = ended
                                               → VOD at storage/vod/{stream_key}/index.m3u8
```

### Storage Layout

```
storage/
├── live/{stream_key}/         ← Active HLS segments
│   ├── index.m3u8
│   └── *.ts
├── vod/{stream_key}/          ← VOD recordings
│   ├── index.m3u8
│   └── *.ts
├── thumbnails/                ← Thumbnails
└── videos/                    ← Short videos
```

### IngestOnly Middleware

Only allows requests from the IP configured in `INGEST_SERVER_IP`:

```go
func IngestOnly(next http.Handler) http.Handler {
    // Check X-Real-IP → X-Forwarded-For → RemoteAddr
    // Compare with INGEST_SERVER_IP env var
}
```

## Nginx Configuration

- **Load Balancer**: Round-robin across multiple Go instances
- **Health Check**: `max_fails=3`, `fail_timeout=30s`
- **WebSocket/SSE**: `proxy_http_version 1.1`, `Upgrade` + `Connection` headers
- **SSL**: Pre-configured (commented out), supports TLS 1.2/1.3
- **Timeout**: connect/send/read = 60s

## Environment Variables

| Key                | Default                         | Description                      |
| ------------------ | ------------------------------- | -------------------------------- |
| `PORT`             | `3000`                          | Server listen port               |
| `DB_FILE`          | `gostream.db`                   | SQLite file path                 |
| `JWT_SECRET`       | `change-me-in-production`       | JWT signing secret               |
| `STORAGE_PATH`     | `./storage`                     | Root directory for file storage  |
| `STORAGE_BASE_URL` | `http://localhost:3000/storage` | Public base URL for static files |
| `INGEST_SERVER_IP` | `127.0.0.1`                     | IP allowed to call ingest hooks  |

## DI Wiring (main.go)

```go
// 1. Repository layer
userRepo     := repository.NewUserRepository(db)
identityRepo := repository.NewIdentityRepository(db)
roomRepo     := repository.NewRoomRepository(db)

// 2. Service layer
userSvc   := service.NewUserService(userRepo)
authSvc   := service.NewAuthService(userRepo, identityRepo)
roomSvc   := service.NewRoomService(roomRepo)
searchSvc := service.NewSearchService(db)

// 3. Shared infrastructure
chatHub := chat.NewHub()

// 4. Handler layer
userHandler   := handler.NewUserHandler(userSvc)
authHandler   := handler.NewAuthHandler(authSvc)
roomHandler   := handler.NewRoomHandler(roomSvc)
chatHandler   := handler.NewChatHandler(chatHub)
ingestHandler := handler.NewIngestHandler(roomRepo, chatHub)
searchHandler := handler.NewSearchHandler(searchSvc)
```

## API Routes

### Public Routes

| Method | Path                          | Handler                      | Description                 |
| ------ | ----------------------------- | ---------------------------- | --------------------------- |
| GET    | `/`                           | inline                       | Welcome + port info         |
| GET    | `/api/users`                  | `UserHandler.GetUsers`       | List all users              |
| GET    | `/api/users/{id}`             | `UserHandler.GetUserByID`    | User detail                 |
| GET    | `/api/search?q=&limit=`       | `SearchHandler.GlobalSearch` | Global search               |
| POST   | `/api/auth/register`          | `AuthHandler.Register`       | Register (local)            |
| POST   | `/api/auth/login`             | `AuthHandler.Login`          | Login (local)               |
| GET    | `/api/rooms`                  | `RoomHandler.GetLiveRooms`   | List live rooms             |
| GET    | `/api/rooms/{id}`             | `RoomHandler.GetRoom`        | Room detail                 |
| GET    | `/api/rooms/{id}/playback`    | `IngestHandler.Playback`     | HLS playback URL            |
| GET    | `/api/rooms/{id}/chat/stream` | `ChatHandler.Stream`         | SSE chat stream             |
| GET    | `/storage/...`                | Static file server           | Serve HLS/thumbnails/videos |

### Protected Routes (JWT Required)

| Method | Path                         | Handler                    | Description          |
| ------ | ---------------------------- | -------------------------- | -------------------- |
| GET    | `/api/rooms/me`              | `RoomHandler.GetMyRooms`   | Current user's rooms |
| GET    | `/api/rooms/{id}/stream-key` | `RoomHandler.GetStreamKey` | Get stream key       |
| POST   | `/api/rooms`                 | `RoomHandler.CreateRoom`   | Create new room      |
| PUT    | `/api/rooms/{id}`            | `RoomHandler.UpdateRoom`   | Update room          |
| DELETE | `/api/rooms/{id}`            | `RoomHandler.DeleteRoom`   | Delete room          |
| POST   | `/api/rooms/{id}/live`       | `RoomHandler.GoLive`       | Go live              |
| POST   | `/api/rooms/{id}/end`        | `RoomHandler.EndStream`    | End stream           |
| POST   | `/api/rooms/{id}/chat`       | `ChatHandler.SendMessage`  | Send chat message    |

### Internal Routes (IngestOnly Middleware)

| Method | Path                      | Handler                       | Description         |
| ------ | ------------------------- | ----------------------------- | ------------------- |
| POST   | `/ingest/on-publish`      | `IngestHandler.OnPublish`     | RTMP stream started |
| POST   | `/ingest/on-publish-done` | `IngestHandler.OnPublishDone` | RTMP stream ended   |

## Unimplemented Interfaces

Interfaces defined in `domain/` with no implementation yet:

| Interface                 | File                       | Status          |
| ------------------------- | -------------------------- | --------------- |
| `CategoryRepository`      | `domain/category.go`       | Not implemented |
| `CategoryService`         | `domain/category.go`       | Not implemented |
| `AuthorRepository`        | `domain/author.go`         | Not implemented |
| `AuthorService`           | `domain/author.go`         | Not implemented |
| `ShortVideoRepository`    | `domain/short_video.go`    | Not implemented |
| `ShortVideoService`       | `domain/short_video.go`    | Not implemented |
| `StreamSessionRepository` | `domain/stream_session.go` | Not implemented |
| `StreamSessionService`    | `domain/stream_session.go` | Not implemented |

## Guide: Adding a New Feature

### Adding a New Entity

1. Create `internal/domain/{entity}.go` — struct + interfaces
2. Register model in `database.go` → `db.AutoMigrate(&domain.NewEntity{})`
3. Create `internal/repository/{entity}_repository.go`
4. Create `internal/service/{entity}_service.go`
5. Create `internal/handler/{entity}_handler.go`
6. Register routes in `internal/router/router.go`
7. Wire DI in `cmd/server/main.go`

### Adding a New Route

```go
// Public
mux.HandleFunc("GET /api/new-route", newHandler.Method)

// Protected
mux.Handle("POST /api/new-route", auth(newHandler.Method))
```

### Adding a New Middleware

Create in `internal/middleware/middleware.go`, pattern:

```go
func NewMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // pre-processing
        next.ServeHTTP(w, r)
        // post-processing
    })
}
```

## Backend Absolute Rules

1. **No HTTP framework** — only `net/http` stdlib
2. **No code comments** — code must be self-explanatory
3. **Interface-first** — define interfaces in `domain/` before implementing
4. **Always return clear error responses** — never panic
5. **GORM conventions** — use `Preload()` for eager-loading relationships
6. **JSON tags** — every exported field must have a `json:""` tag
7. **GORM tags** — use `gorm:""` for constraints (not null, size, index, uniqueIndex)
8. **Sensitive fields** — use `json:"-"` to hide (passwords, tokens, stream keys)
9. **Path params** — use `r.PathValue("key")` (Go 1.22+)
10. **Query params** — use `r.URL.Query().Get("key")`

## Frontend Architecture & Rules (fe/)

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS v4 (using CSS-based configuration via `@import "tailwindcss";` in `globals.css`)
- **Language**: TypeScript (Strict typing, no `any`)
- **Package Manager**: `pnpm` (Workspace-ready)

### Directory Structure Conventions (`fe/src`)

All frontend source code must reside inside `fe/src/` and strictly adhere to the following 6 directories:

- **`app/`**: Next.js pages, layouts, routing, metadata, and CSS imports. Keep business logic and component state minimal here.
- **`components/`**: Reusable UI components, strictly categorized as:
  - `ui/`: Reusable, atomic, low-level UI elements (e.g., `Button.tsx`, `Input.tsx`, `Modal.tsx`, `Card.tsx`).
  - `common/`: Layout shell components shared across the application (e.g., `Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`).
  - `features/{featureName}/`: Feature-specific UI components (e.g., `features/chat/ChatBox.tsx`, `features/stream/VideoPlayer.tsx`).
- **`hooks/`**: Custom React Hooks for encapsulating local/global state, side effects, API fetch coordination, and SSE connections (e.g., `useAuth.ts`, `useChat.ts`, `useStream.ts`).
- **`lib/`**: Integration and wrapper code for external libraries (e.g., API clients, local storage wrapper, global constants).
- **`services/`**: API service layer mapping to the backend (e.g., `auth.service.ts`, `room.service.ts`, `chat.service.ts`). Each service is a stateless module that performs HTTP requests.
- **`utils/`**: Pure utility functions without side-effects (e.g., `formatDate.ts`, `validators.ts`, `stringUtils.ts`).

### Frontend Absolute Rules

1. **Strict Separation of Concerns**: Components are for presentation and event delegation. Business logic, state manipulation, and fetching should live in services or custom hooks.
2. **TypeScript Integrity**: No `any` type. Define clear interfaces/types for all data models (which should align with the backend's response model `pkg/response`).
3. **Tailwind v4 Conventions**: Use standard utility classes. Maintain absolute responsiveness (`sm:`, `md:`, `lg:`). Custom values or colors must be defined in `@theme` in `globals.css` if global, otherwise use arbitrary values sparingly.
4. **File Naming Conventions**:
   - Components & Layouts: PascalCase (e.g., `ChatBox.tsx`, `Navbar.tsx`).
   - Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`, `useChat.ts`).
   - Services & Utils: camelCase/kebab-case (e.g., `auth.service.ts`, `api-client.ts`).
   - Folders: camelCase or kebab-case.
5. **API Communications**:
   - Utilize a unified API client configured in `src/lib/api-client.ts`.
   - Respect backend response standard (all APIs return `{ status: boolean, statusCode: number, data?: any, message?: string }`).
6. **Realtime & Streaming Hooks**:
   - SSE connection for chat must handle connections, retry logic, and clean up listeners properly on unmount inside `useChat.ts`.
   - Streaming must use proper player libraries (like `hls.js` or generic wrappers) and handle fallback gracefully.
7. **No Messy or Ad-hoc files**: Never place generic files in the root of `src/` or `src/app/`. All code must belong to one of the designated 6 directories inside `src/`.

## Commit Convention

```
feat:           new feature, page, or component
feat(...):      scoped new feature
style(...):     CSS, responsive, UI styling
refactor:       code logic changes or restructure
fix:            bug fixes
```
