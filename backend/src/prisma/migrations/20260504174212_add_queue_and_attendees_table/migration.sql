-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('MENUNGGU', 'DIPANGGIL', 'DILAYANI', 'SELESAI', 'TIDAK_HADIR');

-- CreateTable
CREATE TABLE "queues" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "land_office_id" UUID NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "queue_date" DATE NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'MENUNGGU',
    "called_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_attendees" (
    "id" UUID NOT NULL,
    "queue_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,

    CONSTRAINT "queue_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queues_application_id_key" ON "queues"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "queues_land_office_id_queue_date_queue_number_key" ON "queues"("land_office_id", "queue_date", "queue_number");

-- CreateIndex
CREATE UNIQUE INDEX "queue_attendees_queue_id_person_id_key" ON "queue_attendees"("queue_id", "person_id");

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_attendees" ADD CONSTRAINT "queue_attendees_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_attendees" ADD CONSTRAINT "queue_attendees_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
