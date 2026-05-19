import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const getMitra = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("getMitra");
    res.status(200).json({
      status: "success",
      message: "Data mitra berhasil diambil",
    });
  } catch (error) {
    next(error);
  }
};
