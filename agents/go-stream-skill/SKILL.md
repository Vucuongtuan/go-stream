---
name: go-stream
description: >
  Livestreaming foundation skill for Go backend and Next.js frontend.
  Backend uses net/http stdlib only (NO Gin, Fiber, Echo, or any framework). Frontend uses Next.js App Router and Tailwind v4.
  Use this skill whenever the user wants to: build a live streaming backend in Go, implement HLS streaming,
  set up SSE-based realtime chat, add JWT auth in Go, design Clean Architecture for a Go HTTP server,
  implement RTMP ingest hooks, build frontend UI in Next.js, or add any feature to the Go-Stream project.
  Trigger on keywords: Go livestream, HLS backend, net/http server, Go SSE chat, Go Clean Architecture,
  RTMP ingest Go, Go JWT auth, GORM SQLite, Go streaming backend, Next.js frontend, Tailwind v4.
---

# Go-Stream Skill

Full-stack livestreaming platform built with pure Go (`net/http`) backend following Clean Architecture, and Next.js 16 App Router + Tailwind CSS v4 frontend.
Supports HLS livestream, SSE realtime chat, short-form video, author/creator system, and global search.

## Tech Stack

| Component        | Technology |
| ---------------- | ---------- |
| Language         | Go 1.22+   |
| HTTP Framework   | `net/http` (stdlib) — **NEVER** use Fiber, Gin, Echo, or any framework |
| Database         | SQLite via GORM (`gorm.io/driver/sqlite`) |
| ORM              | GORM v2 (`gorm.io/gorm`) |
| Auth             | JWT access + refresh — `github.com/golang-jwt/jwt/v5` |
| Password Hashing | bcrypt — `golang.org/x/crypto/bcrypt` |
| UUID             | `github.com/google/uuid` |
| Config           | `.env` via `github.com/joho/godotenv` |
| Logger           | `log/slog` (stdlib) — JSON output |
| Reverse Proxy    | Nginx (load balancing, SSE, SSL-ready) |
| Realtime         | SSE (Server-Sent Events) for chat |
| Streaming        | HLS — local file storage for live segments and VOD |

---

## Architecture — Clean Architecture Layers

```
cmd/server/main.go           ← Entry point, DI wiring, middleware chain
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
- All interfaces defined in `internal/domain/`

---

## Code Patterns

### Domain Entity

```go
type Room struct {
    ID         uint           `gorm:"primaryKey" json:"id"`
    Title      string         `gorm:"not null;size:255" json:"title"`
    StreamKey  string         `gorm:"uniqueIndex;not null" json:"-"`
    Status     RoomStatus     `gorm:"default:offline" json:"status"`
    CreatedAt  time.Time      `json:"created_at"`
}

type RoomRepository interface {
    FindAll(filter RoomFilter) ([]Room, error)
    FindByID(id uint) (*Room, error)
    Create(room *Room) error
    Update(room *Room) error
    Delete(id uint) error
}

type RoomService interface {
    GetLiveRooms(categoryID *uint, gameID *uint) ([]Room, error)
    GetRoomByID(id uint) (*Room, error)
    CreateRoom(userID uint, input CreateRoomInput) (*Room, error)
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
type roomRepository struct{ db *gorm.DB }

func NewRoomRepository(db *gorm.DB) domain.RoomRepository {
    return &roomRepository{db: db}
}
```

### Service Pattern

```go
type roomService struct{ repo domain.RoomRepository }

func NewRoomService(repo domain.RoomRepository) domain.RoomService {
    return &roomService{repo: repo}
}
```

### Middleware Pattern

```go
func NewMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // pre-processing
        next.ServeHTTP(w, r)
        // post-processing
    })
}
```

---

## API Response Standard

```go
// pkg/response usage:
response.Success(w, http.StatusOK, data)
response.Error(w, http.StatusBadRequest, "message")

// JSON output:
// { "status": true,  "statusCode": 200, "data": { ... } }
// { "status": false, "statusCode": 400, "message": "Error description" }
```

---

## Routing (Go 1.22+ ServeMux)

```go
// Public
mux.HandleFunc("GET /api/rooms", handler.GetLiveRooms)

// Protected (JWT required)
mux.Handle("POST /api/rooms", auth(handler.CreateRoom))

// Internal (ingest server only)
mux.Handle("POST /ingest/on-publish", ingestOnly(handler.OnPublish))
```

Middleware chain in `main.go`:
```go
Handler: loggerMiddleware(corsMiddleware(mux))
```

---

## Authentication

- **Access Token**: 15 min, HMAC-SHA256, secret from `JWT_SECRET` env
- **Refresh Token**: 7 days
- **Multi-provider**: local (email+bcrypt), google, github, saml, oidc via `Identity` model

Context keys set by middleware:
```go
middleware.ContextKeyUserID    // → uint
middleware.ContextKeyEmail     // → string
middleware.ContextKeyUserName  // → string
middleware.ContextKeyAvatar    // → string
```

---

## HLS Streaming Pipeline

```
OBS → RTMP Ingest → POST /ingest/on-publish  → Room status = live
                                              → HLS written to storage/live/{stream_key}/
OBS Disconnect   → POST /ingest/on-publish-done → Room status = ended
                                                 → VOD at storage/vod/{stream_key}/
```

Storage layout:
```
storage/
├── live/{stream_key}/   ← Active HLS segments (index.m3u8 + *.ts)
├── vod/{stream_key}/    ← VOD recordings
├── thumbnails/
└── videos/              ← Short videos
```

---

## Realtime Chat (SSE)

```
Client → POST /api/rooms/{id}/chat        (send message, JWT required)
Client ← GET  /api/rooms/{id}/chat/stream (SSE stream, public)
```

Chat Hub (`pkg/chat/hub.go`):
- Ring buffer: 300 messages per room (circular, in-memory)
- Broadcast to all SSE subscribers on new message
- Non-blocking: slow clients are skipped, not blocked
- Cleanup: full state cleared when stream ends

---

## DI Wiring (main.go)

```go
// Repositories
userRepo     := repository.NewUserRepository(db)
identityRepo := repository.NewIdentityRepository(db)
roomRepo     := repository.NewRoomRepository(db)

// Services
authSvc   := service.NewAuthService(userRepo, identityRepo)
userSvc   := service.NewUserService(userRepo)
roomSvc   := service.NewRoomService(roomRepo)
searchSvc := service.NewSearchService(db)

// Shared
chatHub := chat.NewHub()

// Handlers
authHandler   := handler.NewAuthHandler(authSvc)
userHandler   := handler.NewUserHandler(userSvc)
roomHandler   := handler.NewRoomHandler(roomSvc)
chatHandler   := handler.NewChatHandler(chatHub)
ingestHandler := handler.NewIngestHandler(roomRepo, chatHub)
searchHandler := handler.NewSearchHandler(searchSvc)
```

---

## Adding a New Feature — Checklist

1. `internal/domain/{entity}.go` — struct + Repository + Service interfaces
2. `database.go` — add `db.AutoMigrate(&domain.NewEntity{})`
3. `internal/repository/{entity}_repository.go` — GORM implementation
4. `internal/service/{entity}_service.go` — business logic
5. `internal/handler/{entity}_handler.go` — HTTP handlers
6. `internal/router/router.go` — register routes
7. `cmd/server/main.go` — wire DI

---

## Environment Variables

| Key                | Default                         | Description                        |
| ------------------ | ------------------------------- | ---------------------------------- |
| `PORT`             | `3000`                          | Server listen port                 |
| `DB_FILE`          | `gostream.db`                   | SQLite file path                   |
| `JWT_SECRET`       | `change-me-in-production`       | JWT signing secret                 |
| `STORAGE_PATH`     | `./storage`                     | Root directory for file storage    |
| `STORAGE_BASE_URL` | `http://localhost:3000/storage` | Public base URL for static files   |
| `INGEST_SERVER_IP` | `127.0.0.1`                     | IP allowed to call ingest hooks    |

---

## Backend Absolute Rules

1. **No HTTP framework** — only `net/http` stdlib
2. **No code comments** — code must be self-explanatory
3. **Interface-first** — define interfaces in `domain/` before implementing
4. **Always return clear error responses** — never panic
5. **GORM Preload** — use `Preload()` for eager-loading relationships
6. **JSON tags** — every exported field must have `json:""` tag
7. **GORM tags** — use `gorm:""` for constraints (not null, size, uniqueIndex)
8. **Sensitive fields** — use `json:"-"` to hide (passwords, tokens, stream keys)
9. **Path params** — use `r.PathValue("key")` (Go 1.22+)
10. **Query params** — use `r.URL.Query().Get("key")`

---

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

---

## Commit Convention

```
feat:           new feature, page, or component
feat(...):      scoped new feature
style(...):     CSS, responsive, UI styling
refactor:       code logic changes or restructure
fix:            bug fixes
```

---

## Unimplemented Interfaces (Defined, Pending Implementation)

| Interface                 | File                        |
| ------------------------- | --------------------------- |
| `CategoryRepository`      | `domain/category.go`        |
| `CategoryService`         | `domain/category.go`        |
| `AuthorRepository`        | `domain/author.go`          |
| `AuthorService`           | `domain/author.go`          |
| `ShortVideoRepository`    | `domain/short_video.go`     |
| `ShortVideoService`       | `domain/short_video.go`     |
| `StreamSessionRepository` | `domain/stream_session.go`  |
| `StreamSessionService`    | `domain/stream_session.go`  |
