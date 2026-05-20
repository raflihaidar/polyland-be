import * as PersonService from "../services/person.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";

export const searchPerson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { q } = req.query;

    const queue = await PersonService.searchPerson(q as string);

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan data warga",
        data: queue,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};
