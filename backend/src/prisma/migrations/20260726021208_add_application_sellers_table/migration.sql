-- CreateTable
CREATE TABLE "application_sellers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,

    CONSTRAINT "application_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_sellers_application_id_person_id_key" ON "application_sellers"("application_id", "person_id");

-- AddForeignKey
ALTER TABLE "application_sellers" ADD CONSTRAINT "application_sellers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_sellers" ADD CONSTRAINT "application_sellers_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
