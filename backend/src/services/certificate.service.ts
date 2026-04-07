import { prisma } from "../config/prisma";
import fs from "fs";
import path from "path";
import { CertificateCreate } from "../types/domain/certificate.type";

export const publishCertificate = async (payload : CertificateCreate) => {
    const certificate = await prisma.certificate.create({
        data : payload
    })

    return certificate
}