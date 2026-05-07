import * as LoketService from "../services/loket.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const getLoketByOfficeId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { office_id } = req.query;

    if (!office_id) throw new AppError("id kantor tanah tidak ditemukan", 400);

    const loket = await LoketService.getLoket(office_id as string);

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan daftar loket",
        data: loket,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};
