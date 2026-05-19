-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU');

-- DropForeignKey
ALTER TABLE "queue_attendees" DROP CONSTRAINT "queue_attendees_person_id_fkey";

-- DropForeignKey
ALTER TABLE "queue_attendees" DROP CONSTRAINT "queue_attendees_queue_id_fkey";

-- DropIndex
DROP INDEX "queues_land_office_id_queue_date_queue_number_key";

-- AlterTable
ALTER TABLE "queues"
ADD COLUMN "done_at" TIMESTAMP(3),
ADD COLUMN "loket_id" UUID NOT NULL;

-- DropTable
DROP TABLE "queue_attendees";

-- CreateTable
CREATE TABLE "operational_hours" (
    "id" UUID NOT NULL,
    "land_office_id" UUID NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "opening_time" VARCHAR(5) NOT NULL,
    "closing_time" VARCHAR(5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lokets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "office_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lokets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_hours_land_office_id_day_key" ON "operational_hours"("land_office_id", "day");

-- CreateIndex
CREATE INDEX "queues_loket_id_queue_date_status_idx" ON "queues"("loket_id", "queue_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "queues_loket_id_queue_date_queue_number_key" ON "queues"("loket_id", "queue_date", "queue_number");

-- AddForeignKey
ALTER TABLE "operational_hours" ADD CONSTRAINT "operational_hours_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_loket_id_fkey" FOREIGN KEY ("loket_id") REFERENCES "lokets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lokets" ADD CONSTRAINT "lokets_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;