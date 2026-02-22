import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import {
  VerificationAccountCreate,
  VerificationAccountUpdate,
} from "../types/domain/verificationAccount.type";
import { VerificationStatus } from "../generated/prisma/client";
import { error } from "console";

export const submit = async (data: VerificationAccountCreate) => {
  try {
    const verificationAccount = await prisma.accountVerification.create({
      data: {
        ...data,
        birthDate: new Date(data.birthDate),
        status: VerificationStatus.PENDING,
      },
    });

    return verificationAccount;
  } catch (err: any) {
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

    const isApproved =  verificationAccount.status === VerificationStatus.APPROVED
    console.log(verificationAccount.person_id)
    if(verificationAccount && isApproved){
      await prisma.person.update({
        where : {
          id : verificationAccount.person_id
        }, 
        data : {
          name : verificationAccount.fullName,
          nik : verificationAccount.nik,
          phone : verificationAccount.phone,
          birthDate : verificationAccount.birthDate,
          birthPlace : verificationAccount.birthPlace,
          gender : verificationAccount.gender,
          address : verificationAccount.address,
          isVerified : isApproved,
          verifiedAt : verificationAccount.updatedAt
        }
      })
    }

    return verificationAccount;
  } catch (err: any) {
    console.log(err)
    throw new AppError("Gagal melakukan verifikasi akun", 500, err.meta);
  }
};
