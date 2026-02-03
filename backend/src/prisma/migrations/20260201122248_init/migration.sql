-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('AKTIF', 'DALAM_PROSES', 'BERMASALAH', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DIAJUKAN', 'DIPROSES', 'PERBAIKAN_BERKAS', 'DITOLAK', 'SELESAI');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "wallet_address" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "nik" VARCHAR(150) NOT NULL,
    "address" TEXT NOT NULL,
    "phone" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "nonce" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lands" (
    "id" UUID NOT NULL,
    "area_size" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "north_boundary" VARCHAR(100) NOT NULL,
    "south_boundary" VARCHAR(100) NOT NULL,
    "west_boundary" VARCHAR(100) NOT NULL,
    "east_boundary" VARCHAR(100) NOT NULL,
    "latitude" VARCHAR(100) NOT NULL,
    "longitude" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cerfiticates" (
    "id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "land_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "status" "CertificateStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cerfiticates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deeds" (
    "id" UUID NOT NULL,
    "number" VARCHAR(100) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "person_id" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "type" TEXT NOT NULL,
    "notes" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "description" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_wallet_address_key" ON "persons"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "persons_username_key" ON "persons"("username");

-- CreateIndex
CREATE UNIQUE INDEX "persons_nik_key" ON "persons"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cerfiticates_number_key" ON "cerfiticates"("number");

-- CreateIndex
CREATE UNIQUE INDEX "deeds_number_key" ON "deeds"("number");

-- AddForeignKey
ALTER TABLE "cerfiticates" ADD CONSTRAINT "cerfiticates_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cerfiticates" ADD CONSTRAINT "cerfiticates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deeds" ADD CONSTRAINT "deeds_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deeds" ADD CONSTRAINT "deeds_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
