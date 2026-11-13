-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ARTISAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'SUSPENDED', 'BANNED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_VERIFIED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationDecisionType" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUESTED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PROFESSIONAL_SERVICE');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('USER', 'VERIFICATION', 'POST', 'REPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone_number" VARCHAR(30),
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_photo" VARCHAR(500),
    "cover_photo" VARCHAR(500),
    "bio" VARCHAR(2000) NOT NULL DEFAULT '',
    "location_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "professional_title" VARCHAR(120) NOT NULL DEFAULT '',
    "professional_bio" VARCHAR(3000) NOT NULL DEFAULT '',
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artisan_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "parent_id" UUID,
    "point" geography(Point,4326),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artisan_skills" (
    "artisan_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,

    CONSTRAINT "artisan_skills_pkey" PRIMARY KEY ("artisan_id","skill_id")
);

-- CreateTable
CREATE TABLE "artisan_service_areas" (
    "artisan_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,

    CONSTRAINT "artisan_service_areas_pkey" PRIMARY KEY ("artisan_id","location_id")
);

-- CreateTable
CREATE TABLE "verification_applications" (
    "id" UUID NOT NULL,
    "artisan_id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "document_type" VARCHAR(80) NOT NULL,
    "document_storage_key" VARCHAR(500) NOT NULL,
    "selfie_storage_key" VARCHAR(500) NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(500),
    "review_notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_decisions" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "decision" "VerificationDecisionType" NOT NULL,
    "reason" VARCHAR(500),
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "artisan_id" UUID NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "post_type" "PostType" NOT NULL DEFAULT 'PROFESSIONAL_SERVICE',
    "location_id" UUID NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" "AuditTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "previous_values" JSONB,
    "new_values" JSONB,
    "reason" VARCHAR(1000),
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_account_status_idx" ON "users"("role", "account_status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "artisan_profiles_user_id_key" ON "artisan_profiles"("user_id");

-- CreateIndex
CREATE INDEX "artisan_profiles_verification_status_idx" ON "artisan_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "locations_city_region_is_active_idx" ON "locations"("city", "region", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skills_category_id_slug_key" ON "skills"("category_id", "slug");

-- CreateIndex
CREATE INDEX "artisan_skills_skill_id_idx" ON "artisan_skills"("skill_id");

-- CreateIndex
CREATE INDEX "artisan_service_areas_location_id_idx" ON "artisan_service_areas"("location_id");

-- CreateIndex
CREATE INDEX "verification_applications_status_created_at_idx" ON "verification_applications"("status", "created_at");

-- CreateIndex
CREATE INDEX "verification_applications_artisan_id_created_at_idx" ON "verification_applications"("artisan_id", "created_at");

-- CreateIndex
CREATE INDEX "verification_decisions_application_id_created_at_idx" ON "verification_decisions"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_status_created_at_id_idx" ON "posts"("status", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_artisan_id_created_at_idx" ON "posts"("artisan_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_location_id_status_created_at_idx" ON "posts"("location_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "post_media_post_id_display_order_idx" ON "post_media"("post_id", "display_order");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "likes_user_id_created_at_idx" ON "likes"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "likes_post_id_user_id_key" ON "likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_type_target_id_created_at_idx" ON "admin_audit_logs"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_profiles" ADD CONSTRAINT "artisan_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_skills" ADD CONSTRAINT "artisan_skills_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "artisan_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_skills" ADD CONSTRAINT "artisan_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_service_areas" ADD CONSTRAINT "artisan_service_areas_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "artisan_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artisan_service_areas" ADD CONSTRAINT "artisan_service_areas_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "artisan_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_applications" ADD CONSTRAINT "verification_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_decisions" ADD CONSTRAINT "verification_decisions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_decisions" ADD CONSTRAINT "verification_decisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "artisan_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_professional_post_authorization()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  artisan_user_id UUID;
BEGIN
  SELECT a.user_id
    INTO artisan_user_id
    FROM artisan_profiles AS a
    JOIN users AS u ON u.id = a.user_id
   WHERE a.id = NEW.artisan_id
     AND u.id = NEW.author_id
     AND u.role = 'ARTISAN'
     AND u.account_status = 'ACTIVE'
     AND a.verification_status = 'APPROVED'
     AND EXISTS (
       SELECT 1
         FROM verification_applications AS va
        WHERE va.artisan_id = a.id
          AND va.status = 'APPROVED'
          AND va.reviewed_by IS NOT NULL
          AND va.reviewed_at IS NOT NULL
     )
   FOR KEY SHARE OF a, u;

  IF artisan_user_id IS NULL THEN
    RAISE EXCEPTION 'ARTISAN_VERIFICATION_REQUIRED'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM locations AS l
      JOIN artisan_service_areas AS asa ON asa.location_id = l.id
     WHERE asa.artisan_id = NEW.artisan_id
       AND l.id = NEW.location_id
       AND l.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'INVALID_SERVICE_LOCATION'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_require_verified_active_artisan
BEFORE INSERT OR UPDATE OF author_id, artisan_id, location_id ON posts
FOR EACH ROW
EXECUTE FUNCTION enforce_professional_post_authorization();

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER admin_audit_logs_are_immutable
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE UNIQUE INDEX one_pending_verification_per_artisan
ON verification_applications (artisan_id)
WHERE status = 'PENDING_REVIEW';

ALTER TABLE "artisan_profiles"
  ADD CONSTRAINT "artisan_profiles_experience_years_check"
  CHECK ("experience_years" BETWEEN 0 AND 80);

ALTER TABLE "artisan_profiles"
  ADD CONSTRAINT "artisan_profiles_total_reviews_check"
  CHECK ("total_reviews" >= 0);

ALTER TABLE "artisan_profiles"
  ADD CONSTRAINT "artisan_profiles_average_rating_check"
  CHECK ("average_rating" BETWEEN 0 AND 5);
CREATE EXTENSION IF NOT EXISTS postgis;
