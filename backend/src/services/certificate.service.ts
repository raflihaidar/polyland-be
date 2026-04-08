import { prisma } from "../config/prisma";
import { CertificateCreate } from "../types/domain/certificate.type";
import { AppError } from "../utils/error";

export const publishCertificate = async (payload: CertificateCreate) => {
    const certificate = await prisma.certificate.create({
        data: payload,
    });

    return certificate;
}