import { prisma } from "../config/prisma.js";
import type { AuthPerson, RegisterRequest } from "../types/auth.type.js";
import { redisClient } from "../config/redis.js";
import { generateTokens } from "../utils/jwt.js";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { verifyMessage, keccak256, toBytes } from "viem";
import { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET } from "../config/token.js";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/error.js";
import {
  publicClient,
  walletClient,
  contractConfig,
} from "../config/wallet.js";
import { Prisma } from "@prisma/client/extension";

const CITIZEN_ROLE = keccak256(toBytes("CITIZEN_ROLE"));
const BPN_ROLE = keccak256(toBytes("BPN_ROLE"));

export const register = async (data: RegisterRequest) => {
  try {
    const hashedPassword = await bcrypt.hash(data.password.trim(), 10);

    const user = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.person.create({
          data: {
            name: data.name,
            username: data.username,
            email: data.email,
            password: hashedPassword,
            publicKey: data.publicKey,
          },
        });

        const role = await tx.role.findFirst({
          where: {
            name: "guest",
          },
        });

        await tx.rolePerson.create({
          data: {
            role_id: role.id,
            person_id: user.id,
          },
        });

        return user;
      },
    );

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
                        action: true,
                        module: {
                          select: { slug: true },
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
    const permissions = person.roles.flatMap((rp: any) =>
      rp.role.privileges.map(
        (p: any) => `${p.privilege.module.slug}:${p.privilege.action}`,
      ),
    );

    // hapus duplicate permission
    const uniquePermissions: any = [...new Set(permissions)];

    /**
     * ==============================
     * GENERATE JWT
     * ==============================
     */
    const jwtPayload = {
      id: person.id,
      roles: person.roles.map((rp: any) => rp.role.name),
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

    await redisClient.del(permissionKey);

    // simpan permission sebagai Redis Set
    if (uniquePermissions.length > 0) {
      await redisClient.sAdd(permissionKey, uniquePermissions);

      // expire optional (recommended)
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
        id: true,
        name: true,
        username: true,
        email: true,
        isVerified: true,
        roles: {
          include: {
            role: { select: { name: true } },
          },
        },
        land_office_id: true,
      },
    });

    const adminRoles = [
      "kepala kanwil",
      "admin kanwil",
      "admin kantah",
      "kepala kantah",
    ];

    const isAdmin = person?.roles.some((rp: any) =>
      adminRoles.includes(rp.role.name),
    );

    if (!isAdmin) {
      // @ts-ignore (jika TS komplain karena land_office_id bersifat mandatory di interface)
      delete (person as any).land_office_id;
    }

    if (!person) {
      throw new AppError("Data user tidak ditemukan", 400);
    }

    return {
      ...person,
      username: person.username
        ? person.username
        : `user_${id.toString().slice(0, 6)}`,
      roles: person.roles.map((rp: any) => rp.role.name),
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

    if (!person) {
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

    // Ambil semua role yang dibutuhkan sekaligus
    const [bpnRole, citizenRole, guestRole] = await Promise.all([
      prisma.role.findFirst({ where: { name: "admin kantah" } }),
      prisma.role.findFirst({ where: { name: "citizen" } }),
      prisma.role.findFirst({ where: { name: "guest" } }),
    ]);

    if (!bpnRole || !citizenRole || !guestRole) {
      throw new AppError("Konfigurasi role tidak lengkap", 500);
    }

    let roleName: string = "guest";

    const isBPN = await publicClient.readContract({
      ...contractConfig,
      functionName: "hasRole",
      args: [BPN_ROLE, wallet_address],
    } as any);

    if (isBPN) {
      roleName = bpnRole.name;

      await prisma.rolePerson.upsert({
        where: {
          person_id_role_id: {
            person_id: person.id,
            role_id: bpnRole.id,
          },
        },
        update: {},
        create: {
          person_id: person.id,
          role_id: bpnRole.id,
        },
      });
    } else {
      const assignedRole = person.nik ? citizenRole : guestRole;
      const removedRole = bpnRole; // hapus role BPN kalau ada
      roleName = assignedRole.name;

      await prisma.$transaction([
        prisma.rolePerson.upsert({
          where: {
            person_id_role_id: {
              person_id: person.id,
              role_id: assignedRole.id,
            },
          },
          update: {},
          create: {
            person_id: person.id,
            role_id: assignedRole.id,
          },
        }),

        prisma.rolePerson.deleteMany({
          where: {
            person_id: person.id,
            role_id: removedRole.id,
          },
        }),
      ]);
    }

    const jwtPayload = {
      id: person.id,
      roles: [roleName],
    };

    const { accessToken, refreshToken } = generateTokens(jwtPayload);

    await redisClient.set(`refresh:${person.id}`, refreshToken, {
      EX: 60 * 60 * 24 * 7,
    });

    return { accessToken, refreshToken };
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
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
