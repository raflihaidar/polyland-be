-- CreateEnum
CREATE TYPE "Section" AS ENUM ('DASHBOARD', 'MASTER', 'SETTING');

-- AlterTable
ALTER TABLE "persons" ALTER COLUMN "nonce" DROP NOT NULL;

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

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "module_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privileges" ADD CONSTRAINT "privileges_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_privileges" ADD CONSTRAINT "role_privileges_privilege_id_fkey" FOREIGN KEY ("privilege_id") REFERENCES "privileges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
