-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "email_verification_code_hash" TEXT,
ADD COLUMN "email_verification_expires_at" TIMESTAMP(3);

-- Existing trainers keep access without re-verifying.
UPDATE "Trainer"
SET "email_verified_at" = "createdAt"
WHERE "email_verified_at" IS NULL;
