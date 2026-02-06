-- CreateTable
CREATE TABLE "role_persons" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "person_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_persons_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "role_persons" ADD CONSTRAINT "role_persons_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_persons" ADD CONSTRAINT "role_persons_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
