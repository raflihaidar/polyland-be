import { prisma } from "../config/prisma";
import type { AuthPerson, RegisterRequest } from "../types/auth.type";
import redis from "../config/redis";
import { generateTokens } from "../utils/jwt";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { verifyMessage } from "viem";
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET } from "../config/token";
import jwt from "jsonwebtoken";

export const register = async (data: RegisterRequest) => {
  const hashedPassword = await bcrypt.hash(data.password.trim(), 10);
  const user = await prisma.$transaction(async (tx) => {
    try {
      const user = await tx.person.create({
        data: {
          name: data.name,
          username: data.username,
          email: data.email,
          password: hashedPassword,
        },
      });

      const role = await tx.rolePerson.create({
        data: {
          role_id: 6, // guest
          person_id: user.id,
        },
      });

      return user;
    } catch (err) {
      console.error("Transaction failed:", err);
      throw err;
    }
  });

  return user;
};

export const login = async (email: string) => {
  const person = await prisma.person.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          // role: {
          //   include: {
          //     privileges: {
          //       include: {
          //         privilege: {
          //           include: { module: true },
          //         },
          //       },
          //     },
          //   },
          // },
          role: true,
        },
      },
    },
  });

  if (!person) {
    throw new Error("Invalid credentials");
  }

  await prisma.person.update({
    where: { id: person.id },
    data: { nonce: randomBytes(16).toString("hex") },
  });

  const jwtPayload = {
    id: person.id,
    roles: person.roles.map((rp) => rp.role.name),
  };

  const { accessToken, refreshToken } = generateTokens(jwtPayload);

  // simpan refresh token ke redis
  await redis.set(`refresh:${person.id}`, refreshToken, {
    EX: 60 * 60 * 24 * 7,
  });

  return {
    accessToken,
    refreshToken,
    person,
  };
};

export const requestWalletNonce = async (wallet_address: string) => {
  const person = await prisma.person.findUnique({
    where: { wallet_address },
  });

  if (!person) throw new Error("Wallet not registered");

  const nonce = randomBytes(16).toString("hex");

  await prisma.person.update({
    where: { id: person.id },
    data: { nonce },
  });

  return {
    message: `Login to Polyland\nWallet: ${wallet_address}\nNonce: ${nonce}`,
  };
};

export const loginWalletVerify = async (
  wallet_address: `0x${string}`,
  signature: `0x${string}`,
) => {
  const person = await prisma.person.findUnique({
    where: { wallet_address },
    include: {
      roles: { include: { role: true } },
    },
  });

  if (!person || !person.nonce) {
    throw new Error("Invalid login attempt");
  }

  const message = `Login to Polyland\nWallet: ${wallet_address}\nNonce: ${person.nonce}`;

  const isValid = verifyMessage({
    address: wallet_address,
    message,
    signature,
  });

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  await prisma.person.update({
    where: { id: person.id },
    data: { nonce: randomBytes(16).toString("hex") },
  });

  const jwtPayload = {
    id: person.id,
    roles: person.roles.map((rp) => rp.role.name),
  };

  const { accessToken, refreshToken } = generateTokens(jwtPayload);

  await redis.set(`refresh:${person.id}`, refreshToken, {
    EX: 60 * 60 * 24 * 7,
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = async (refreshToken: string) => {
  try {
    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
      throw new Error("JWT secrets are not defined in environment variables");
    }

    const decoded = jwt.verify(
      refreshToken,
      REFRESH_TOKEN_SECRET,
    ) as AuthPerson;

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        roles: decoded.roles,
      },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: "30m",
      },
    );

    return {
      accessToken: newAccessToken,
      user: {
        id: decoded.id,
        roles: decoded.roles,
      },
    };
  } catch (err) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }
};
