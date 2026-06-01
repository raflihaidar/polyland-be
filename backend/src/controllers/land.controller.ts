import * as LandService from "../services/land.service.js";
import { NextFunction, Request, Response } from "express";

export const getAllLand = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lands = await LandService.getAllLand();

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan daftar tanah",
        data: lands,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};
