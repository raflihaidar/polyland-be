import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";

export const getPrivilegeByRoleId = async (roleId: number) => {
  const privileges = await prisma.privilege.findMany({
    include: {
      module: true,
      roles: {
        where: { role_id: roleId },
      },
    },
  });

  // Group by section → module → privileges
  const sectionMap = new Map<string, any>();

  for (const privilege of privileges) {
    const section = privilege.module.section ?? "GENERAL";
    const moduleId = privilege.module_id;
    const moduleName = privilege.module.name;

    if (!sectionMap.has(section)) {
      sectionMap.set(section, { section, modules: new Map() });
    }

    const sectionData = sectionMap.get(section);

    if (!sectionData.modules.has(moduleId)) {
      sectionData.modules.set(moduleId, {
        module_id: moduleId,
        module_name: moduleName,
        privileges: {
          create: false,
          read: false,
          update: false,
          delete: false,
          export: false,
        },
        allPrivileges: [],
      });
    }

    const moduleData = sectionData.modules.get(moduleId);
    const isAssigned = privilege.roles.length > 0;

    moduleData.privileges[privilege.action] = isAssigned;
    moduleData.allPrivileges.push({
      id: privilege.id,
      action: privilege.action,
      name: privilege.name,
    });
  }

  return Array.from(sectionMap.values()).map((s) => ({
    section: s.section,
    modules: Array.from(s.modules.values()),
  }));
};

export const assignPrivilege = async (roleId: number, privilegeId: number) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError("Role tidak ditemukan", 404);

  const privilege = await prisma.privilege.findUnique({
    where: { id: privilegeId },
  });
  if (!privilege) throw new AppError("Privilege tidak ditemukan", 404);

  const existing = await prisma.rolePrivilege.findUnique({
    where: {
      role_id_privilege_id: { role_id: roleId, privilege_id: privilegeId },
    },
  });
  if (existing) return existing;

  return await prisma.rolePrivilege.create({
    data: { role_id: roleId, privilege_id: privilegeId },
  });
};

export const removePrivilege = async (roleId: number, privilegeId: number) => {
  const existing = await prisma.rolePrivilege.findUnique({
    where: {
      role_id_privilege_id: { role_id: roleId, privilege_id: privilegeId },
    },
  });

  if (!existing)
    throw new AppError("Privilege tidak ditemukan pada role ini", 404);

  return await prisma.rolePrivilege.delete({
    where: {
      role_id_privilege_id: { role_id: roleId, privilege_id: privilegeId },
    },
  });
};

export const getMyPrivileges = async (roleNames: string[]) => {
  try {
    const privileges = await prisma.privilege.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: { in: roleNames },
            },
          },
        },
      },
      include: {
        module: true,
        roles: {
          include: { role: true },
        },
      },
    });

    const sectionMap = new Map<string, any>();

    for (const privilege of privileges) {
      const section = privilege.module.section ?? "";
      const moduleId = privilege.module_id;

      if (!sectionMap.has(section)) {
        sectionMap.set(section, { section, modules: new Map() });
      }

      const sectionData = sectionMap.get(section);

      if (!sectionData.modules.has(moduleId)) {
        sectionData.modules.set(moduleId, {
          module_id: moduleId,
          module_name: privilege.module.name,
          module_slug: privilege.module.slug,
          privileges: {
            create: false,
            read: false,
            update: false,
            delete: false,
            export: false,
          },
        });
      }

      const moduleData = sectionData.modules.get(moduleId);
      moduleData.privileges[privilege.action] = true;
    }

    return Array.from(sectionMap.values()).map((s) => ({
      section: s.section,
      modules: Array.from(s.modules.values()),
    }));
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      "Terjadi kesalahan saat mengambil privilege user",
      500,
      err.meta,
    );
  }
};
