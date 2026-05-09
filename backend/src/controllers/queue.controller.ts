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

    const queue = await QueueService.createQueue({
      personId,
      loketId: id as string,
      date,
    });

    res
      .json({
        status: "success",
        message: "Berhasil membuat antrian",
        data: queue,
      })
      .status(200);
  } catch (error: unknown) {
    next(error);
  }
};

export const getQueueByPersonId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: personId } = req.person;
    const { date } = req.query;

    const _date = date ? new Date(date as string) : null;

    if (!personId) throw new AppError("id pengguna tidak ditemukan", 400);

    const queues = await QueueService.getMyQueues(personId as string, _date);

    res
      .json({
        status: "success",
        message: "Berhasil mengambil antrian",
        data: queues,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};

export const getDetailQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id: personId } = req.person;
    const { id } = req.query;

    if (!personId) throw new AppError("id pengguna tidak ditemukan", 400);

    const queues = await QueueService.getDetailQueue(
      personId as string,
      id as string,
    );

    console.log(queues);

    res
      .json({
        status: "success",
        message: "Berhasil mengambil antrian",
        data: queues,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};
