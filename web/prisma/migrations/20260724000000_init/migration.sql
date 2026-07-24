-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "gender" TEXT,
    "nickname" TEXT,
    "partner_nickname" TEXT,
    "relationship_date" DATE,
    "partner_user_id" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_sub" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reminder_date" DATE NOT NULL,
    "note" TEXT NOT NULL,
    "is_notified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_photos" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_photos" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "couple_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "owner_user_id" INTEGER NOT NULL,
    "connected_user_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connected_at" TIMESTAMP(3),
    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_drawings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shared_drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_slideshow_photos" (
    "id" SERIAL NOT NULL,
    "pair_user_a" INTEGER NOT NULL,
    "pair_user_b" INTEGER NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "caption" TEXT,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_slideshow_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawing_events" (
    "id" BIGSERIAL NOT NULL,
    "pair_user_a" INTEGER NOT NULL,
    "pair_user_b" INTEGER NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "drawing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "user_profile_photos_user_id_key" ON "user_profile_photos"("user_id");
CREATE UNIQUE INDEX "couple_photos_user_id_key" ON "couple_photos"("user_id");
CREATE UNIQUE INDEX "pairing_codes_code_key" ON "pairing_codes"("code");
CREATE UNIQUE INDEX "shared_drawings_user_id_key" ON "shared_drawings"("user_id");
CREATE INDEX "shared_slideshow_photos_pair_user_a_pair_user_b_created_at_idx" ON "shared_slideshow_photos"("pair_user_a", "pair_user_b", "created_at");
CREATE INDEX "drawing_events_pair_user_a_pair_user_b_id_idx" ON "drawing_events"("pair_user_a", "pair_user_b", "id");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_profile_photos" ADD CONSTRAINT "user_profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "couple_photos" ADD CONSTRAINT "couple_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_connected_user_id_fkey" FOREIGN KEY ("connected_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shared_drawings" ADD CONSTRAINT "shared_drawings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_slideshow_photos" ADD CONSTRAINT "shared_slideshow_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drawing_events" ADD CONSTRAINT "drawing_events_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
