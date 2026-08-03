import { PrismaClient } from "@prisma/client/extension";

export const seedRoles = async (prisma: PrismaClient) => {
  // await prisma.role.deleteMany();
  // await prisma.$executeRawUnsafe(
  //   `ALTER SEQUENCE "Role_id_seq" RESTART WITH 1;`,
  // );
  const roles = await prisma.role.createMany({
    data: [
      { name: "admin kantah" },
      { name: "loket peralihan hak jual beli" },
      { name: "bidang penetapan hak dan pendaftaran" },
      { name: "citizen" },
      { name: "guest" },
    ],
  });

  console.log({ roles });
};
