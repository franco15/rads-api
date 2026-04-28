# Prisma Schema Analysis & MongoDB to SQL Server Migration Guide

## Current State

- **Database**: MongoDB
- **Provider**: `mongodb` via Prisma
- **Models**: 10 tables
- **Preview Features**: `interactiveTransactions` (no longer needed in modern Prisma for SQL Server)

---

## Table-by-Table Analysis

### 1. User (`Users`)

| Column    | Type     | Constraints                       |
| --------- | -------- | --------------------------------- |
| id        | String   | PK, auto-generated ObjectId       |
| uid       | String   | Unique (external auth identifier) |
| firstName | String   |                                   |
| lastName  | String   |                                   |
| email     | String   |                                   |
| rads      | Float    | Default: 0                        |
| role      | String?  | Nullable, Default: "user"         |
| image     | String   | Default: ""                       |
| createdAt | DateTime | Default: now()                    |
| updatedAt | DateTime | Auto-updated                      |

**Relations (1-to-many):**

- `notifications` -> Notification[]
- `userCommunities` -> UserCommunity[]
- `invitesSent` -> Invite[] (as inviter)
- `invitesReceived` -> Invite[] (as invitee)
- `feedback` -> Feedback[]
- `userDevices` -> UserDevice[]

**Purpose:** Central user entity. Stores authentication info (`uid` from an external provider like Firebase), profile data, and a global `rads` balance.

**Recommendations for SQL Server:**

- `role` should be an **enum or a lookup table** instead of a free-form string. Currently nothing prevents invalid values like "superadmin" or typos. In SQL Server, use either a `CHECK` constraint or a `Role` reference table.
- `email` should have a **unique constraint**. There is currently no uniqueness on email, which could allow duplicate accounts.
- `rads` (Float) should be `Decimal` in SQL Server to avoid floating-point precision issues with currency/point values. Prisma maps this to `@db.Decimal(10, 2)` for SQL Server.
- `image` default `""` is fine, but consider making it **nullable** (`String?`) instead. An empty string and null have different semantics -- null = "no image set" is more idiomatic in SQL.

---

### 2. Community (`Communities`)

| Column      | Type     | Constraints                 |
| ----------- | -------- | --------------------------- |
| id          | String   | PK, auto-generated ObjectId |
| createdAt   | DateTime | Default: now()              |
| updatedAt   | DateTime | Auto-updated                |
| name        | String   |                             |
| description | String   |                             |
| image       | String   |                             |
| total       | Int      | Default: 1                  |

**Relations (1-to-many):**

- `members` -> UserCommunity[]
- `invite` -> Invite[]
- `cycle` -> Cycle[]

**Purpose:** Represents a group/community that users can join. Has cycles (time periods) for distributing rads.

**Recommendations for SQL Server:**

- `total` is a **denormalized member count**. This is fine for read performance, but it can drift out of sync. Consider adding a comment or documentation noting it must be updated whenever members join/leave, or compute it via a view/query instead.
- `name` should likely have a **unique constraint** to prevent duplicate community names.
- Add an `active` or `deleted` (soft-delete) Boolean field if communities can be deactivated.

---

### 3. Talk (`Talks`)

| Column      | Type      | Constraints                 |
| ----------- | --------- | --------------------------- |
| id          | String    | PK, auto-generated ObjectId |
| createdAt   | DateTime  | Default: now()              |
| updatedAt   | DateTime  | Auto-updated                |
| date        | DateTime? | Nullable                    |
| description | String?   | Nullable                    |
| drank       | Boolean   | Default: false              |
| senderId    | String    | FK -> UserCommunity.id      |
| receiverId  | String    | FK -> UserCommunity.id      |

**Relations:**

- `sender` -> UserCommunity (many-to-one, "talkSent")
- `receiver` -> UserCommunity (many-to-one, "talkReceived")

**Purpose:** Represents a 1-on-1 interaction ("talk" / coffee chat) between two members of a community. `drank` likely tracks whether the meeting actually happened.

**Recommendations for SQL Server:**

- The `date` field is nullable, which is fine (scheduled vs. unscheduled talks). Consider renaming to `scheduledDate` for clarity.
- `drank` is a confusing name. Consider renaming to `completed` or `occurred` for better readability.
- Add a **composite index** on `(senderId, receiverId)` for query performance when looking up talks between two people.
- Consider adding a **check constraint** to prevent `senderId = receiverId` (a person talking to themselves).

---

### 4. UserCommunity (`UserCommunities`)

| Column      | Type     | Constraints                 |
| ----------- | -------- | --------------------------- |
| id          | String   | PK, auto-generated ObjectId |
| createdAt   | DateTime | Default: now()              |
| updatedAt   | DateTime | Auto-updated                |
| userId      | String   | FK -> User.id               |
| communityId | String   | FK -> Community.id          |
| rads        | Float    | Default: 0                  |
| active      | Boolean  | Default: true               |

**Relations:**

- `user` -> User (many-to-one)
- `community` -> Community (many-to-one)
- `feedback` -> Feedback[] (1-to-many)
- `talksSent` -> Talk[] (1-to-many)
- `talksReceived` -> Talk[] (1-to-many)
- `radsSent` -> Rad[] (1-to-many)
- `radsReceived` -> Rad[] (1-to-many)
- `recognitionsSent` -> Recognition[] (1-to-many)
- `recognitionsReceived` -> Recognition[] (1-to-many)

**Purpose:** **Junction/pivot table** between User and Community. This is the core entity -- most activity (talks, rads, recognitions) happens through this membership record, not directly through User or Community.

**Recommendations for SQL Server:**

- **Critical**: Add a `@@unique([userId, communityId])` constraint to prevent a user from having duplicate memberships in the same community. This is essential for data integrity.
- `rads` (Float) -> Change to `Decimal` for the same precision reasons as User.rads.
- This table is the **most heavily referenced** entity. Ensure proper **indexing** on `userId` and `communityId` for SQL Server performance (Prisma creates FK indexes automatically for SQL Server, but verify).

---

### 5. Cycle (`Cycles`)

| Column      | Type     | Constraints                 |
| ----------- | -------- | --------------------------- |
| id          | String   | PK, auto-generated ObjectId |
| createdAt   | DateTime | Default: now()              |
| updatedAt   | DateTime | Auto-updated                |
| closed      | Boolean  | Default: false              |
| startDate   | DateTime |                             |
| endDate     | DateTime |                             |
| rads        | Int      |                             |
| duration    | Int      |                             |
| status      | Int      |                             |
| communityId | String   | FK -> Community.id          |

**Relations:**

- `community` -> Community (many-to-one)

**Purpose:** Represents a time period during which rads are distributed within a community. Each cycle has a start/end date, a total rads budget, and a status.

**Recommendations for SQL Server:**

- `status` (Int) is a **magic number**. Use an **enum** in Prisma (which maps to a `NVARCHAR` with `CHECK` constraint on SQL Server, or you can keep it as Int with a comment). Example:
  ```prisma
  enum CycleStatus {
    PENDING
    ACTIVE
    CLOSED
  }
  ```
  Note: Prisma on SQL Server does not natively support enums -- they get stored as strings. Alternatively, keep `Int` but document the values, or create a `CycleStatus` lookup table.
- `duration` might be redundant if it can be computed from `endDate - startDate`. If it represents something different (e.g., working days), keep it but clarify with a comment.
- `closed` is also potentially redundant with `status`. If status already has a "closed" state, remove `closed` to avoid conflicting data (e.g., `closed = true` but `status = ACTIVE`).
- Add a **check constraint**: `endDate > startDate`.

---

### 6. Rad (`Rads`)

| Column     | Type     | Constraints                 |
| ---------- | -------- | --------------------------- |
| id         | String   | PK, auto-generated ObjectId |
| createdAt  | DateTime | Default: now()              |
| updatedAt  | DateTime | Auto-updated                |
| rads       | Int      |                             |
| senderId   | String   | FK -> UserCommunity.id      |
| receiverId | String   | FK -> UserCommunity.id      |
| sent       | Boolean  | Default: false              |

**Relations:**

- `sender` -> UserCommunity (many-to-one, "radsSent")
- `receiver` -> UserCommunity (many-to-one, "radsReceived")

**Purpose:** A record of rads (points/currency) sent from one community member to another. The `sent` flag likely indicates whether the transfer has been finalized/processed.

**Recommendations for SQL Server:**

- Add a **check constraint**: `rads > 0` to prevent zero or negative transfers.
- Add a **check constraint**: `senderId != receiverId` to prevent self-transfers.
- Consider adding a `cycleId` FK to link rad transfers to specific cycles. Without this, there's no way to know which cycle a rad transfer belongs to (you'd have to infer from dates).
- `sent` naming is ambiguous -- consider `processed` or `finalized`.

---

### 7. Notification (`Notifications`)

| Column      | Type     | Constraints                 |
| ----------- | -------- | --------------------------- |
| id          | String   | PK, auto-generated ObjectId |
| description | String   |                             |
| createdAt   | DateTime | Default: now()              |
| userId      | String   | FK -> User.id               |
| read        | Boolean  |                             |
| parameters  | String   |                             |
| type        | Int      |                             |

**Relations:**

- `user` -> User (many-to-one)

**Purpose:** In-app notifications for users. `parameters` is likely a JSON string with dynamic data, and `type` categorizes the notification.

**Recommendations for SQL Server:**

- `read` is a **reserved keyword** in SQL Server. **You must rename this column** or it will cause issues. Rename to `isRead` or use `@@map` to map the Prisma field to a different DB column name:
  ```prisma
  isRead Boolean @map("is_read")
  ```
- `parameters` (String containing JSON) -- In SQL Server, consider using `NVARCHAR(MAX)` explicitly. If you want to query inside the JSON, SQL Server supports `JSON_VALUE()` functions on `NVARCHAR` columns.
- `type` (Int) -- same magic number issue as Cycle.status. Use an enum or document the values.
- `read` should have a **default value** of `false`. Currently it has no default, which means it's required on creation -- likely a bug.
- Add an **index** on `(userId, read)` for the common query "get unread notifications for user".

---

### 8. Recognition (`Recognitions`)

| Column     | Type     | Constraints                 |
| ---------- | -------- | --------------------------- |
| id         | String   | PK, auto-generated ObjectId |
| note       | String   |                             |
| createdAt  | DateTime | Default: now()              |
| emotion    | Int      |                             |
| senderId   | String   | FK -> UserCommunity.id      |
| receiverId | String   | FK -> UserCommunity.id      |

**Relations:**

- `sender` -> UserCommunity (many-to-one, "recognitionSent")
- `receiver` -> UserCommunity (many-to-one, "recognitionReceived")

**Purpose:** Peer recognition messages between community members. `emotion` categorizes the type of recognition (e.g., thankful, inspired, etc.).

**Recommendations for SQL Server:**

- `emotion` (Int) -- magic number. Use an enum or lookup table to make values self-documenting.
- Consider adding a **check constraint**: `senderId != receiverId`.

---

### 9. Invite (`Invites`)

| Column      | Type     | Constraints                 |
| ----------- | -------- | --------------------------- |
| id          | String   | PK, auto-generated ObjectId |
| createdAt   | DateTime | Default: now()              |
| code        | String   |                             |
| inviterId   | String   | FK -> User.id               |
| inviteeId   | String   | FK -> User.id               |
| communityId | String   | FK -> Community.id          |
| joined      | Boolean  | Default: false              |

**Relations:**

- `inviter` -> User (many-to-one, "invites_sent")
- `invitee` -> User (many-to-one, "invites_received")
- `community` -> Community (many-to-one)

**Purpose:** Invitation system where one user invites another to join a specific community. `code` is the invite code/token, `joined` tracks if the invitee accepted.

**Recommendations for SQL Server:**

- `code` should have a **unique constraint** to prevent duplicate invite codes.
- Consider adding an `expiresAt` DateTime field for invite expiration.
- Add a **unique constraint** on `(inviteeId, communityId)` to prevent sending multiple invites to the same person for the same community.

---

### 10. Feedback

| Column          | Type     | Constraints                      |
| --------------- | -------- | -------------------------------- |
| id              | String   | PK, auto-generated ObjectId      |
| createdAt       | DateTime | Default: now()                   |
| description     | String   |                                  |
| userId          | String   | FK -> User.id                    |
| report          | Boolean  |                                  |
| userCommunityId | String?  | Nullable, FK -> UserCommunity.id |

**Relations:**

- `user` -> User (many-to-one)
- `userCommunity` -> UserCommunity? (many-to-one, optional)

**Purpose:** User feedback or reports. Can be general (no community context) or specific to a community membership. `report` flag likely distinguishes feedback from abuse reports.

**Recommendations for SQL Server:**

- Missing `@@map("Feedbacks")` -- this is the only model without a collection name mapping. Add `@@map("Feedbacks")` for consistency.
- `report` should have a **default value** (likely `false`).

---

### 11. UserDevice (`UserDevices`)

| Column    | Type     | Constraints                  |
| --------- | -------- | ---------------------------- |
| id        | String   | PK, auto-generated ObjectId  |
| createdAt | DateTime | Default: now()               |
| updatedAt | DateTime | Default: now(), auto-updated |
| userId    | String   | FK -> User.id                |
| fcmToken  | String   |                              |
| deviceId  | String   | Unique                       |

**Relations:**

- `user` -> User (many-to-one)

**Purpose:** Stores Firebase Cloud Messaging tokens per device for push notifications. One user can have multiple devices.

**Recommendations for SQL Server:**

- No major issues. Model is clean.
- Consider adding an index on `fcmToken` if you ever need to look up devices by token (e.g., for token refresh/dedup).

---

## Entity Relationship Summary

```
User (1) ----< (N) UserCommunity (N) >---- (1) Community
  |                     |                        |
  |                     |--- (N) Talk (sender)    |--- (N) Cycle
  |                     |--- (N) Talk (receiver)  |--- (N) Invite
  |                     |--- (N) Rad (sender)
  |                     |--- (N) Rad (receiver)
  |                     |--- (N) Recognition (sender)
  |                     |--- (N) Recognition (receiver)
  |                     |--- (N) Feedback
  |
  |--- (N) Notification
  |--- (N) Invite (as inviter)
  |--- (N) Invite (as invitee)
  |--- (N) Feedback
  |--- (N) UserDevice
```

**Key relationship pattern:** `UserCommunity` is the central pivot. Almost all activity (Talk, Rad, Recognition) flows through `UserCommunity`, not directly through `User` or `Community`. This is a solid design that scopes all interactions to a specific membership.

---

## Critical Migration Changes (MongoDB -> SQL Server)

### 1. Provider & ID Strategy

```prisma
// BEFORE (MongoDB)
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
// IDs: @default(auto()) @map("_id") @db.ObjectId

// AFTER (SQL Server)
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
// IDs: @default(cuid()) or @default(uuid()) or @default(autoincrement())
```

**Recommendation:** Use `Int @id @default(autoincrement())` for SQL Server. Auto-increment integers are:

- More performant for joins and indexing in SQL Server
- Smaller storage footprint (4 bytes vs 24+ bytes for ObjectId strings)
- Natural for SQL databases

If you need globally unique IDs (e.g., for APIs), use `String @id @default(uuid())` instead.

### 2. Remove MongoDB-Specific Attributes

All `@db.ObjectId` annotations must be removed. All `@map("_id")` must be removed. These are MongoDB-specific.

### 3. `read` Column Rename (Notification)

`read` is a reserved keyword in SQL Server. Rename to `isRead`.

### 4. Float -> Decimal

All `Float` fields storing rads/points should become `Decimal` to avoid precision issues:

```prisma
rads Decimal @default(0) @db.Decimal(10, 2)
```

### 5. Remove `previewFeatures`

`interactiveTransactions` is stable in modern Prisma and doesn't need a preview flag.

### 6. Collection Name Mappings

The `@@map()` directives can stay (they just set the SQL table name), but remove underscores and verify the names follow your SQL Server naming convention.

### 7. Add Missing Constraints (New Opportunities with SQL Server)

MongoDB with Prisma has limited constraint support. SQL Server lets you properly enforce:

- **Unique constraints**: `@@unique([userId, communityId])` on UserCommunity
- **Unique on email**: `@unique` on User.email
- **Unique on invite code**: `@unique` on Invite.code
- **Check constraints** (via raw SQL migrations): senderId != receiverId, rads > 0, endDate > startDate
- **Indexes**: Add `@@index` on frequently queried FK columns

### 8. Enums / Magic Numbers

Replace magic integers with either:

- Prisma enums (stored as `NVARCHAR` in SQL Server)
- Int columns with `CHECK` constraints and documented values
- Lookup/reference tables

Affected fields: `Cycle.status`, `Notification.type`, `Recognition.emotion`, `User.role`

---

## Migration Checklist

- [ ] Change `provider` from `mongodb` to `sqlserver`
- [ ] Change all IDs from `String @db.ObjectId` to `Int @default(autoincrement())` or `String @default(uuid())`
- [ ] Remove all `@map("_id")` and `@db.ObjectId` annotations
- [ ] Remove `previewFeatures = ["interactiveTransactions"]`
- [ ] Remove `binaryTargets` if deploying to Windows/standard targets
- [ ] Rename `Notification.read` to `Notification.isRead`
- [ ] Change `Float` fields to `Decimal` for rads
- [ ] Add `@@unique([userId, communityId])` on UserCommunity
- [ ] Add `@unique` on User.email
- [ ] Add `@unique` on Invite.code
- [ ] Add default for `Notification.isRead` (`@default(false)`)
- [ ] Add default for `Feedback.report` (`@default(false)`)
- [ ] Add `@@map("Feedbacks")` on Feedback model
- [ ] Convert magic numbers to enums or document them
- [ ] Plan data migration script (export MongoDB -> transform IDs -> import to SQL Server)
- [ ] Update connection string format for SQL Server: `sqlserver://host:port;database=name;user=sa;password=pwd;encrypt=true`

analizar api, usar prompt que dijo el gpt
