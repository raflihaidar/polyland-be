-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_application_id_fkey";

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_cert_code_fkey" FOREIGN KEY ("cert_code") REFERENCES "certificates"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
