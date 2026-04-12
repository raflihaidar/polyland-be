import { prisma } from "../config/prisma";
import { AppError } from "../utils/error";
import { PersonCreateInput } from "../generated/prisma/models";
import { VerificationStatus } from "../generated/prisma/enums";

import crypto from "crypto";
import CryptoJS from "crypto-js";

export const generateSignatureKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");

  return {
    publicKey: publicKey.export({
      type: "spki",
      format: "pem",
    }),
    privateKey: privateKey.export({
      type: "pkcs8",
      format: "pem",
    }),
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

export const createHeadOfficer = async (payload: PersonCreateInput) => {
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
            digitalSignature,
            nik
        } = payload

        const { publicKey, privateKey } = generateSignatureKeyPair();

        const encryptedPrivateKey = encryptPrivateKey(privateKey);

        const headOfficer = await prisma.person.create({
            data: {
                name,
                username,
                email,
                password,
                birthDate,
                birthPlace,
                phone,
                gender,
                address,
                nip,
                publicKey,
                privateKey : 

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
    } catch (error : any) {
        throw new AppError("Gagal menambahkan kepala kantah", 500, error.meta);
    }
}