CREATE TYPE "MediaProvider" AS ENUM ('CLOUDINARY');
CREATE TYPE "MediaPurpose" AS ENUM ('PROFILE_AVATAR', 'PROFILE_COVER', 'ARTISAN_PORTFOLIO', 'POST');
CREATE TYPE "MediaStatus" AS ENUM ('ACTIVE', 'DELETING');

ALTER TABLE "user_profiles"
    ADD COLUMN "profile_photo_media_id" UUID,
    ADD COLUMN "cover_photo_media_id" UUID;

ALTER TABLE "post_media"
    ALTER COLUMN "storage_key" DROP NOT NULL,
    ADD COLUMN "media_id" UUID;

CREATE TABLE "media_upload_intents" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "public_id" VARCHAR(500) NOT NULL,
    "folder" VARCHAR(500) NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "resource_type" "MediaType" NOT NULL,
    "max_bytes" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_upload_intents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "upload_intent_id" UUID NOT NULL,
    "provider" "MediaProvider" NOT NULL DEFAULT 'CLOUDINARY',
    "asset_id" VARCHAR(100) NOT NULL,
    "public_id" VARCHAR(500) NOT NULL,
    "secure_url" VARCHAR(2000) NOT NULL,
    "resource_type" "MediaType" NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "format" VARCHAR(30) NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "status" "MediaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artisan_portfolio_media" (
    "id" UUID NOT NULL,
    "artisan_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "artisan_portfolio_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_profile_photo_media_id_key" ON "user_profiles"("profile_photo_media_id");
CREATE UNIQUE INDEX "user_profiles_cover_photo_media_id_key" ON "user_profiles"("cover_photo_media_id");
CREATE UNIQUE INDEX "post_media_media_id_key" ON "post_media"("media_id");
CREATE UNIQUE INDEX "media_upload_intents_public_id_key" ON "media_upload_intents"("public_id");
CREATE INDEX "media_upload_intents_completed_at_expires_at_idx" ON "media_upload_intents"("completed_at", "expires_at");
CREATE INDEX "media_upload_intents_owner_id_created_at_idx" ON "media_upload_intents"("owner_id", "created_at");
CREATE UNIQUE INDEX "media_upload_intents_upload_intent_id_key" ON "media"("upload_intent_id");
CREATE UNIQUE INDEX "media_asset_id_key" ON "media"("asset_id");
CREATE UNIQUE INDEX "media_public_id_key" ON "media"("public_id");
CREATE INDEX "media_owner_id_status_created_at_idx" ON "media"("owner_id", "status", "created_at");
CREATE INDEX "media_purpose_status_idx" ON "media"("purpose", "status");
CREATE UNIQUE INDEX "artisan_portfolio_media_media_id_key" ON "artisan_portfolio_media"("media_id");
CREATE INDEX "artisan_portfolio_media_artisan_id_display_order_idx" ON "artisan_portfolio_media"("artisan_id", "display_order");

ALTER TABLE "media_upload_intents"
    ADD CONSTRAINT "media_upload_intents_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media"
    ADD CONSTRAINT "media_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "media_upload_intent_id_fkey"
    FOREIGN KEY ("upload_intent_id") REFERENCES "media_upload_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_profiles"
    ADD CONSTRAINT "user_profiles_profile_photo_media_id_fkey"
    FOREIGN KEY ("profile_photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "user_profiles_cover_photo_media_id_fkey"
    FOREIGN KEY ("cover_photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "post_media"
    ADD CONSTRAINT "post_media_media_id_fkey"
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "artisan_portfolio_media"
    ADD CONSTRAINT "artisan_portfolio_media_artisan_id_fkey"
    FOREIGN KEY ("artisan_id") REFERENCES "artisan_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "artisan_portfolio_media_media_id_fkey"
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
