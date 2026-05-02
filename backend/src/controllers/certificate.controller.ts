import * as CertificateService from "../services/certificate.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const generateCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { fileNumber, notes } = req.body;

    if (!fileNumber) throw new AppError("nomor file tidak ditemukan", 400);

    const buffer = await CertificateService.generateCertificate(
      fileNumber as string,
      notes as string[],
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=certificate.pdf",
    });

    res.send(buffer);
  } catch (error: unknown) {
    next(error);
  }
};

export const getCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.person;

    if (!id) throw new AppError("id pengguna tidak ditemukan", 400);

    const certificates = await CertificateService.getCertificates(id as string);

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan daftar sertifikat",
        data: certificates,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};

export const getDetailCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.person;
    const { certificateId } = req.params;

    if (!id) throw new AppError("id pengguna tidak ditemukan", 400);

    const certificates = await CertificateService.getCertificateById(
      id as string,
      certificateId as string,
    );

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan detail sertifikat",
        data: certificates,
      })
      .status(200);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const verifyCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tokenId } = req.params;

    const result = await CertificateService.verifyCertificate(
      tokenId as string,
    );

    res
      .json({
        status: "success",
        message: "Berhasil melakukan verifikasi sertifikat",
        data: result,
      })
      .status(200);
  } catch (error) {
    next();
  }
};
