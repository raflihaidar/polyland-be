import * as CertificateService from "../services/certificate.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";

export const searchCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { q } = req.query;

    const queue = await CertificateService.searchCertificate(q as string);

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan data sertifikat",
        data: queue,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};

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
    const tokenId = parseInt(req.params.tokenId as string);

    if (isNaN(tokenId)) {
      return res.status(400).json({
        success: false,
        message: "tokenId tidak valid",
      });
    }

    const result = await CertificateService.verifyCertificate(tokenId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

export const updateLabelCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { label } = req.body;

    if (!id) throw new AppError("Id Certificate Tidak ditemukan", 400);

    const certificate = await CertificateService.updateLabelCertificate(
      id as string,
      label,
    );
    return res.status(200).json({
      success: true,
      message: "Berhasil update data sertifikat",
      data: certificate,
    });
  } catch (error: any) {
    next(error);
  }
};
