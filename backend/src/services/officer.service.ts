import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import { VerificationStatus } from "../generated/prisma/enums";
import { OfficerCreate } from "../types/domain/officer.type";
import crypto from "crypto";
import bcrypt from "bcrypt";
import CryptoJS from "crypto-js";

export const generateSignatureKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  return {
    publicKey: publicKey.export({
      type: "spki",
      format: "pem",
    }).toString(),
    privateKey: privateKey.export({
      type: "pkcs8",
      format: "pem",
    }).toString(),
  };
}


export const encryptPrivateKey = (privateKey : string) => {
  return CryptoJS.AES.encrypt(
    privateKey,
    process.env.KEY_SECRET!
  ).toString();
}

export const decryptPrivateKey = (ciphertext : string) => {
  const bytes = CryptoJS.AES.decrypt(
    ciphertext,
    process.env.KEY_SECRET!
  );

  return bytes.toString(CryptoJS.enc.Utf8);
}

export const createHeadOfficer = async (payload: OfficerCreate) => {
    try {
        const {
            name,
            username,
            password,
            email,
            phone,
            birthPlace,
            birthDate,
            gender,
            address,
            nip,
            nik,
            land_office_id
        } = payload

        const { publicKey, privateKey } = generateSignatureKeyPair();

        const encryptedPrivateKey = encryptPrivateKey(privateKey as string);

        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        const headOfficer = await prisma.person.create({
            data: {
                name,
                username,
                password : hashedPassword,
                email,
                birthDate,
                birthPlace,
                phone,
                gender,
                address,
                nip,
                nik,
                publicKey,
                privateKey : encryptedPrivateKey,
                isVerified : true,
                verifiedAt : new Date(),
                land_office_id
            }
        })

        await prisma.accountVerification.create({
            data: {
                person_id: headOfficer.id,
                fullName: name!,
                nik: nik!,
                phone: phone!,
                birthPlace: birthPlace!,
                birthDate: birthDate!,
                gender: gender!,
                address: address!,
                status: VerificationStatus.APPROVED,
            }
        })

        await prisma.rolePerson.create({
          data : {
            role_id : 4,
            person_id : headOfficer.id
          }
        })
    } catch (error : any) {
        throw new AppError("Gagal menambahkan kepala kantah", 500, error.meta);
    }
}


export const findHeadOfficeByLandOffice = async (land_office_id : string) => {
  try {
    const headOffice =  await prisma.person.findFirst({
      where : {
        land_office_id
      }
    })

    if(!headOffice){
      throw new AppError("Kepala kantah tidak ditemukan", 404);
    }

    return headOffice
  } catch (error : any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Gagal mencari kepala kantah", 500, error.meta);
  }
}