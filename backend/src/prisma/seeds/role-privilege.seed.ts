import { PrismaClient } from "@prisma/client/extension";

export const seedRolePrivileges = async (prisma: PrismaClient) => {
  // hapus data lama
  await prisma.rolePrivilege.deleteMany();
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE "role_privileges_id_seq" RESTART WITH 1;`,
  );

  // Ambil semua privilege
  const allPrivileges = await prisma.privilege.findMany();

  // Daftar role yang ingin diberi privilege
  const roles = [
    { name: "admin kantah", id: 1 },
    { name: "loket peralihan hak jual beli", id: 2 },
    { name: "bidang penetapan hak dan pendaftaran", id: 3 },
    { name: "citizen", id: 4 },
    { name: "guest", id: 5 },
  ];

  // Siapkan data RolePrivilege
  const rolePrivilegesData: { role_id: number; privilege_id: number }[] = [];
  roles.forEach((role) => {
    allPrivileges.forEach((priv: any) => {
      rolePrivilegesData.push({
        role_id: role.id,
        privilege_id: priv.id,
      });
    });
  });

  // Simpan ke database
  const rolePrivileges = await prisma.rolePrivilege.createMany({
    data: rolePrivilegesData,
  });

  console.log(
    `RolePrivilege seeded for roles:`,
    roles.map((r) => r.name).join(", "),
    `Total entries:`,
    rolePrivileges.count,
  );
};
