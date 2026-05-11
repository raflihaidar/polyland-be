/*
  Warnings:

  - The values [DILAYANI] on the enum `QueueStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QueueStatus_new" AS ENUM ('MENUNGGU', 'DIPANGGIL', 'SELESAI', 'TIDAK_HADIR');
ALTER TABLE "public"."queues" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "queues" ALTER COLUMN "status" TYPE "QueueStatus_new" USING ("status"::text::"QueueStatus_new");
ALTER TYPE "QueueStatus" RENAME TO "QueueStatus_old";
ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";
DROP TYPE "public"."QueueStatus_old";
ALTER TABLE "queues" ALTER COLUMN "status" SET DEFAULT 'MENUNGGU';
COMMIT;
