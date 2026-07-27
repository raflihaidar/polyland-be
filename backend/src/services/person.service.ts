import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import { Prisma } from "../generated/prisma/client.js";
import { UpdatePerson } from "../types/person.type.js";

export const searchPerson = async (search: string) => {
  try {
    const person = await prisma.person.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            nik: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        nik: true,
        email: true,
        phone: true,
      },
    });

    return person;
  } catch (error: any) {
    throw new AppError("Terjadi kesalahan saat mencari data", 500, error?.meta);
  }
};

export const findAllUser = async (
  page = 1,
  limit = 10,
  search?: string,
  role_id?: number,
) => {
  try {
    const skip = (page - 1) * limit;

    const where: Prisma.PersonWhereInput = {
      isVerified: true,
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            nik: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
      ...(role_id && {
        roles: {
          some: {
            role: {
              id: role_id,
            },
          },
        },
      }),
    };
    const [data, total] = await Promise.all([
      await prisma.person.findMany({
        where,
        select: {
          id: true,
          name: true,
          nik: true,
          email: true,
          phone: true,
          gender: true,
          roles: {
            select: {
              id: true,
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.person.count({ where }),
    ]);
    return {
      users: data,
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
    throw new AppError("Gagal mendapatkan daftar user", 500, err.meta);
  }
};

export const findDetailUser = async (id: string) => {
  try {
    const user = await prisma.person.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        nik: true,
        email: true,
        phone: true,
        gender: true,
        address: true,
        nip: true,
        landOffice: true,
        headOfLandOffice: false,
        wallet_address: true,
        roles: {
          select: {
            id: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return user;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mendapatkan detail user", 500, err.meta);
  }
};

export const deleteUser = async (id: string) => {
  try {
    const person = await prisma.person.findUnique({ where: { id } });

    if (!person) {
      throw new AppError("User tidak ditemukan", 404);
    }

    if (person.deletedAt) {
      throw new AppError("User sudah dihapus", 400);
    }

    const deletedUser = await prisma.person.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return deletedUser;
  } catch (err: any) {
    console.log(err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Terjadi kesahalan saaat menghapus user", 500, err.meta);
  }
};

export const updateUser = async (id: string, body: UpdatePerson) => {
  try {
    const person = await prisma.person.findFirst({ where: { id } });

    if (!person) {
      throw new AppError("User tidak ditemukan", 404);
    }

    const updatedPerson = await prisma.$transaction(async (tx) => {
      // Update data person
      const updated = await tx.person.update({
        where: { id },
        data: {
          name: body.name,
          nik: body.nik,
          email: body.email,
          phone: body.phone,
          gender: body.gender,
          address: body.address,
          nip: body.nip,
          land_office_id: body.landOfficeId,
        },
      });

      // Update roles — hapus semua role lama, insert yang baru
      if (body.roles !== undefined) {
        await tx.rolePerson.deleteMany({ where: { person_id: id } });

        if (body.roles.length > 0) {
          await tx.rolePerson.createMany({
            data: body.roles.map((roleId: number) => ({
              person_id: id,
              role_id: roleId,
            })),
          });
        }
      }

      return updated;
    });

    return updatedPerson;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError("Terjadi kesalahan saat mengupdate user", 500, err.meta);
  }
};
