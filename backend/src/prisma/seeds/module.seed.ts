import { PrismaClient } from "@prisma/client/extension";

export const seedModules = async (prisma: PrismaClient) => {
  // Hapus data lama
  // await prisma.$executeRawUnsafe(
  //   `TRUNCATE TABLE "Privilege" RESTART IDENTITY CASCADE;`,
  // );
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "modules" RESTART IDENTITY CASCADE;`,
  );
  // await prisma.$executeRawUnsafe(
  //   `TRUNCATE TABLE "ModuleGroup" RESTART IDENTITY CASCADE;`,
  // );

  // Ambil semua Module Groups

  const modules = [
    // Dashboard
    { name: "Dashboard", slug: "dashboard", section: "DASHBOARD" },

    // { name: "Swaploting", slug: "swaploting", section: "Layanan" },
    { name: "Cari Berkas", slug: "cari-berkas", section: "Layanan" },
    { name: "Peralihan Hak", slug: "peralihan-hak", section: "Layanan" },
    { name: "Mitra Kerja", slug: "mitra-kerja", section: "Layanan" },
    { name: "Sertipikatku", slug: "sertipikatku", section: "Layanan" },
    { name: "Aktaku", slug: "aktaku", section: "Layanan" },
    { name: "Berkasku", slug: "berkasku", section: "Layanan" },

    // Setting
    { name: "User", slug: "user", section: "SETTING" },
    { name: "Role", slug: "role", section: "SETTING" },
    { name: "Role Privilege", slug: "role-privilege", section: "SETTING" },
  ];

  await prisma.module.createMany({
    data: modules,
  });

  console.log("Modules seeded successfully");

  // Ambil semua Module dari database
  const allModules = await prisma.module.findMany();

  // Buat Privileges untuk setiap Module
  const privilegesData = [];
  for (const mod of allModules) {
    const moduleSlug = mod.slug;
    privilegesData.push(
      { name: `create_${moduleSlug}`, action: "create", module_id: mod.id },
      { name: `read_${moduleSlug}`, action: "read", module_id: mod.id },
      { name: `update_${moduleSlug}`, action: "update", module_id: mod.id },
      { name: `delete_${moduleSlug}`, action: "delete", module_id: mod.id },
      { name: `export_${moduleSlug}`, action: "export", module_id: mod.id },
    );
  }

  await prisma.privilege.createMany({
    data: privilegesData,
  });

  console.log("Privileges seeded successfully");
};
