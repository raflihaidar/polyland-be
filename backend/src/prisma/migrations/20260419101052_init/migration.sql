-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('AKTIF', 'DALAM_PROSES', 'BERMASALAH', 'TIDAK_AKTIF');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DIPROSES', 'VERIFIKASI_BERKAS', 'MENUNGGU_PEMBAYARAN', 'PENANDATANGANAN', 'DITOLAK', 'SELESAI');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('DASHBOARD', 'MASTER', 'SETTING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('KTP_PEMBELI', 'KTP_PENJUAL', 'KK_PEMBELI', 'AKTA_JUAL_BELI', 'PBB', 'SPPT', 'SSB', 'SERTIFIKAT_TANAH');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('SHM', 'SHGB', 'SHGU');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "wallet_address" VARCHAR(50),
    "land_office_id" UUID,
    "name" VARCHAR(150),
    "nik" VARCHAR(20),
    "phone" VARCHAR(20),
    "birthPlace" VARCHAR(100),
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "address" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "email" VARCHAR(150),
    "username" VARCHAR(100),
    "password" VARCHAR(100),
    "nip" VARCHAR(20),
    "publicKey" TEXT,
    "privateKey" TEXT,
    "nonce" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lands" (
    "id" UUID NOT NULL,
    "area_size" VARCHAR(100),
    "street_address" TEXT NOT NULL,
    "rt" VARCHAR(50) NOT NULL,
    "rw" VARCHAR(50) NOT NULL,
    "province_code" INTEGER NOT NULL,
    "regency_code" INTEGER NOT NULL,
    "district_code" INTEGER NOT NULL,
    "village_code" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_offices" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "address" TEXT,
    "province" VARCHAR(100) NOT NULL,
    "regency" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "head_office_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "land_office_prices" (
    "id" UUID NOT NULL,
    "land_office_id" UUID NOT NULL,
    "price_per_m2" INTEGER NOT NULL,
    "registration_fee" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "land_office_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regencies" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "province_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "regencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "regency_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" SERIAL NOT NULL,
    "code" BIGINT NOT NULL,
    "district_code" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "nib" VARCHAR(100) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "land_id" UUID NOT NULL,
    "cid" VARCHAR(255),
    "status" "CertificateStatus",
    "type" "CertificateType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" VARCHAR(255),
    "application_id" UUID,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_notes" (
    "id" TEXT NOT NULL,
    "certificate_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_owners" (
    "id" UUID NOT NULL,
    "certificate_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "ownership_pct" DOUBLE PRECISION DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_owners_pkey" PRIMARY KEY ("id")
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
    "land_office_id" UUID NOT NULL,
    "officer_id" UUID,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DIPROSES',
    "type" "CertificateType" NOT NULL,
    "nib" VARCHAR(100) NOT NULL,
    "file_number" VARCHAR(100) NOT NULL,
    "land_price_per_m2" INTEGER NOT NULL,
    "registration_fee" INTEGER NOT NULL,
    "total_fee" BIGINT NOT NULL DEFAULT 0,
    "notes" VARCHAR(200),
    "payment_tx_hash" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "person_id" UUID,
    "type" "DocumentType" NOT NULL,
    "fileUrl" VARCHAR(255) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_owners" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "share" DECIMAL(5,4),

    CONSTRAINT "application_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_counters" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "file_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "section" TEXT,
    "group_id" INTEGER,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_groups" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "section" "Section" NOT NULL,

    CONSTRAINT "module_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privileges" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "module_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_privileges" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "privilege_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_privileges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_persons" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "person_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_verifications" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "nik" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "birthPlace" VARCHAR(100) NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_wallet_address_key" ON "persons"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "persons_nik_key" ON "persons"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "persons_email_key" ON "persons"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persons_username_key" ON "persons"("username");

-- CreateIndex
CREATE UNIQUE INDEX "land_offices_code_key" ON "land_offices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "land_offices_head_office_id_key" ON "land_offices"("head_office_id");

-- CreateIndex
CREATE UNIQUE INDEX "land_office_prices_land_office_id_key" ON "land_office_prices"("land_office_id");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "regencies_code_key" ON "regencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "villages_code_key" ON "villages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_nib_key" ON "certificates"("nib");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_application_id_key" ON "certificates"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_owners_certificate_id_person_id_key" ON "certificate_owners"("certificate_id", "person_id");

-- CreateIndex
CREATE UNIQUE INDEX "deeds_number_key" ON "deeds"("number");

-- CreateIndex
CREATE UNIQUE INDEX "applications_nib_key" ON "applications"("nib");

-- CreateIndex
CREATE UNIQUE INDEX "applications_file_number_key" ON "applications"("file_number");

-- CreateIndex
CREATE UNIQUE INDEX "modules_slug_key" ON "modules"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "module_groups_name_key" ON "module_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "module_groups_slug_key" ON "module_groups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_privileges_role_id_privilege_id_key" ON "role_privileges"("role_id", "privilege_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_persons_person_id_role_id_key" ON "role_persons"("person_id", "role_id");

-- CreateIndex
CREATE INDEX "account_verifications_status_idx" ON "account_verifications"("status");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_regency_code_fkey" FOREIGN KEY ("regency_code") REFERENCES "regencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_village_code_fkey" FOREIGN KEY ("village_code") REFERENCES "villages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_offices" ADD CONSTRAINT "land_offices_head_office_id_fkey" FOREIGN KEY ("head_office_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_office_prices" ADD CONSTRAINT "land_office_prices_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_regency_code_fkey" FOREIGN KEY ("regency_code") REFERENCES "regencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_notes" ADD CONSTRAINT "certificate_notes_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_owners" ADD CONSTRAINT "certificate_owners_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_owners" ADD CONSTRAINT "certificate_owners_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deeds" ADD CONSTRAINT "deeds_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deeds" ADD CONSTRAINT "deeds_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_land_office_id_fkey" FOREIGN KEY ("land_office_id") REFERENCES "land_offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_owners" ADD CONSTRAINT "application_owners_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_owners" ADD CONSTRAINT "application_owners_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "module_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privileges" ADD CONSTRAINT "privileges_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privileges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_persons" ADD CONSTRAINT "role_persons_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_persons" ADD CONSTRAINT "role_persons_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
