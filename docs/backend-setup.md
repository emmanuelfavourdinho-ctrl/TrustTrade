# TrustTrade API setup

The API is a modular Express application backed by PostgreSQL 18, PostGIS and
Prisma 7. The public API is versioned under `/api/v1`; success and error
responses use `{ success, data, message? }` and
`{ success: false, error: { code, message } }` envelopes.

## Local setup

1. Install Node.js 22.12 or newer and PostgreSQL 18 with PostGIS 3.6.
2. Create an application database and a least-privilege application role.
3. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`,
   `DIRECT_URL`, and `WEB_ORIGIN`. For local PostgreSQL, `DATABASE_URL` and
   `DIRECT_URL` can use the same connection string. The application connects
   with `DATABASE_URL`; Prisma CLI migrations use `DIRECT_URL`. To enable public
   media, also configure the three Cloudinary
   credentials and both signed upload preset names described below; these are
   optional for starting the API. Separately
   copy `apps/web/.env.example` to `apps/web/.env` and set
   `NEXT_PUBLIC_API_BASE_URL`. Never put database credentials, Cloudinary
   credentials, administrator credentials, private storage paths or session
   secrets in the web environment; `NEXT_PUBLIC_*` values are shipped to
   browsers.
4. Run `npm install`.
5. Run `npm run db:generate --workspace=@trusttrade/api`.
6. Apply migrations with `npm run db:migrate --workspace=@trusttrade/api`.
7. Seed initial Buea and service-category catalog entries with
   `npm run db:seed --workspace=@trusttrade/api`.
8. Start the API with `npm run dev:api`.

The API listens on port 4000 by default. Liveness is at `/health/live`,
database readiness at `/health/ready`, and OpenAPI UI at `/api-docs`.
`POST /api/v1/auth/forgot-password` deliberately returns
`PASSWORD_RESET_NOT_CONFIGURED` until an email provider and one-time reset
token storage are implemented; it does not pretend to send a message.

## Administrator provisioning

Set `ADMIN_EMAIL`, `ADMIN_FULL_NAME`, and a one-time
`ADMIN_INITIAL_PASSWORD` (at least 12 characters) in the process environment,
then run `npm run admin:create --workspace=@trusttrade/api`. The CLI refuses
to modify an existing account. Do not put initial credentials in source
control or use this mechanism for ordinary registration.

## First implemented flows

- Customer and artisan registration, Argon2id password hashing, opaque
  database-backed sessions and HTTP-only cookies.
- Active artisan profile management and public profile/search APIs.
- Buea service locality and service category catalog.
- Private identity document and selfie uploads for verification, with
  content-signature checks, generated storage names and administrator-only
  download routes.
- Administrator verification decisions with reviewer identity, decision
  history and immutable audit log entries.
- Database-trigger and service-enforced artisan publishing authorization.
- Authenticated paginated feed, likes and comments.
- Signed direct-to-Cloudinary public uploads for user avatars/covers, artisan
  portfolio images, and artisan post images/videos. The API verifies Cloudinary
  asset metadata and signed ownership context before storing references.

## Public media storage

The API uses `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` only on the server. No credentials are present in the
web example or frontend bundle. Cloudinary settings may be left blank while
developing; configure all three credentials together and each matching signed
preset to enable uploads. Missing configuration disables uploads with an
explicit `MEDIA_STORAGE_NOT_CONFIGURED` response rather than preventing the
rest of the API from starting.

Create two **signed** Cloudinary upload presets before enabling uploads:

- The image preset must cap files at 10 MiB and allow only JPEG, PNG and WebP.
- The video preset must cap files at 100 MiB and allow only MP4 and WebM.
- Keep both presets restricted to upload media; do not allow raw files or
  caller-controlled transformations/folders.

The API records a 65-minute upload intent for one generated public ID, user,
purpose and folder. Cloudinary upload signatures remain valid for up to one
hour; the additional five minutes let cleanup run after signature expiry. The
browser uploads directly to Cloudinary and then sends only the returned
`public_id` and `asset_id` to the API. The API
loads the asset through Cloudinary's authenticated Admin API, checks its
resource type, format, size, dimensions, delivery host and signed ownership
context, and then persists metadata. Image uploads are limited to 10 MiB and
50 megapixels; videos to 100 MiB. Invalid assets are deleted. The API limits
each authenticated account to 10 sign/complete requests per 15 minutes.

`Media` contains Cloudinary identifiers, delivery URL and metadata only. Post
media links to that model; artisan portfolio entries and profile avatar/cover
fields reference it. Existing profile URL columns and post storage keys are
preserved for migration compatibility; new uploads do not write binaries,
base64 data or those legacy fields. Profile thumbnails/covers, portfolio and
feed URLs use Cloudinary automatic format/quality and bounded responsive
transformations.

Run `npm run media:cleanup --workspace=@trusttrade/api` from a scheduled job.
It deletes expired, unconfirmed uploads and unreferenced media after a
24-hour attachment grace period. Failed deletions remain marked for retry and
cause a non-zero job exit. Run it at least hourly; each invocation processes
up to 100 of each kind.

Identity documents and verification selfies remain on the existing separate
private storage path (`PRIVATE_STORAGE_DIR`), never in public Cloudinary
folders. The directory is mode `0700`; document downloads require an
administrator session and each access is recorded in the audit log. For a
multi-instance production deployment, mount a durable private volume or
configure a private object-storage adapter and set an approved retention policy
before launch; that migration is separate from public media storage.

No identity database, facial recognition, service checkout, escrow, service
commission, or fake review mechanism is implemented. Password-reset email
delivery, Redis-backed distributed sessions/rate limits, messaging, calls,
subscriptions, reports and expanded moderation remain future work. The
current web app has no authenticated upload UI; `apps/web/src/lib/api/media.ts`
provides the signed browser upload and profile/portfolio API client for those
screens.

The current rate limiter is process-local. Deployments with multiple API
instances must configure a shared Redis-backed limiter before public launch.
Run `npm run typecheck:api`, `npm run lint:api`, `npm run test:api`,
`npm run build:api`, `npm run typecheck:web`, and `npm run build:web` for
backend and browser integration checks. API media tests mock Cloudinary and do
not perform or claim real uploads.

## Render API with Supabase PostgreSQL

Set these variables in the Render API service:

- `DATABASE_URL`: Supabase PostgreSQL connection string for the running API.
  Use the Supabase **Session pooler** connection string (port `5432`) when
  Render cannot reach the database's direct IPv6 endpoint. Copy the full URI
  from Supabase's Connect dialog and require SSL (`sslmode=require`).
- `DIRECT_URL`: Supabase direct database connection string for Prisma
  migrations, with `sslmode=require`. If Render cannot reach Supabase's direct
  endpoint, use the **Session pooler** connection string (port `5432`) here as
  well. The session pooler is suitable for `prisma migrate deploy`.
- `WEB_ORIGIN`: The deployed Vercel frontend's origin, for example
  `https://your-app.vercel.app`. Set this to the exact public frontend origin;
  the API uses it for credentialed CORS and to validate mutation request
  origins. Production session cookies use `SameSite=None; Secure` so browsers
  can send them when the frontend and API are on different sites. For the most
  reliable browser support, configure the frontend and API on the same
  registrable domain (for example, `app.example.com` and `api.example.com`),
  since some browsers block third-party cookies even when `SameSite=None` is
  set.
- `NODE_ENV`: `production`.

Render provides `PORT` to the service; no manual value is needed. Supabase
connection strings contain database credentials: enter them as secret Render
environment variables, URL-encode special characters in the password, and do
not commit or expose them in frontend variables. Enable PostGIS in Supabase
before the first migration: the initial migration creates a geography column
before its `CREATE EXTENSION` statement. Run this in Supabase's SQL editor (or
enable PostGIS in its Extensions dashboard) before deploying:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
`CLOUDINARY_IMAGE_UPLOAD_PRESET`, and `CLOUDINARY_VIDEO_UPLOAD_PRESET` as
server-only Render variables if public media uploads are enabled; they are
optional otherwise.

Set Render's Root Directory to the repository root. Configure the Render build
command to generate the Prisma Client before compiling:

```sh
npm ci
npm run db:generate --workspace=@trusttrade/api
npm run build:api
```

Configure Render's **Pre-Deploy Command** to apply committed migrations before
the new service version starts:

```sh
npm run db:migrate --workspace=@trusttrade/api
```

Start the API with:

```sh
npm run start --workspace=@trusttrade/api
```
