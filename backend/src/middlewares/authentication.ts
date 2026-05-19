import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { ACCESS_TOKEN_SECRET } from "../config/token";
import { prisma } from "../config/prisma";

export async function authentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!ACCESS_TOKEN_SECRET) {
      throw new Error("JWT secrets are not defined in environment variables");
    }

    const token = req.cookies?.access_token;

    if (!token) {
      req.person = null;
      return res.status(401).json({ message: "No access token" });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload & {
      id: string;
      role: string[];
    };

    const person = await prisma.person.findUnique({
      where: { id: decoded.id.toString() },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!person) {
      return res.status(401).json({ message: "Person not found" });
    }

    req.person = {
      id: person.id,
      roles: person.roles.map((rp) => rp.role.name),
    };
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired" });
    }

    return res.status(401).json({ message: "Invalid access token" });
  }
}
