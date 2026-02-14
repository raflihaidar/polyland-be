import { prisma } from "../config/prisma";
import type { AuthPerson, RegisterRequest } from "../types/auth.type";
import { redisClient } from "../config/redis";
import { generateTokens } from "../utils/jwt";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { verifyMessage, keccak256, toBytes } from "viem";
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET } from "../config/token";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/error";
import { publicClient, walletClient, contractConfig } from "../config/wallet";

const CITIZEN_ROLE = keccak256(toBytes("CITIZEN_ROLE"));
const BPN_ROLE = keccak256(toBytes("BPN_ROLE"));

export const register = async (data: RegisterRequest) => {
  try {
    const hashedPassword = await bcrypt.hash(data.password.trim(), 10);

    const user = await prisma.$transaction(async (tx) => {
      const user = await tx.person.create({
        data: {
          name: data.name,
          username: data.username,
          email: data.email,
          password: hashedPassword,
        },
      });

      await tx.rolePerson.create({
        data: {
          role_id: 6,
          person_id: user.id,
        },
      });

      return user;
    });

    return user;
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new AppError("Email atau username sudah terdaftar", 409, err.meta);
    }

    throw new AppError("Gagal melakukan registrasi", 500, err.meta);
  }
};

export const login = async (email: string) => {
  try {
    const person = await prisma.person.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                privileges: {
                  select: {
                    privilege: {
                      select: {
                        name: true,
                        module: {
                          select: { name: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!person) {
      throw new AppError(
        "Data user tidak ditemukan, silahkan melakukan registrasi",
        400,
      );
    }

    // update nonce
    await prisma.person.update({
      where: { id: person.id },
      data: { nonce: randomBytes(16).toString("hex") },
    });

    /**
     * ==============================
     * FLATTEN PERMISSIONS
     * ==============================
     */
    const permissions = person.roles.flatMap((rp) =>
      rp.role.privileges.map(
        (p) => `${p.privilege.module.name}:${p.privilege.name}`,
      ),
    );

    // hapus duplicate permission
    const uniquePermissions = [...new Set(permissions)];

    /**
     * ==============================
     * GENERATE JWT
     * ==============================
     */
    const jwtPayload = {
      id: person.id,
      roles: person.roles.map((rp) => rp.role.name),
    };

    const { accessToken, refreshToken } = generateTokens(jwtPayload);

    /**
     * ==============================
     * SIMPAN KE REDIS
     * ==============================
     */

    // 1️⃣ simpan refresh token
    await redisClient.set(`refresh:${person.id}`, refreshToken, {
      EX: 60 * 60 * 24 * 7, // 7 hari
    });

    // 2️⃣ simpan permission sebagai Redis Set
    const permissionKey = `permission:${person.id}`;

    if (uniquePermissions.length > 0) {
      await redisClient.del(permissionKey);
      await redisClient.sAdd(permissionKey, uniquePermissions);
      await redisClient.expire(permissionKey, 60 * 60 * 24); // 1 hari
    }

    return {
      accessToken,
      refreshToken,
      person,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Login gagal", 500);
  }
};

export const getUser = async (id: string) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id },
      select: {
        name: true,
        username: true,
        email: true,
        roles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!person) {
      throw new AppError("Data user tidak ditemukan", 400);
    }

    return {
      ...person,
      username: person.username
        ? person.username
        : `user_${id.toString().slice(0, 8)}...`,
      roles: person.roles.map((rp) => rp.role.name),
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Gagal mengambil data user", 500);
  }
};

export const requestWalletNonce = async (wallet_address: string) => {
  try {
    const nonce = randomBytes(16).toString("hex");

    let person = await prisma.person.findUnique({
      where: { wallet_address },
    });

    if (!person) {
      person = await prisma.person.create({
        data: {
          wallet_address,
          nonce,
        },
      });
    } else {
      await prisma.person.update({
        where: { id: person.id },
        data: { nonce },
      });
    }

    return {
      message: `Login to Polyland\nWallet: ${wallet_address}\nNonce: ${nonce}`,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Gagal melakukan request nonce", 500);
  }
};

export const loginWalletVerify = async (
  wallet_address: `0x${string}`,
  signature: `0x${string}`,
) => {
  try {
    const person = await prisma.person.findUnique({
      where: { wallet_address },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!person || !person.nonce) {
      throw new AppError("Data tidak ditemukan", 404);
    }

    const message = `Login to Polyland\nWallet: ${wallet_address}\nNonce: ${person.nonce}`;

    const isValid = verifyMessage({
      address: wallet_address,
      message,
      signature,
    });

    if (!isValid) {
      throw new AppError("Signature tidak valid, silahkan coba lagi", 403);
    }

    let roleName: string = "guest";

    const isBPN = await publicClient.readContract({
      ...contractConfig,
      functionName: "hasRole",
      args: [BPN_ROLE, wallet_address],
    });

    if (isBPN) {
      roleName = "admin kantah";
      await prisma.rolePerson.upsert({
        where: {
          person_id_role_id: {
            person_id: person.id,
            role_id: 2,
          },
        },
        update: {},
        create: {
          person_id: person.id,
          role_id: 2,
        },
      });
    } else {
      const isCitizen = await publicClient.readContract({
        ...contractConfig,
        functionName: "hasRole",
        args: [CITIZEN_ROLE, wallet_address],
      });

      if (!isCitizen) {
        // Jika belum citizen → assign otomatis
        const hash = await walletClient.writeContract({
          ...contractConfig,
          functionName: "addCitizen",
          args: [wallet_address],
        });

        await publicClient.waitForTransactionReceipt({ hash });
      }

      roleName = person.nik ? "citizen" : "guest";
      const roleId = person.nik ? 6 : 5;

      await prisma.$transaction([
        prisma.rolePerson.upsert({
          where: {
            person_id_role_id: {
              person_id: person.id,
              role_id: roleId,
            },
          },
          update: {},
          create: {
            person_id: person.id,
            role_id: 2,
          },
        }),

        prisma.rolePerson.delete({
          where: {
            person_id_role_id: {
              person_id: person.id,
              role_id: 2,
            },
          },
        }),
      ]);
    }

    const jwtPayload = {
      id: person.id,
      roles: [roleName],
    };

    const { accessToken, refreshToken } = generateTokens(jwtPayload);

    await redis.set(`refresh:${person.id}`, refreshToken, {
      EX: 60 * 60 * 24 * 7,
    });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Gagal login dengan wallet, silahkan coba lagi", 500);
  }
};

export const verifyRefreshToken = async (refreshToken: string) => {
  try {
    if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
      throw new AppError("Terjadi kesalahan pada sisi server", 500);
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
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("sesion habis, silahkan login kembali", 500);
  }
};
