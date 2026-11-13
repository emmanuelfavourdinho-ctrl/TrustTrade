# Frontend API integration contracts

The web app reads `NEXT_PUBLIC_API_BASE_URL` and sends requests with
`credentials: "include"`. Authentication uses an HTTP-only session cookie; the
frontend does not persist access tokens.

## Authentication

| Method | Path | Request | Successful response |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | `{ "email": "person@example.com", "password": "…" }` | `{ "message"?: "…", "user": { "id": "…", "role": "CUSTOMER \| ARTISAN \| ADMIN" } }` and a session cookie |
| `POST` | `/api/v1/auth/register` | `{ "fullName": "…", "email": "…", "password": "…", "role": "customer" \| "artisan" }` | `{ "message"?: "…" }` |
| `GET` | `/api/v1/auth/me` | Session cookie | `{ "id", "fullName", "username", "email", "role", "accountStatus" }` |
| `POST` | `/api/v1/auth/logout` | Session cookie | Revokes the session |
| `POST` | `/api/v1/auth/forgot-password` | `{ "email": "person@example.com" }` | Not configured by the backend (501) |

Validation errors should use `400` or `422`; unauthenticated requests should
use `401`; forbidden actions should use `403`; rate-limited requests should
use `429`. Error response internals are not shown to users.

The authenticated app shell checks `/auth/me` before rendering protected
content. Customer, artisan and administrator routes are gated in the frontend;
the API remains authoritative for all protected operations.

## Professional discovery

`GET /api/v1/artisans?query={text}&category={category}&locality={locality}`
returns an array of active professional search results. The UI uses returned
identity-review states only; it explicitly states that identity review is not
a service-quality guarantee.

`GET /api/v1/artisans/{username}` returns a public profile with biography,
service areas, verification status, avatar/cover and portfolio data.

`GET /api/v1/artisans/catalog/categories` returns active categories and their
skills. `GET /api/v1/artisans/catalog/locations` returns active localities.
`PATCH /api/v1/artisans/me/profile` accepts professional title, biography,
experience, skill IDs and service-area IDs. The current public profile read
does not provide all editable IDs/values needed to safely prefill an editor;
the frontend does not submit incomplete updates.

## Customer feed and artisan publishing

Authenticated `GET /api/v1/posts?limit=&cursor=&locality=` returns a
cursor-paginated feed with author, artisan verification state, location, media,
like/comment counts and the current user's like state. The `/feed` page uses
this response and supports pagination, refresh and liking. `POST`/`DELETE`
`/api/v1/posts/{postId}/like` persists likes.

`POST /api/v1/posts` accepts `{ content, locationId, mediaIds? }`. The API
requires an active artisan with approved verification and a location in their
service areas. The create-post UI also checks verification for clear feedback,
but relies on the API for enforcement.

`GET /api/v1/verification/me` returns the artisan's current status and recent
application decisions. `POST /api/v1/verification/applications` accepts
multipart fields `documentType`, `document` and `selfie`; verification files
remain private. The artisan verification UI displays server status and submits
files to this endpoint.

Administrators can use `GET /api/v1/admin/verifications?limit=` to retrieve
pending applications, download private files through
`GET /api/v1/admin/verifications/{id}/documents/{document|selfie}`, and record
an approve, reject or resubmission decision with a reason. The admin UI uses
these endpoints and does not expose document URLs publicly.

## Public media upload

`uploadMedia(file, purpose)` in `apps/web/src/lib/api/media.ts` requests a
short-lived signed authorization, uploads the file directly to Cloudinary,
then asks the API to verify and persist the returned asset identifiers. The
Cloudinary API secret is never sent to the browser. Allowed purposes are
`PROFILE_AVATAR`, `PROFILE_COVER`, `ARTISAN_PORTFOLIO`, and `POST`; the API
applies account, role, content type, size, ownership and upload-context checks.

Profile and portfolio attachments use `attachProfileMedia` and
`addPortfolioMedia`. Professional post creation accepts `mediaIds` through the
media upload workflow; the API still requires an active, approved, validly
verified artisan.

## Backend capabilities not yet available

The current backend does not expose messaging, saved professionals/posts,
notifications, reviews, subscriptions, account settings/password changes,
reporting/blocking, general user management, post moderation or audit-log
endpoints. Corresponding route entries explain that the feature is not
connected; they do not display fabricated records or success states.

Password reset is also not operational until the backend provides reset-token
and password-update endpoints. Artisan profile and service-area editing remain
unavailable in the UI until the backend can return enough current editable
values to prefill a safe update.
