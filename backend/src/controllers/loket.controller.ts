import * as LoketService from "../services/loket.service";
import * as QueueService from "../services/queue.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import { QueueStatus } from "../generated/prisma/enums";

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

export const getQueueByLoketId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { date, page, limit, search, status } = req.query;

    if (!id) throw new AppError("id kantor tanah tidak ditemukan", 400);

    const _date = date ? new Date(date as string) : null;

    const loket = await QueueService.getLoketQueues(
      id as string,
      _date,
      Number(page),
      Number(limit),
      search as string,
      status as QueueStatus,
    );

    res
      .json({
        status: "success",
        message: "Berhasil mendapatkan daftar loket",
        data: loket,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};
