import * as DocumentService from "../services/document.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";


export const generateCertificate = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const {
            fileNumber,
            txHash
        } = req.body;

        if (!fileNumber) throw new AppError("nomor file tidak ditemukan", 400);

        const buffer = await DocumentService.generateCertificate(fileNumber as string, txHash);

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=certificate.pdf",
        })

        res.send(buffer)
    } catch (error: unknown) {
        next(error);
    }
};