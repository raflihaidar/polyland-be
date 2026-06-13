import * as VerifService from "../services/verificationAccount.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";
import { VerificationStatus } from "../generated/prisma/enums.js";

export const check = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const personId = req.person?.id as string;

    const isExisting = await VerifService.isVerified(personId);

    res.status(200).json({
      message: "Berhasil melakukan pengecekan akun",
      data: isExisting,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status, search, page, limit } = req.query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    const result = await VerifService.findAllAccount(
      pageNumber,
      limitNumber,
      search as string,
      status as VerificationStatus,
    );

    res.status(200).json({
      message: "Daftar akun berhasil didapatkan",
      data : result,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
export const submit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      fullName,
      nik,
      phone,
      birthPlace,
      birthDate,
      gender,
      address,
      publicKey,
      wallet_address,
    } = req.body;

    const personId = req.person?.id as string;

    if (
      !personId ||
      !fullName ||
      !nik ||
      !phone ||
      !birthPlace ||
      !birthDate ||
      !gender ||
      !address ||
      !publicKey ||
      !wallet_address
    ) {
      throw new AppError("Semua field wajib diisi", 400);
    }

    const result = await VerifService.submit({
      person_id: personId,
      fullName,
      nik,
      phone,
      birthPlace,
      birthDate,
      gender,
      address,
      publicKey,
      wallet_address,
    });
    res.status(201).json({
      status: "success",
      message: "Verifikasi akun berhasil diajukan dan sedang diproses.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const verify = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { status, rejectionReason } = req.body;
    const { id } = req.params;

    const result = await VerifService.verify({
      id: id as string,
      status,
      rejectionReason,
    });
    res.status(200).json({
      status: "success",
      message:
        status === "APPROVED"
          ? "Verifikasi akun berhasil disetujui."
          : "Verifikasi akun berhasil ditolak.",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};
