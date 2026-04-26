# syncHub API Specification

> **Base URL:** `http://localhost:3000/api/v1`
>
> **Auth:** Supabase Auth — ทุก request (ยกเว้น Auth endpoints) ต้องส่ง `Authorization: Bearer <supabase_access_token>`
>
> **Organization Context:** Org-scoped endpoints ต้องส่ง `X-Organization-Id: <uuid>` header
>
> **Database:** Supabase PostgreSQL

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User & Team Management](#2-user--team-management)
3. [Social Accounts (OAuth Integration)](#3-social-accounts-oauth-integration)
4. [Posts & Scheduling](#4-posts--scheduling)
5. [Hashtag Manager](#5-hashtag-manager)
6. [Media Assets](#6-media-assets)
7. [Engagement (Comments & Inbox)](#7-engagement-comments--inbox)
8. [Quick Replies (Templates)](#8-quick-replies-templates)
9. [Activity Logs](#9-activity-logs)
10. [Webhooks](#10-webhooks)
11. [Organizations](#11-organizations)
12. [Plans](#12-plans)

---

## Common Response Format

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "Description of the result",
  "result": { ... }
}
```

### Paginated Response

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "List retrieved",
  "result": {
    "items": [ ... ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

### Error Response

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Description of the error",
  "result": null
}
```

### HTTP Status Codes

| Code | Meaning                |
| ---- | ---------------------- |
| 200  | OK                     |
| 201  | Created                |
| 204  | No Content (deleted)   |
| 400  | Bad Request            |
| 401  | Unauthorized           |
| 403  | Forbidden (RBAC)       |
| 404  | Not Found              |
| 429  | Rate Limited           |
| 500  | Internal Server Error  |

---

## 1. Authentication

> ใช้ Supabase Auth โดยตรง — Backend เป็น proxy/wrapper เพื่อจัดการ session และ role

### POST `/auth/signup`

สร้างบัญชีใหม่ผ่าน Supabase Auth

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`

```json
{
  "status": 201,
  "code": "SUCCESS",
  "message": "Signup successful",
  "result": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### POST `/auth/login`

Login ด้วย email/password → return Supabase session

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "Login successful",
  "result": {
    "accessToken": "eyJ...",
    "refreshToken": "abc...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### POST `/auth/logout`

Revoke current session

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "Logout successful",
  "result": null
}
```

### POST `/auth/refresh`

Refresh access token

**Request Body:**

```json
{
  "refreshToken": "abc..."
}
```

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "Token refreshed",
  "result": {
    "accessToken": "eyJ...",
    "refreshToken": "new_abc...",
    "expiresIn": 3600
  }
}
```

### GET `/auth/me`

ดึงข้อมูล user ปัจจุบัน

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "User profile retrieved",
  "result": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://...",
    "role": "admin",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

---

## 2. User & Team Management

> **RBAC:** Admin only (ยกเว้น GET `/users/me`)

### GET `/team/members`

ดึงรายชื่อสมาชิกในทีม

**Query Params:** `?page=1&limit=20&role=editor`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "email": "editor@example.com",
      "fullName": "Jane Doe",
      "role": "editor",
      "status": "active",
      "invitedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

### POST `/team/invite`

เชิญสมาชิกเข้าทีม 🔒 Admin

**Request Body:**

```json
{
  "email": "newmember@example.com",
  "role": "editor"
}
```

**Response:** `201 Created`

### PATCH `/team/members/:userId/role`

เปลี่ยน role ของสมาชิก 🔒 Admin

**Request Body:**

```json
{
  "role": "moderator"
}
```

**Response:** `200 OK`

### DELETE `/team/members/:userId`

ลบสมาชิกออกจากทีม 🔒 Admin

**Response:** `204 No Content`

---

## 3. Social Accounts (OAuth Integration)

> เชื่อมต่อ/จัดการ Social Media accounts — Token เข้ารหัส AES-256 ก่อนเก็บ DB

### GET `/social-accounts`

ดึงรายการ social accounts ที่เชื่อมต่อ

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "platform": "facebook",
      "accountName": "My Page",
      "accountId": "123456",
      "avatarUrl": "https://...",
      "permissions": ["pages_manage_posts", "pages_read_engagement"],
      "tokenStatus": "active",
      "tokenExpiresAt": "2026-06-01T00:00:00Z",
      "connectedAt": "2026-01-15T00:00:00Z"
    }
  ]
}
```

### GET `/social-accounts/:id/health`

ตรวจสอบสถานะ Token ของ account นั้น

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "platform": "facebook",
    "tokenStatus": "active",
    "expiresAt": "2026-06-01T00:00:00Z",
    "permissions": ["pages_manage_posts"],
    "missingPermissions": []
  }
}
```

### POST `/social-accounts/connect/:platform`

เริ่มกระบวนการ OAuth → redirect ไปหน้า authorize ของ platform

**Platforms:** `facebook` | `twitter` | `linkedin` | `tiktok`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
  }
}
```

### GET `/social-accounts/callback/:platform`

OAuth callback — รับ authorization code, แลก token, เข้ารหัส AES-256, เก็บ DB

**Query Params:** `?code=xxx&state=yyy`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "id": "uuid",
    "platform": "facebook",
    "accountName": "My Page",
    "tokenStatus": "active"
  }
}
```

### POST `/social-accounts/:id/refresh-token`

Refresh OAuth token 🔒 Admin

**Response:** `200 OK`

### DELETE `/social-accounts/:id`

ยกเลิกการเชื่อมต่อ social account 🔒 Admin

**Response:** `204 No Content`

---

## 4. Posts & Scheduling

> 🔒 Admin, Editor สามารถสร้าง/แก้ไข/ตั้งเวลาโพสต์ | Admin เท่านั้นที่ลบโพสต์ได้

### GET `/posts`

ดึงรายการโพสต์

**Query Params:** `?page=1&limit=20&status=scheduled&platform=facebook&from=2026-01-01&to=2026-03-31`

**Status:** `draft` | `scheduled` | `publishing` | `published` | `failed`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "content": "Hello World! #synchub",
      "platforms": [
        {
          "platform": "facebook",
          "socialAccountId": "uuid",
          "status": "published",
          "publishedAt": "2026-03-15T10:00:00Z",
          "externalPostId": "fb_12345"
        },
        {
          "platform": "twitter",
          "socialAccountId": "uuid",
          "status": "scheduled",
          "scheduledAt": "2026-03-16T10:00:00Z"
        }
      ],
      "media": [
        {
          "id": "uuid",
          "type": "image",
          "url": "https://...supabase.co/storage/v1/...",
          "thumbnailUrl": "https://..."
        }
      ],
      "hashtagGroupId": "uuid",
      "createdBy": {
        "id": "uuid",
        "fullName": "John Doe"
      },
      "createdAt": "2026-03-14T08:00:00Z",
      "updatedAt": "2026-03-14T09:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

### GET `/posts/:id`

ดึงรายละเอียดโพสต์

**Response:** `200 OK`

### POST `/posts`

สร้างโพสต์ใหม่ (draft หรือ scheduled) 🔒 Admin, Editor

**Request Body:**

```json
{
  "content": "Hello World! #synchub",
  "platforms": [
    {
      "platform": "facebook",
      "socialAccountId": "uuid"
    },
    {
      "platform": "twitter",
      "socialAccountId": "uuid"
    }
  ],
  "mediaIds": ["uuid", "uuid"],
  "hashtagGroupId": "uuid",
  "scheduledAt": "2026-03-20T10:00:00Z",
  "status": "scheduled"
}
```

**Response:** `201 Created`

### PATCH `/posts/:id`

แก้ไขโพสต์ (เฉพาะ draft/scheduled) 🔒 Admin, Editor

**Request Body:** (partial update)

```json
{
  "content": "Updated content",
  "scheduledAt": "2026-03-21T14:00:00Z"
}
```

**Response:** `200 OK`

### PATCH `/posts/:id/reschedule`

ย้ายวัน-เวลาโพสต์ (Drag & Drop calendar) 🔒 Admin, Editor

**Request Body:**

```json
{
  "scheduledAt": "2026-03-22T09:00:00Z"
}
```

**Response:** `200 OK`

### POST `/posts/:id/publish`

โพสต์ทันที (ส่งเข้า Redis queue) 🔒 Admin, Editor

**Response:** `202 Accepted`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "id": "uuid",
    "status": "publishing",
    "jobId": "queue_job_123"
  }
}
```

### DELETE `/posts/:id`

ลบโพสต์ 🔒 Admin only

**Response:** `204 No Content`

### GET `/posts/calendar`

ดึงโพสต์สำหรับแสดงบนปฏิทิน

**Query Params:** `?month=2026-03&platform=facebook`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "content": "Hello...",
      "platforms": ["facebook", "twitter"],
      "scheduledAt": "2026-03-20T10:00:00Z",
      "status": "scheduled"
    }
  ]
}
```

### GET `/posts/:id/preview`

Preview โพสต์แยกตาม platform (character limit, image crop)

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "facebook": {
      "content": "Hello World! #synchub",
      "charCount": 21,
      "charLimit": 63206,
      "mediaPreview": [{ "url": "...", "dimensions": "1200x630" }]
    },
    "twitter": {
      "content": "Hello World! #synchub",
      "charCount": 21,
      "charLimit": 280,
      "mediaPreview": [{ "url": "...", "dimensions": "1200x675" }]
    }
  }
}
```

---

## 5. Hashtag Manager

> 🔒 Admin, Editor

### GET `/hashtag-groups`

ดึงกลุ่ม Hashtag ทั้งหมด

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "name": "Marketing Campaign",
      "hashtags": ["#marketing", "#digital", "#synchub"],
      "usageCount": 15,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/hashtag-groups`

สร้างกลุ่ม Hashtag ใหม่

**Request Body:**

```json
{
  "name": "Marketing Campaign",
  "hashtags": ["#marketing", "#digital", "#synchub"]
}
```

**Response:** `201 Created`

### PATCH `/hashtag-groups/:id`

แก้ไขกลุ่ม Hashtag

**Response:** `200 OK`

### DELETE `/hashtag-groups/:id`

ลบกลุ่ม Hashtag

**Response:** `204 No Content`

---

## 6. Media Assets

> ใช้ Supabase Storage — 🔒 Admin, Editor

### GET `/media`

ดึงรายการ media ทั้งหมด

**Query Params:** `?page=1&limit=20&type=image|video`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "filename": "banner.jpg",
      "type": "image",
      "mimeType": "image/jpeg",
      "sizeBytes": 245000,
      "url": "https://...supabase.co/storage/v1/object/public/media/banner.jpg",
      "thumbnailUrl": "https://...",
      "dimensions": { "width": 1200, "height": 630 },
      "transcodingStatus": null,
      "uploadedBy": { "id": "uuid", "fullName": "John Doe" },
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 30 }
}
```

### POST `/media/upload`

อัปโหลดไฟล์ไปยัง Supabase Storage (multipart/form-data)

**Request:** `Content-Type: multipart/form-data`

| Field  | Type   | Description                     |
| ------ | ------ | ------------------------------- |
| `file` | File   | ไฟล์ media (image/video)         |

**Response:** `201 Created`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "id": "uuid",
    "filename": "promo.mp4",
    "type": "video",
    "url": "https://...supabase.co/storage/v1/...",
    "transcodingStatus": "processing"
  }
}
```

### GET `/media/:id/transcode-status`

ตรวจสอบสถานะ video transcoding

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "status": "completed",
    "variants": {
      "facebook": { "url": "https://...", "format": "mp4", "resolution": "1080p" },
      "twitter": { "url": "https://...", "format": "mp4", "resolution": "720p" },
      "tiktok": { "url": "https://...", "format": "mp4", "resolution": "1080p" }
    }
  }
}
```

### DELETE `/media/:id`

ลบ media 🔒 Admin

**Response:** `204 No Content`

---

## 7. Engagement (Comments & Inbox)

> Global Inbox — 🔒 Admin, Moderator สามารถตอบ/ซ่อน/ลบ | Viewer อ่านได้อย่างเดียว

### GET `/inbox`

ดึง comments & mentions จากทุก platform (Global Inbox)

**Query Params:** `?page=1&limit=20&platform=facebook&sentiment=negative&status=unread`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "platform": "facebook",
      "type": "comment",
      "postId": "uuid",
      "externalCommentId": "fb_comment_123",
      "author": {
        "name": "Fan User",
        "avatarUrl": "https://...",
        "profileUrl": "https://..."
      },
      "content": "Great post!",
      "sentiment": "positive",
      "status": "unread",
      "parentCommentId": null,
      "createdAt": "2026-03-15T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150 }
}
```

### PATCH `/inbox/:id/read`

Mark comment เป็น read

**Response:** `200 OK`

### POST `/inbox/:id/reply`

ตอบ comment 🔒 Admin, Moderator

**Request Body:**

```json
{
  "content": "Thank you for your feedback!",
  "quickReplyId": "uuid"
}
```

**Response:** `201 Created`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "id": "uuid",
    "content": "Thank you for your feedback!",
    "repliedAt": "2026-03-15T12:30:00Z"
  }
}
```

### PATCH `/inbox/:id/hide`

ซ่อน comment 🔒 Admin, Moderator

**Response:** `200 OK`

### DELETE `/inbox/:id`

ลบ comment 🔒 Admin, Moderator

**Response:** `204 No Content`

### GET `/inbox/stats`

สรุปสถิติ inbox

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": {
    "totalUnread": 25,
    "byPlatform": {
      "facebook": 10,
      "twitter": 8,
      "linkedin": 5,
      "tiktok": 2
    },
    "bySentiment": {
      "positive": 15,
      "negative": 5,
      "neutral": 5
    }
  }
}
```

---

## 8. Quick Replies (Templates)

> 🔒 Admin, Moderator

### GET `/quick-replies`

ดึงรายการ template สำหรับตอบ comment

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "title": "Thank You",
      "content": "Thank you for your feedback! We appreciate it.",
      "usageCount": 42,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/quick-replies`

สร้าง template ใหม่

**Request Body:**

```json
{
  "title": "Thank You",
  "content": "Thank you for your feedback! We appreciate it."
}
```

**Response:** `201 Created`

### PATCH `/quick-replies/:id`

แก้ไข template

**Response:** `200 OK`

### DELETE `/quick-replies/:id`

ลบ template

**Response:** `204 No Content`

---

## 9. Activity Logs

> 🔒 Admin only (read) — logs ถูกสร้างอัตโนมัติจากทุก write operation

### GET `/activity-logs`

ดึงประวัติการใช้งาน

**Query Params:** `?page=1&limit=50&user_id=uuid&action=post.create&from=2026-03-01&to=2026-03-31`

**Response:** `200 OK`

```json
{
  "status": 200,
  "code": "SUCCESS",
  "message": "OK",
  "result": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "editor@example.com",
        "fullName": "Jane Doe"
      },
      "action": "post.create",
      "resourceType": "post",
      "resourceId": "uuid",
      "details": {
        "platforms": ["facebook", "twitter"],
        "status": "scheduled"
      },
      "ipAddress": "xxx.xxx.xxx.xxx",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 200 }
}
```

### Action Types

| Action                      | Description                    |
| --------------------------- | ------------------------------ |
| `post.create`               | สร้างโพสต์                      |
| `post.update`               | แก้ไขโพสต์                      |
| `post.delete`               | ลบโพสต์                        |
| `post.publish`              | โพสต์ทันที                      |
| `post.schedule`             | ตั้งเวลาโพสต์                   |
| `comment.reply`             | ตอบ comment                    |
| `comment.hide`              | ซ่อน comment                   |
| `comment.delete`            | ลบ comment                     |
| `social_account.connect`    | เชื่อมต่อ social account        |
| `social_account.disconnect` | ยกเลิกเชื่อมต่อ                 |
| `team.invite`               | เชิญสมาชิก                     |
| `team.remove`               | ลบสมาชิก                       |
| `team.role_change`          | เปลี่ยน role                   |

---

## 10. Webhooks

> รับ events จาก Social Platforms แบบ real-time — ไม่ต้อง auth (verify ด้วย platform signature)

### POST `/webhooks/facebook`

รับ webhook จาก Facebook (comments, likes, reactions)

**Verification:** `GET` request with `hub.verify_token`

### POST `/webhooks/twitter`

รับ webhook จาก Twitter/X (mentions, replies)

### POST `/webhooks/linkedin`

รับ webhook จาก LinkedIn

### POST `/webhooks/tiktok`

รับ webhook จาก TikTok

---

## Database Schema (Supabase PostgreSQL)

### Tables Overview

| Table               | Description                               |
| ------------------- | ----------------------------------------- |
| `profiles`          | User profile (extends Supabase auth.users)|
| `team_members`      | Team membership & roles                   |
| `social_accounts`   | Connected social media accounts           |
| `posts`             | Post content                              |
| `post_platforms`    | Per-platform post status & metadata       |
| `hashtag_groups`    | Saved hashtag groups                      |
| `media_assets`      | Uploaded media files (refs Supabase Storage)|
| `post_media`        | Post ↔ Media junction table               |
| `inbox_items`       | Comments & mentions from all platforms    |
| `quick_replies`     | Reply templates                           |
| `activity_logs`     | Audit trail for all write operations       |

### Key Relationships

```
auth.users (Supabase)
  └─ profiles (1:1)
  └─ team_members (1:N)

social_accounts (N per team)
  └─ post_platforms (1:N)
  └─ inbox_items (1:N)

posts (1:N post_platforms)
  └─ post_media (N:M → media_assets)
  └─ hashtag_groups (N:1)

inbox_items
  └─ quick_replies (reference for reply)
```

---

## Organization Context Header

ทุก endpoint ที่มี 🔒 (ยกเว้น Auth, Plans, และ Organization list/create) ต้องส่ง header:

```
X-Organization-Id: <uuid>
```

Middleware จะ validate membership และ load plan limits เข้า context

---

## 11. Organizations

### GET `/organizations`

List organizations ที่ user เป็นสมาชิก 🔒 Auth only (ไม่ต้อง X-Organization-Id)

**Response:** `200 OK`

```json
{
  "result": [
    {
      "id": "uuid",
      "name": "My Workspace",
      "slug": "my-workspace",
      "ownerId": "uuid",
      "role": "admin",
      "plan": {
        "id": "uuid",
        "name": "free",
        "displayName": "Free"
      },
      "memberCount": 1,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/organizations`

สร้าง organization ใหม่ 🔒 Auth only

**Request Body:**

```json
{
  "name": "My Agency",
  "slug": "my-agency"
}
```

**Response:** `201 Created`

```json
{
  "result": {
    "id": "uuid",
    "name": "My Agency",
    "slug": "my-agency",
    "ownerId": "uuid",
    "plan": { "id": "uuid", "name": "free", "displayName": "Free" },
    "memberCount": 1,
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### PATCH `/organizations/:id`

Update organization 🔒 Requires `org.update` permission (admin)

**Headers:** `X-Organization-Id: <uuid>`

**Request Body:**

```json
{
  "name": "Updated Name",
  "slug": "updated-slug"
}
```

**Response:** `200 OK`

### DELETE `/organizations/:id`

Delete organization 🔒 Requires `org.delete` permission (admin, owner only)

**Headers:** `X-Organization-Id: <uuid>`

**Response:** `200 OK`

### GET `/organizations/:id/members`

List members 🔒 Requires `team.view` permission

**Headers:** `X-Organization-Id: <uuid>`

**Response:** `200 OK`

```json
{
  "result": [
    {
      "id": "uuid",
      "userId": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "admin",
      "status": "active",
      "joinedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/organizations/:id/members`

Invite member 🔒 Requires `team.invite` permission (admin). Plan limit enforced.

**Headers:** `X-Organization-Id: <uuid>`

**Request Body:**

```json
{
  "email": "newmember@example.com",
  "role": "editor"
}
```

**Response:** `201 Created`

### PATCH `/organizations/:id/members/:memberId/role`

Change member role 🔒 Requires `team.change_role` permission (admin)

**Headers:** `X-Organization-Id: <uuid>`

**Request Body:**

```json
{
  "role": "moderator"
}
```

**Response:** `200 OK`

### DELETE `/organizations/:id/members/:memberId`

Remove member 🔒 Requires `team.remove` permission (admin)

**Headers:** `X-Organization-Id: <uuid>`

**Response:** `200 OK`

---

## 12. Plans

### GET `/plans`

List all available plans (public, no auth required)

**Response:** `200 OK`

```json
{
  "result": [
    {
      "id": "uuid",
      "name": "free",
      "displayName": "Free",
      "price": 0,
      "billingCycle": "monthly",
      "limits": {
        "maxMembers": 1,
        "maxSocialAccounts": 3,
        "maxPostsPerMonth": 30,
        "maxScheduledPosts": 10,
        "maxMediaStorageMb": 500
      },
      "features": {
        "analytics": false,
        "bulkScheduling": false,
        "teamCollaboration": false,
        "prioritySupport": false,
        "customBranding": false,
        "apiAccess": false
      }
    }
  ]
}
```

---

## RBAC Permissions

| Permission | Allowed Roles |
|---|---|
| `org.update` | admin |
| `org.delete` | admin |
| `team.view` | admin, editor, moderator, viewer |
| `team.invite` | admin |
| `team.change_role` | admin |
| `team.remove` | admin |
| `social.view` | admin, editor, moderator, viewer |
| `social.connect` | admin |
| `social.disconnect` | admin |
| `social.refresh` | admin, editor |
| `post.view` | admin, editor, moderator, viewer |
| `post.create` | admin, editor |
| `post.edit` | admin, editor |
| `post.delete` | admin |
| `post.publish` | admin, editor |
| `post.schedule` | admin, editor |
| `activity_log.view` | admin |

---

## Error Codes (Organization & Plan)

| Code | HTTP | Description |
|---|---|---|
| `ORG400001` | 400 | Invalid organization input |
| `ORG400002` | 400 | Organization slug already taken |
| `ORG404001` | 404 | Organization not found |
| `ORG403001` | 403 | Not a member of this organization |
| `ORG403002` | 403 | Insufficient permissions |
| `TEAM400001` | 400 | Invalid member input |
| `TEAM404001` | 404 | Member not found |
| `TEAM409001` | 409 | User already a member |
| `PLAN404001` | 404 | Plan not found |
| `PLAN403001` | 403 | Feature not available on current plan |
| `PLAN403002` | 403 | Plan limit reached |

---

## Rate Limiting

| Endpoint Group       | Limit              |
| -------------------- | ------------------ |
| Auth                 | 10 req/min         |
| Posts (write)        | 30 req/min         |
| Posts (read)         | 100 req/min        |
| Media upload         | 10 req/min         |
| Inbox                | 60 req/min         |
| Social OAuth         | 5 req/min          |
