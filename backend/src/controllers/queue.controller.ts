import * as QueueService from "../services/queue.service.js";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error.js";
import { QueueStatus } from "../generated/prisma/enums.js";

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

    const { date, status } = req.query;

    const _status = status
      ? Array.isArray(status)
        ? (status as QueueStatus[])
        : [status as QueueStatus]
      : [];

    if (!personId) {
      throw new AppError("id pengguna tidak ditemukan", 400);
    }
    const _date = date ? new Date(date as string) : null;
    // console.log(_date);

    const queues = await QueueService.getMyQueues(
      personId as string,
      _date,
      _status,
    );

    return res.status(200).json({
      status: "success",
      message: "Berhasil mengambil antrian",
      data: queues,
    });
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
    const { id } = req.params;

    if (!personId) throw new AppError("id pengguna tidak ditemukan", 400);

    const queues = await QueueService.getDetailQueue(
      personId as string,
      id as string,
    );

    res
      .json({
        status: "success",
        message: "Berhasil mengambil detail antrian",
        data: queues,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};

export const callQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    if (!id) throw new AppError("id antrian tidak ditemukan", 400);

    const queue = await QueueService.callNextQueue(id as string);

    res
      .json({
        status: "success",
        message: "Berhasil memanggil antrian",
        data: queue,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};

export const updateQueueStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) throw new AppError("id antrian tidak ditemukan", 400);

    const queue = await QueueService.updateQueueStatus({
      queueId: id as string,
      status: status as QueueStatus,
    });

    res
      .json({
        status: "success",
        message: "Berhasil memanggil antrian",
        data: queue,
      })
      .status(200);
  } catch (error) {
    next(error);
  }
};
