# Go Stream API Reference

Tài liệu này là API contract hiện tại để làm web/mobile app. Base URL local qua Nginx là `http://localhost`.

## Quy ước chung

- Request/response dùng JSON, trừ endpoint upload dùng `multipart/form-data`.
- API thành công trả về:

```json
{
  "status": true,
  "statusCode": 200,
  "data": {}
}
```

- API lỗi trả về:

```json
{
  "status": false,
  "statusCode": 400,
  "message": "Error message"
}
```

- Endpoint có ký hiệu `Auth` cần header:

```http
Authorization: Bearer <access_token>
```

- Endpoint có ký hiệu `Admin` yêu cầu access token của user có `role = admin`.
- Access token lấy từ login hoặc refresh. Refresh token nằm trong HttpOnly cookie.
- Main API dùng `/api/...`; Analytics API cũng được Nginx proxy qua `/api/analytics/...`.

## Luồng xác thực

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | `{ "name", "email", "password" }` |
| POST | `/api/auth/login` | No | `{ "email", "password" }`; trả `{ user, access_token }` và set refresh cookie |
| POST | `/api/auth/refresh` | Cookie | Trả access token mới, đồng thời xoay refresh cookie |
| POST | `/api/auth/logout` | Cookie | Xoá refresh session/cookie |
| GET | `/api/auth/me` | Auth | Trả user hiện tại |

### Route frontend auth

- `/login`: trang đăng nhập độc lập, gọi `POST /api/auth/login`.
- `/register`: trang đăng ký độc lập, gọi `POST /api/auth/register`, sau đó tự đăng nhập.
- Không dùng SSO redirect hoặc auth modal trong frontend hiện tại.

## User và hồ sơ streamer

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/users` | No | Danh sách user |
| GET | `/api/users/{id}` | No | Chi tiết user |
| POST | `/api/authors/apply` | Auth | `{ "display_name", "bio", "category_ids": [1, 2] }` |
| PUT | `/api/authors/me/profile` | Auth | `multipart/form-data`: `name`, `bio`, `avatar` (ảnh), `cover` (ảnh) |
| GET | `/api/admin/authors?status=&limit=&offset=` | Admin | Danh sách ứng viên streamer |
| PUT | `/api/admin/authors/{id}/approve` | Admin | Phê duyệt streamer |
| PUT | `/api/admin/authors/{id}/reject` | Admin | Từ chối streamer |

## Room và streaming

`visibility`: `public`, `private`, `unlisted`.

`status`: `offline`, `ready`, `live`, `ended`.

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/rooms?category_id=&game_id=` | No | Chỉ trả public room đang live |
| GET | `/api/rooms/{id}` | No | Chi tiết room |
| GET | `/api/streamers/{slug}` | No | Room mới nhất của streamer theo slug |
| GET | `/api/rooms/{id}/playback` | No | Trả `{ type: "live", playback_url }` hoặc `{ type: "vod", vod_url }` |
| POST | `/api/rooms/{id}/heartbeat` | No | `{ "viewer_session_id": "uuid" }`; trả viewer count |
| GET | `/api/rooms/me` | Auth | Danh sách room của user hiện tại |
| POST | `/api/rooms` | Auth | `{ "title", "description", "category_id", "game_id", "tag_ids", "visibility" }` |
| PUT | `/api/rooms/{id}` | Auth | Cùng payload create; chỉ chủ room được sửa |
| DELETE | `/api/rooms/{id}` | Auth | Chỉ chủ room |
| GET | `/api/rooms/{id}/stream-key` | Auth | Chỉ chủ room; không lưu/lộ key ra public |
| POST | `/api/rooms/{id}/live` | Auth | Chuyển room sang `ready`; room live khi RTMP ingest xác nhận |
| POST | `/api/rooms/{id}/end` | Auth | Dừng room |

### RTMP ingest nội bộ

Hai endpoint sau chỉ dành cho Nginx RTMP/ingest server, không gọi từ app client:

| Method | Path | Body |
| --- | --- | --- |
| POST | `/ingest/on-publish` | Form/query `name=<stream_key>` |
| POST | `/ingest/on-publish-done` | Form/query `name=<stream_key>` |

## Chat realtime

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/rooms/{id}/chat/stream` | No | SSE. Mỗi event là một chat/gift message JSON |
| POST | `/api/rooms/{id}/chat` | Auth | `{ "content": "hello", "type": "text" }` |

Chat message tối đa 500 ký tự. App client phải reconnect SSE khi mất kết nối và chỉ render text an toàn, không chèn bằng `innerHTML`.

## Video ngắn của author

Video upload được lưu local trong bản MVP. Chỉ user đã đăng nhập và đang follow author đích mới có thể đăng video vào kênh đó. File tối đa 100 MB, hỗ trợ `.mp4`, `.webm`, `.mov`.

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/videos/feed?limit=&offset=` | No | Feed video đã publish |
| GET | `/api/authors/{slug}/videos?limit=&offset=` | No | Video đã publish của một kênh |
| GET | `/api/videos/{id}` | No | Chi tiết một video đã publish |
| POST | `/api/videos` | Auth | `multipart/form-data`: `author_slug`, `video`, `title` bắt buộc; user phải follow author này |
| PUT | `/api/videos/{id}` | Auth | `multipart/form-data`: `title`, `description`, `thumbnail`, `status` (`published`/`private`), `tag_ids` (CSV); chỉ người đăng được sửa |
| DELETE | `/api/videos/{id}` | Auth | Chỉ người đăng được xoá |
| POST | `/api/videos/{id}/view` | No | Ghi nhận lượt xem |
| POST | `/api/rooms/{id}/clips` | Auth | `{ "title": "...", "description": "...", "duration_seconds": 10..60 }`; chỉ user đang follow author của live. Render MP4 từ HLS gần nhất rồi publish vào kênh author |
| POST | `/api/authors/{slug}/follow` | Auth | Follow kênh; mở quyền đăng video vào kênh |
| DELETE | `/api/authors/{slug}/follow` | Auth | Bỏ follow kênh |
| GET | `/api/authors/{slug}/follow-status` | Auth | Trả `{ "following": true/false }` |

## Wallet, check-in và donate

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/wallet/balance` | Auth | Số dư coin hiện tại |
| GET | `/api/wallet/check-in/status` | Auth | Lịch check-in tuần hiện tại |
| POST | `/api/wallet/check-in` | Auth | Nhận thưởng check-in ngày |
| POST | `/api/rooms/{roomId}/donate` | Auth | `{ "gift_type": <gift_id>, "message": "..." }` |

Khi donate thành công, chat SSE gửi một message có `type: "gift"`, `coin`, `gift_type`, `user_name`, `content`. Dùng event này để cập nhật donation alert/OBS overlay.

## Gifts

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/gifts` | No | Danh sách quà và giá coin |
| GET | `/api/gifts/{id}` | No | Chi tiết quà |
| POST | `/api/admin/gifts` | Admin | `multipart/form-data`: `name`, `coin_price`, `image` |
| PUT | `/api/admin/gifts/{id}` | Admin | `multipart/form-data`: `name`, `coin_price`, `image` (optional) |
| DELETE | `/api/admin/gifts/{id}` | Admin | Xoá quà |

## Category, game và tag

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| GET | `/api/categories` | No | Danh sách category |
| GET | `/api/categories/{id}` | No | Category theo ID |
| GET | `/api/category/slug/{slug}` | No | Category theo slug |
| GET | `/api/categories/{id}/games` | No | Danh sách game của category |
| POST | `/api/categories` | Auth | JSON hoặc multipart: `name`, `slug`, `type`, `description`, `icon` |
| PUT | `/api/categories/{id}` | Auth | JSON hoặc multipart như create |
| POST | `/api/categories/{id}/games` | Auth | `{ "name", "slug", "cover_image", "description" }` |
| GET | `/api/tags` | No | Danh sách tag |
| GET | `/api/tags/{id}` | No | Tag theo ID |
| POST | `/api/tags` | Auth | Tạo tag |
| DELETE | `/api/tags/{id}` | Auth | Xoá tag |
| GET | `/api/rooms/{id}/tags` | No | Tag của room |
| PUT | `/api/rooms/{id}/tags` | Auth | Đồng bộ tag room |
| GET | `/api/videos/{id}/tags` | No | Tag của short video |
| PUT | `/api/videos/{id}/tags` | Auth | Đồng bộ tag short video |

> Các route quản trị category/tag hiện chỉ yêu cầu Auth ở backend. App client nên chỉ hiển thị UI quản trị cho admin; backend nên tăng cường `Admin` middleware trước khi production.

## Poll

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| POST | `/api/rooms/{roomId}/polls` | Auth | Tạo poll, chủ room/moderator theo rule backend |
| GET | `/api/rooms/{roomId}/polls/active` | No | Poll đang hoạt động |
| POST | `/api/polls/{id}/vote` | Auth | Vote poll |
| POST | `/api/polls/{id}/end` | Auth | Kết thúc poll |

## Prediction

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| POST | `/api/rooms/{roomId}/predictions` | Auth | Tạo prediction |
| GET | `/api/rooms/{roomId}/predictions/active` | No | Prediction hiện tại |
| POST | `/api/predictions/{id}/bet` | Auth | Đặt cược coin |
| POST | `/api/predictions/{id}/lock` | Auth | Khoá đặt cược |
| POST | `/api/predictions/{id}/resolve` | Auth | Chọn kết quả/payout |
| POST | `/api/predictions/{id}/cancel` | Auth | Huỷ và hoàn coin |

## Moderation

| Method | Path | Auth | Body / ghi chú |
| --- | --- | --- | --- |
| POST | `/api/rooms/{roomId}/moderators` | Auth | `{ "email": "viewer@example.com" }`; chỉ chủ room |
| DELETE | `/api/rooms/{roomId}/moderators` | Auth | `{ "user_id": 123 }`; chỉ chủ room |
| POST | `/api/rooms/{roomId}/ban` | Auth | `{ "target_user_id": 123, "reason": "..." }` |
| DELETE | `/api/rooms/{roomId}/ban/{id}` | Auth | Bỏ ban user |
| POST | `/api/rooms/{roomId}/timeout` | Auth | `{ "target_user_id": 123, "duration_sec": 600, "reason": "..." }` |
| GET | `/api/rooms/{roomId}/users/{userId}/mute-status` | No | Trạng thái mute/ban |

## Search

| Method | Path | Auth | Ghi chú |
| --- | --- | --- | --- |
| GET | `/api/search?q=<keyword>&limit=<n>` | No | Global search; trả `{ rooms, authors, games }` |

`rooms` chỉ gồm room public đang `live`. Frontend dùng endpoint này cho:

- Search type-ahead ở header: chỉ tìm khi có ít nhất 2 ký tự, debounce 300ms, hiện tối đa 3 item cho mỗi nhóm.
- Trang kết quả đầy đủ tại `/search?q=<keyword>`.

## Notification live

- Khi RTMP ingest xác nhận một room bắt đầu live, Main API publish Kafka event `stream.started` vào topic `stream-events`.
- Notification service hiện consume event này để log; chưa có REST API, storage notification, follow graph hoặc realtime push tới browser.
- Frontend header tạm thời poll `GET /api/rooms?status=live` mỗi 20 giây cho user đã đăng nhập. Snapshot đầu chỉ dùng làm mốc; room mới live sau đó sẽ xuất hiện trong dropdown notification của phiên trình duyệt hiện tại.
- Cơ chế hiện tại thông báo cho mọi user đang mở web, không chỉ follower; notification mất khi refresh. Muốn production realtime cần thêm bảng follow, persistence và SSE/WebSocket hoặc push service.

## Analytics

| Method | Path | Auth | Ghi chú |
| --- | --- | --- | --- |
| GET | `/api/analytics/rooms/{roomId}` | No | `{ room_id, chat_count }` |
| GET | `/api/analytics/rooms/{roomId}/donors?limit=10` | No | Top donor phiên live |
| GET | `/api/analytics/rooms/{roomId}/chatters?limit=10` | No | Top chatter phiên live |
| GET | `/api/analytics/leaderboard/streamers?metric=donate&period=daily&limit=10` | No | `metric`: `viewers`, `donate`, `chat`; period: `daily`, `weekly`, `monthly`, `yearly` |
| GET | `/api/analytics/leaderboard/streamers/{streamerId}?metric=donate&period=weekly` | No | Rank của streamer |

## OBS donation overlay

Mở Browser Source với URL:

```text
http://localhost:3000/overlay/{roomId}?position=bottom-center&theme=neon&duration=7
```

- `position`: `top-left`, `top-center`, `top-right`, `center`, `bottom-left`, `bottom-center`, `bottom-right`
- `theme`: `neon`, `gold`, `minimal`
- `duration`: 3–15 giây

OBS chạy khác máy phải dùng IP/domain public thay cho `localhost` và backend/chat SSE cũng phải truy cập được từ máy OBS.

## Checklist khi code app client

- Lưu access token an toàn; gọi `/api/auth/refresh` bằng cookie khi token hết hạn.
- Gửi `credentials: include` cho login, refresh và logout.
- Không hiển thị stream key, refresh token hoặc Authorization header ra UI/log.
- Luôn kiểm tra `status` và `statusCode`, không chỉ HTTP status.
- Dùng SSE reconnect/backoff cho chat và donation overlay.
- Chỉ render UI admin khi role là `admin`; UI streamer khi role là `author`.
- Với upload, không tự đặt `Content-Type`; để browser tạo multipart boundary.
