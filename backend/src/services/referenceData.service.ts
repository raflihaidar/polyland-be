import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import { VerificationStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";

export const findAllRole = async (page = 1, limit = 10, search?: string) => {
  try {
    const skip = (page - 1) * limit;
    const where: Prisma.RoleWhereInput = {
      NOT: {
        name: "guest",
      },
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      await prisma.role.findMany({
        where,
        select: {
          id: true,
          name: true,
        },
        skip,
        take: limit,
        orderBy: {
          created_at: "asc",
        },
      }),
      prisma.role.count({ where }),
    ]);
    return {
      roles: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mendapatkan daftar role", 500, err.meta);
  }
};

export const createRole = async (name: string) => {
  try {
    const existing = await prisma.role.findFirst({ where: { name } });
    if (existing) throw new AppError("Role sudah ada", 400);

    return await prisma.role.create({ data: { name } });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal menambahkan role", 500, err.meta);
  }
};

export const updateRole = async (id: number, name: string) => {
  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError("Role tidak ditemukan", 404);

    const existing = await prisma.role.findFirst({
      where: { name, NOT: { id } },
    });
    if (existing) throw new AppError("Nama role sudah digunakan", 400);

    return await prisma.role.update({ where: { id }, data: { name } });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal memperbarui data role", 500, err.meta);
  }
};

export const deleteRole = async (id: number) => {
  try {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError("Role tidak ditemukan", 404);

    const inUse = await prisma.rolePerson.findFirst({ where: { role_id: id } });
    if (inUse) throw new AppError("Role masih digunakan oleh pengguna", 400);

    return await prisma.role.delete({ where: { id } });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal menghapus  role", 500, err.meta);
  }
};
