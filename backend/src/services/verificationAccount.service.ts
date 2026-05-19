import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import {
  VerificationAccountCreate,
  VerificationAccountUpdate,
} from "../types/domain/verificationAccount.type";
import { VerificationStatus } from "../generated/prisma/client";

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

export const submit = async (data: VerificationAccountCreate) => {
  try {
    const isExisting = await isVerified(data.person_id);

    if (isExisting === "PENDING")
      throw new AppError("Akun anda sedang dalam proses verifikasi", 403);
    if (isExisting === "APPROVED")
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
    console.log(err);
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Gagal melakukan verifikasi akun", 500, err.meta);
  }
};

export const verify = async (data: VerificationAccountUpdate) => {
  try {
    const verificationAccount = await prisma.accountVerification.update({
      where: {
        id: data.id,
      },
      data: {
        status: data.status,
        rejectionReason: data.rejectionReason ?? null,
      },
    });

    const isApproved =
      verificationAccount.status === VerificationStatus.APPROVED;
    if (verificationAccount && isApproved) {
      return await prisma.$transaction(async (tx) => {
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
            isVerified: isApproved,
            verifiedAt: verificationAccount.updatedAt,
            publicKey: verificationAccount.publicKey,
            wallet_address: verificationAccount.wallet_address,
          },
          include: {
            roles: true,
          },
        });

        if (person.roles.some((role) => role.role_id === 6)) {
          await tx.rolePerson.update({
            where: {
              person_id_role_id: {
                person_id: verificationAccount.person_id,
                role_id: 6,
              },
            },
            data: {
              role_id: 5,
            },
          });
        }
      });
    }

    return verificationAccount;
  } catch (err: any) {
    console.log(err);
    throw new AppError("Gagal melakukan verifikasi akun", 500, err.meta);
  }
};
