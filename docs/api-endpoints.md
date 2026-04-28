# API Endpoints Documentation

## Missing Models in schema.prisma

These models are used in the API but **not defined** in the current schema:

| Model       | Used In                                             |
| ----------- | --------------------------------------------------- |
| EmotionType | `/api/users/[id]/communities/[community]/dashboard` |

---

## Users (10 endpoints)

| Method | Route                                            | Description                        | Auth     |
| ------ | ------------------------------------------------ | ---------------------------------- | -------- |
| GET    | `/api/users`                                     | List users with communities (paginated) | userApiAuth |
| POST   | `/api/users`                                     | Create user + Firebase auth        | userApiAuth |
| PUT    | `/api/users/[id]`                                | Update profile (name, image)       | withAuth |
| DELETE | `/api/users/[id]`                                | Delete user (manual cascade ~10 tables) | withAuth |
| PUT    | `/api/users/[id]/image`                          | Update profile image               | withAuth |
| GET    | `/api/users/[id]/exists`                         | Check if user exists               | withAuth |
| GET    | `/api/users/uid/[uid]`                           | Get full user data by Firebase UID | withAuth |
| GET    | `/api/users/[id]/recognitions/received`          | Recognitions received by user      | withAuth |
| GET    | `/api/users/[id]/recognitions/sent`              | Recognitions sent by user          | withAuth |
| GET    | `/api/users/[id]/communities/[community]`        | User membership in a community     | withAuth |
| GET    | `/api/users/[id]/communities/[community]/dashboard` | User community dashboard stats  | withAuth |

---

## Communities (9 endpoints)

| Method | Route                            | Description                                    | Auth     |
| ------ | -------------------------------- | ---------------------------------------------- | -------- |
| GET    | `/api/communities`               | List communities (paginated, with member preview) | withAuth |
| POST   | `/api/communities`               | Create community + initial cycle + membership  | withAuth |
| PUT    | `/api/communities`               | Update community details                       | withAuth |
| GET    | `/api/communities/[id]`          | Get community details                          | withAuth |
| POST   | `/api/communities/[id]`          | Create invite to community + push notification | withAuth |
| PUT    | `/api/communities/[id]`          | Update community details                       | withAuth |
| GET    | `/api/communities/[id]/info`     | Members count, cycles count, total rads        | withAuth |
| GET    | `/api/communities/[id]/members`  | List active members with user details          | withAuth |
| POST   | `/api/communities/join`          | Join community directly (Pusher broadcast)     | withAuth |
| POST   | `/api/communities/join-invite`   | Join via invite code (Pusher broadcast)        | withAuth |
| DELETE | `/api/communities/leave`         | Leave community (soft delete, cascade if empty) | withAuth |

---

## Recognitions (3 endpoints)

| Method | Route                       | Description                                      | Auth     |
| ------ | --------------------------- | ------------------------------------------------ | -------- |
| POST   | `/api/recognitions`         | Create recognition (send rads)                   | withAuth |
| GET    | `/api/recognitions/[id]`    | Get recognition with sender/community details    | withAuth |
| POST   | `/api/recognitions/message` | Create recognition with message + push notification | withAuth |

---

## Rads (3 endpoints)

| Method | Route                    | Description                                     | Auth       |
| ------ | ------------------------ | ----------------------------------------------- | ---------- |
| POST   | `/api/rads`              | Send batch rads (transaction)                   | withAuth   |
| POST   | `/api/rads/update-cycles`| Cron: distribute rads & advance cycles          | **NONE**   |
| GET    | `/api/rads/send-balance` | **DISABLED** (returns 400)                      | -          |

> **Security risk**: `/api/rads/update-cycles` has no authentication. Anyone can trigger cycle distribution.

---

## Talks (1 file, 3 methods)

| Method | Route        | Description                              | Auth     |
| ------ | ------------ | ---------------------------------------- | -------- |
| POST   | `/api/talks` | Create talk + push notification          | withAuth |
| PUT    | `/api/talks` | Edit talk description                    | withAuth |
| DELETE | `/api/talks` | Mark talk as completed (`drank = true`)  | withAuth |

---

## Notifications (2 endpoints)

| Method | Route                        | Description                            | Auth     |
| ------ | ---------------------------- | -------------------------------------- | -------- |
| GET    | `/api/notifications`         | Get user notifications (last month, paginated) | withAuth |
| POST   | `/api/notifications/device`  | Register/update FCM device token       | withAuth |

---

## Feedback (1 endpoint)

| Method | Route            | Description              | Auth     |
| ------ | ---------------- | ------------------------ | -------- |
| POST   | `/api/feedback`  | Submit feedback or report | withAuth |

---

## Dashboard (2 endpoints)

| Method | Route                      | Description                                  | Auth     |
| ------ | -------------------------- | -------------------------------------------- | -------- |
| GET    | `/api/dashboard/members`   | Simplified community member list             | withAuth |
| GET    | `/api/dashboard/memberdb`  | Individual member stats & sentiment analysis | withAuth |

---

## Utility / Disabled (3 endpoints)

| Method | Route                            | Description                  | Auth | Status       |
| ------ | -------------------------------- | ---------------------------- | ---- | ------------ |
| -      | `/api/socket`                    | Socket.io real-time handler  | None | Active       |
| -      | `/api/dev/add-field`             | Dev migration utility        | -    | **DISABLED** |
| -      | `/api/test`                      | Test utilities               | -    | **DISABLED** |
| GET    | `/api/users/[id]/guest-talks`    | Get talks where user is guest | -   | **DISABLED** |
| GET    | `/api/rads/send-balance`         | Send balance from cycle      | -    | **DISABLED** |
| GET    | `/api/user-communities/[id]/person` | Get person data           | -    | **DISABLED** |

---

## Key Observations

1. **Security**: `/api/rads/update-cycles` is a public endpoint with no auth -- meant for cron jobs but exploitable.
2. **Manual cascading deletes**: `DELETE /api/users/[id]` manually deletes across ~10 tables. With SQL Server, use `ON DELETE CASCADE` in the schema instead.
3. **Real-time**: Uses both **Pusher** (broadcasting events) and **Socket.io** (WebSocket connections).
4. **Push notifications**: Firebase Cloud Messaging via `UserDevice.fcmToken`.
5. **1 Prisma model is missing** from `schema.prisma` (EmotionType).
6. **5 endpoints are disabled** and return 400.
7. **Authentication**: Two middleware variants -- `withAuth` (general) and `userApiAuth` (user CRUD only).

---

## Stats

- **Total API files**: 30
- **Active endpoints**: ~25
- **Disabled endpoints**: 5
- **Unauthenticated endpoints**: 2 (update-cycles, socket)
- **Models referenced**: 11 (10 in schema + 1 missing)