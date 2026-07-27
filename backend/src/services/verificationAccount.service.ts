import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/error.js";
import {
  VerificationAccountCreate,
  VerificationAccountUpdate,
} from "../types/domain/verificationAccount.type.js";
import { VerificationStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";

export const isVerified = async (person_id: string) => {
  try {
    const account = await prisma.accountVerification.findFirst({
      where: {
        person_id,
      },
    });

    if (account) return account.status;

    return "not found";
  } catch (err: any) {
    throw new AppError(
      "Gagal melakukan pengecekan verifikasi akun",
      500,
      err.meta,
    );
  }
};

export const findAllAccount = async (
  page = 1,
  limit = 10,
  search?: string,
  status?: VerificationStatus,
) => {
  try {
    const skip = (page - 1) * limit;

    const where: Prisma.AccountVerificationWhereInput = {
      ...(status && { status: status as VerificationStatus }),
      ...(search && {
        OR: [
          {
            fullName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      await prisma.accountVerification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.accountVerification.count({ where }),
    ]);
    return {
      account: data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err: any) {
    console.log(err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mendapatkan daftar akun", 500, err.meta);
  }
};

export const submit = async (data: VerificationAccountCreate) => {
  try {
    const isExisting = await isVerified(data.person_id);

    if (isExisting === "REJECTED") {
      const verificationAccount = await prisma.accountVerification.update({
        where: {
          person_id: data.person_id,
        },
        data: {
          ...data,
          birthDate: new Date(data.birthDate),
          status: VerificationStatus.PENDING,
        },
      });

      return verificationAccount;
    }

    if (isExisting === "PENDING")
      throw new AppError("Akun anda sedang dalam proses verifikasi", 403);
    else if (isExisting === "APPROVED")
      throw new AppError("Akun sudah terverifikasi", 403);

    const verificationAccount = await prisma.accountVerification.create({
      data: {
        ...data,
        birthDate: new Date(data.birthDate),
        status: VerificationStatus.PENDING,
      },
    });

    return verificationAccount;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal mengirim verifikasi akun", 500, err.meta);
  }
};

export const verify = async (data: VerificationAccountUpdate) => {
  try {
    const isRejected = false;
    const [guestRole, citizenRole] = await Promise.all([
      prisma.role.findFirst({
        where: { name: "guest" },
      }),
      prisma.role.findFirst({
        where: { name: "citizen" },
      }),
    ]);

    if (!guestRole || !citizenRole) {
      throw new AppError("Konfigurasi role tidak lengkap", 500);
    }

    const verificationAccount = await prisma.accountVerification.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!verificationAccount) {
      throw new AppError("Data verifikasi tidak ditemukan", 404);
    }

    const isApproved = data.status === VerificationStatus.APPROVED;

    if (!isApproved) {
      return prisma.accountVerification.update({
        where: {
          id: data.id,
        },
        data: {
          status: data.status,
          rejectionReason: data.rejectionReason ?? null,
        },
      });
    }

    return await prisma.$transaction(async (tx) => {
      const existingPerson = await tx.person.findFirst({
        where: {
          id: {
            not: verificationAccount.person_id,
          },
          OR: [
            {
              nik: verificationAccount.nik,
            },
            {
              wallet_address: verificationAccount.wallet_address,
            },
            {
              publicKey: verificationAccount.publicKey,
            },
          ],
        },
      });

      if (existingPerson?.name === verificationAccount.fullName) {
        throw new AppError("nama sudah digunakan oleh akun lain", 400);
      }

      if (existingPerson?.nik === verificationAccount.nik) {
        throw new AppError("NIK sudah digunakan oleh akun lain", 400);
      }

      if (
        existingPerson?.wallet_address === verificationAccount.wallet_address
      ) {
        throw new AppError(
          "Wallet address sudah digunakan oleh akun lain",
          400,
        );
      }

      if (existingPerson?.publicKey === verificationAccount.publicKey) {
        throw new AppError("Public key sudah digunakan oleh akun lain", 400);
      }

      if (isRejected) {
        await tx.accountVerification.update({
          where: {
            id: data.id,
          },
          data: {
            status: "REJECTED",
            rejectionReason: data.rejectionReason ?? null,
          },
        });
      }

      const updatedVerification = await tx.accountVerification.update({
        where: {
          id: data.id,
        },
        data: {
          status: data.status,
          rejectionReason: null,
        },
      });

      const person = await tx.person.update({
        where: {
          id: verificationAccount.person_id,
        },
        data: {
          name: verificationAccount.fullName,
          username: verificationAccount.fullName
            .toLowerCase()
            .replace(/\s+/g, ""),
          nik: verificationAccount.nik,
          phone: verificationAccount.phone,
          birthDate: verificationAccount.birthDate,
          birthPlace: verificationAccount.birthPlace,
          gender: verificationAccount.gender,
          address: verificationAccount.address,
          isVerified: true,
          verifiedAt: updatedVerification.updatedAt,
          publicKey: verificationAccount.publicKey,
          wallet_address: verificationAccount.wallet_address,
        },
        include: {
          roles: true,
        },
      });

      const hasGuestRole = person.roles.some(
        (role) => role.role_id === guestRole.id,
      );

      if (hasGuestRole) {
        await tx.rolePerson.update({
          where: {
            person_id_role_id: {
              person_id: person.id,
              role_id: guestRole.id,
            },
          },
          data: {
            role_id: citizenRole.id,
          },
        });
      }

      return {
        verificationAccount: updatedVerification,
        person,
      };
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Gagal melakukan verifikasi akun", 500, err?.meta);
  }
};

export const findAccountByPersonId = async (person_id: string) => {
  try {
    const verificationAccount = await prisma.accountVerification.findFirst({
      where: {
        person_id,
      },
      select: {
        fullName: true,
        nik: true,
        phone: true,
        birthDate: true,
        birthPlace: true,
        address: true,
        publicKey: true,
        gender: true,
        status: true,
        rejectionReason: true,
      },
    });

    if (!verificationAccount) {
      throw new AppError("Data verifikasi akun tidak ditemukan", 200);
    }

    return verificationAccount;
  } catch (err: any) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Gagal mendapatkan data akun", 500, err?.meta);
  }
};
