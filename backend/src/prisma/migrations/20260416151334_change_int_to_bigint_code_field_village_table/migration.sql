-- DropForeignKey
ALTER TABLE "lands" DROP CONSTRAINT "lands_village_code_fkey";

-- AlterTable
ALTER TABLE "lands" ALTER COLUMN "village_code" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "villages" ALTER COLUMN "code" SET DATA TYPE BIGINT;

-- AddForeignKey
ALTER TABLE "lands" ADD CONSTRAINT "lands_village_code_fkey" FOREIGN KEY ("village_code") REFERENCES "villages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
