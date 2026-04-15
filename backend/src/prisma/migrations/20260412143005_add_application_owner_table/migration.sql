-- CreateTable
CREATE TABLE "application_owners" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "sharePercent" INTEGER,

    CONSTRAINT "application_owners_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "application_owners" ADD CONSTRAINT "application_owners_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_owners" ADD CONSTRAINT "application_owners_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
