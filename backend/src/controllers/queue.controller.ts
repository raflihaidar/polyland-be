import * as QueueService from "../services/queue.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";

export const createQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const { id: personId } = req.person;

    if (!personId) throw new AppError("id pengguna tidak ditemukan", 400);

    const certificates = await QueueService.createQueue({
      personId,
      loketId: id as string,
      date,
    });

    res
      .json({
        status: "success",
        message: "Berhasil membuat antrian",
        data: certificates,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};
