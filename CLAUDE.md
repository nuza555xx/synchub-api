# CLAUDE.md — Project Instructions for sync-hub

## Project Overview

**sync-hub** คือ Social Media Management Platform สำหรับจัดการหลาย Social Media จากที่เดียว รองรับ Facebook, Twitter (X), LinkedIn และ TikTok.

## Tech Stack

- **Backend:** Node.js with Koa.js (TypeScript)
- **Frontend:** React with Vite
- **Database:** Supabase (PostgreSQL, Auth, Storage)
- **Queue:** Redis (async post processing)
- **Encryption:** AES-256 for access tokens
- **Diagrams:** Mermaid.js

## Project Structure

```
sync-hub/
├── CLAUDE.md              # This file — project context for AI
├── requirement.md         # Full project requirements
├── api-spec.md            # API specification (all endpoints, request/response)
├── design/                # UI design references (HTML mockups)
│   ├── 1-Welcome.html
│   ├── 2-Sign In.html
│   ├── 3-Onboarding.html
│   ├── 4-Onboarding.html
│   └── 5-Social Integration.html
├── synchub-api/                   # Node.js + Koa.js backend (Clean Architecture)
│   ├── src/
│   │   ├── domain/                # Enterprise Business Rules (innermost layer)
│   │   │   ├── entities/          # Core entities (User, Post, Token, Comment)
│   │   │   ├── enums/             # Shared enums & constants
│   │   │   └── errors/            # Domain-specific error classes
│   │   ├── application/           # Application Business Rules
│   │   │   ├── use-cases/         # Use cases (CreatePost, SchedulePost, RefreshToken, etc.)
│   │   │   ├── interfaces/        # Port interfaces (repositories, external services)
│   │   │   └── dto/               # Data Transfer Objects (input/output)
│   │   ├── infrastructure/        # Frameworks & Drivers (outermost layer)
│   │   │   ├── database/          # Supabase client setup & config
│   │   │   ├── repositories/      # Repository implementations (Supabase queries)
│   │   │   ├── external-services/ # 3rd-party APIs (Facebook, Twitter, LinkedIn, TikTok)
│   │   │   ├── queue/             # Redis queue (Bull/BullMQ) for async processing
│   │   │   ├── encryption/        # AES-256 token encryption
│   │   │   └── logger/            # Activity logging
│   │   ├── interfaces/            # Interface Adapters
│   │   │   ├── http/
│   │   │   │   ├── routes/        # Koa router definitions
│   │   │   │   ├── controllers/   # Request handlers (call use cases)
│   │   │   │   ├── middleware/    # Koa middleware (auth, rate-limit, RBAC)
│   │   │   │   └── validators/    # Request validation (Joi / Zod)
│   │   │   └── webhook/           # Webhook handlers (real-time events)
│   │   └── config/                # App configuration (env, constants)
│   ├── app.ts                     # Koa app entry point & DI wiring
│   ├── tsconfig.json
│   └── package.json
└── synchub-web/           # React + Vite frontend
    ├── src/
    │   ├── components/    # Shared UI components
    │   └── lib/           # API clients, utilities
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Core Modules

### 1. Social Integration & Auth
- Multi-Platform OAuth: Facebook Login, Twitter OAuth, LinkedIn API, TikTok Business
- Permission Scoping: request only necessary permissions (`pages_manage_posts`, `instagram_basic`, etc.)
- Token Health Check: monitor token status (active / expired / revoked)

### 2. Unified Content Studio
- Smart Composer: single editor with split-view preview per platform
- Hashtag Manager: save frequently used hashtag groups
- Media Assets Library: centralized cloud storage with video transcoding
- Post Scheduling: drag-and-drop calendar

### 3. Engagement & Moderation
- Global Inbox: aggregated comments & mentions from all posts
- Sentiment Analysis (optional): detect positive/negative sentiment
- Quick Replies: template responses for common interactions

## User Roles (RBAC)

| Role      | Capabilities                                              |
| --------- | --------------------------------------------------------- |
| Admin     | Full access: API connections, team management, everything |
| Editor    | Create, edit, schedule posts (cannot delete)              |
| Moderator | Reply to / hide / delete inappropriate comments           |
| Viewer    | Read-only access to reports and analytics                 |

## Frontend Design Reference

**IMPORTANT:** เมื่อทำงานเกี่ยวกับ Frontend ให้อ่านไฟล์ HTML ในโฟลเดอร์ `design/` เป็น reference ก่อนเสมอ:

| File | Description |
| ---- | ----------- |
| `design/1-syncHub Dashboard - Welcome/` | หน้า Welcome / Landing |
| `design/2-syncHub Dashboard - Sign In.html` | หน้า Sign In |
| `design/3-syncHub Dashboard - Onboarding.html` | หน้า Onboarding (step 1) |
| `design/4-syncHub Dashboard - Onboarding.html` | หน้า Onboarding (step 2) |
| `design/5-syncHub Dashboard - Social Int.html` | หน้า Social Integration |

ไฟล์เหล่านี้คือ mockup HTML ที่แสดง layout, สี, typography และ component structure ที่ต้อง implement ใน `synchub-web/`.

## Technical Guidelines

### Security (CRITICAL)
- **Zero Secrets Policy:** NEVER hardcode secrets — use environment variables (`process.env`) and `.env` files.
- **Token Encryption:** All OAuth access tokens MUST be AES-256 encrypted before database storage.
- **Activity Logs:** All write operations (post, delete comment, etc.) must be logged with user identity and timestamp.

### Backend
- **API Response Format:** ทุก endpoint ใช้ format เดียวกัน: `{ status: <http_status>, code: <business_code>, message: <string>, result: <any> }`
- **Database:** Supabase เป็น repository layer — ใช้ `@supabase/supabase-js` สำหรับ query PostgreSQL, Auth และ Storage.
- Repository implementations อยู่ใน `infrastructure/repositories/` โดย implement interfaces จาก `application/interfaces/`.
- API Gateway handles per-platform rate limiting to prevent blocks.
- Webhook Listener for real-time comment/like notifications.
- Redis Queue for bulk post scheduling and async processing.

### Versioning
- Use LTS versions for all languages and frameworks.
- Fallback to latest stable if no LTS available.

### Development Workflow
- **Implementation only** — ไม่ต้องเขียน test ในขั้นตอนนี้ โฟกัสที่การ implement feature ตาม API spec.

### Frontend Component Reuse (CRITICAL)

**ห้ามเขียน raw HTML elements เมื่อมี base component ให้ใช้** — ต้องใช้ component จาก `src/components/base/` เสมอ

| Component | Import | Use Instead Of | Key Props |
|---|---|---|---|
| **Button** | `@/components/base/buttons/button` | `<button>` | `color`: primary, secondary, tertiary, link-gray, link-color, primary-destructive, secondary-destructive, tertiary-destructive, link-destructive. `size`: sm, md, lg, xl. `iconLeading`, `iconTrailing`, `isLoading`, `isDisabled` |
| **SocialButton** | `@/components/base/buttons/social-button` | Social login `<button>` | `social`: google, facebook, apple, twitter, figma, dribble. `theme`: brand, color, gray |
| **CloseButton** | `@/components/base/buttons/close-button` | Close/dismiss `<button>` | `size`: xs, sm, md, lg. `theme`: light, dark |
| **ButtonUtility** | `@/components/base/buttons/button-utility` | Small icon `<button>` | `icon`, `tooltip`, `size`: xs, sm |
| **ButtonGroup** | `@/components/base/button-group/button-group` | Toggle button groups | `size`: sm, md, lg |
| **Badge** | `@/components/base/badges/badges` | Status pills/tags | `color`: gray, brand, error, warning, success, etc. `type`: pillColor, badgeColor, badgeModern |
| **BadgeGroup** | `@/components/base/badges/badge-groups` | Badge with context | `color`, `theme`: light, modern |
| **Avatar** | `@/components/base/avatar/avatar` | User images | `size`: xxs–2xl. `status`: online, offline. `initials` fallback |
| **AvatarLabelGroup** | `@/components/base/avatar/avatar-label-group` | Avatar + name | `title`, `subtitle` |
| **Checkbox** | `@/components/base/checkbox/checkbox` | `<input type="checkbox">` | `size`: sm, md. `label`, `hint`, `isIndeterminate` |
| **RadioButton** | `@/components/base/radio-buttons/radio-buttons` | `<input type="radio">` | `size`: sm, md. `label`, `hint` |
| **Toggle** | `@/components/base/toggle/toggle` | Switch toggles | `size`: sm, md. `label`, `hint`, `slim` |
| **TextField / InputBase** | `@/components/base/input/input` | `<input type="text">` | `size`: sm, md. `icon`, `tooltip`, `shortcut` |
| **InputGroup** | `@/components/base/input/input-group` | Input + addons | `prefix`, `leadingAddon`, `trailingAddon`, `label`, `hint` |
| **TextArea** | `@/components/base/textarea/textarea` | `<textarea>` | `label`, `hint`, `tooltip`, `rows` |
| **Select / ComboBox** | `@/components/base/select/select` | `<select>` | `size`: sm, md. `placeholder`, `items` |
| **Dropdown** | `@/components/base/dropdown/dropdown` | Custom dropdowns | `Dropdown.Root`, `.Popover`, `.Menu`, `.Item`, `.Separator` |
| **ProgressBar** | `@/components/base/progress-indicators/progress-indicators` | Progress bars | `value`, `labelPosition`: right, bottom, top-floating |
| **Tag / TagGroup** | `@/components/base/tags/tags` | Selectable tags | `size`: sm, md, lg. `avatarSrc`, `dot`, `count` |
| **Tooltip** | `@/components/base/tooltip/tooltip` | Hover tooltips | `title`, `description`, `arrow`, `placement` |
| **Slider** | `@/components/base/slider/slider` | Range sliders | `minValue`, `maxValue`, `labelPosition` |
| **PinInput** | `@/components/base/pin-input/pin-input` | OTP inputs | `size`: sm, md, lg. `maxLength` |
| **Form** | `@/components/base/form/form` | `<form>` | Standard form attributes |
| **FileTrigger** | `@/components/base/file-upload-trigger/file-upload-trigger` | File uploads | `acceptedFileTypes`, `allowsMultiple` |
| **Label** | `@/components/base/input/label` | `<label>` | `isRequired`, `tooltip` |
| **HintText** | `@/components/base/input/hint-text` | Help/error text | `isInvalid` |

**Rules:**
1. ใช้ `Button` component แทน `<button>` ทุกกรณี — เลือก `color` variant ให้ตรงกับ context
2. ใช้ `Badge` แทน custom status pills — map สี: connected=success, warning=warning, error=error
3. ใช้ `Checkbox` แทน `<input type="checkbox">` — รวมถึง custom styled checkboxes
4. ใช้ `Avatar` / `AvatarLabelGroup` แทน `<img>` สำหรับ user images
5. ใช้ `Tooltip` component แทน custom hover tooltips
6. ใช้ `Dropdown` component แทน custom menu/popover
7. ใช้ `InputBase` / `InputGroup` / `TextArea` แทน raw input elements
8. Icons ใช้จาก `@untitledui/icons` เป็นหลัก, ใช้ `@fortawesome` เฉพาะ brand icons (social platforms)

## Commands

```bash
# Backend
cd synchub-api && pnpm install            # Install backend dependencies
cd synchub-api && pnpm dev                # Start backend dev server (ts-node / tsx)
cd synchub-api && pnpm build              # Compile TypeScript to dist/

# Frontend
cd synchub-web && pnpm install            # Install frontend dependencies
cd synchub-web && pnpm dev                # Start frontend dev server
cd synchub-web && pnpm build              # Production build
```
