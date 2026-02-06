import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../config/token";
import type { AuthPerson } from "../types/auth.type";

export function generateTokens(person: AuthPerson) {
  if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error("JWT secrets are not defined in environment variables");
  }

  const accessToken = jwt.sign(
    {
      id: person.id,
      roles: person.roles,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: "30m",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: person.id,
      roles: person.roles,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return { accessToken, refreshToken };
}
