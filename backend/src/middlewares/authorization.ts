import { prisma } from "../config/prisma";
import { redisClient } from "../config/redis";
import { NextFunction, Request, Response } from "express";

export const authorize = (module: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.person?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const permissionKey = `permission:${userId}`;
      const required = `${module}:${action}`;

      /**
       * ==============================
       * 1️⃣ CEK LANGSUNG DI REDIS (O(1))
       * ==============================
       */
      const hasPermission = await redisClient.sIsMember(
        permissionKey,
        required,
      );

      if (hasPermission) {
        return next();
      }

      /**
       * ==============================
       * 2️⃣ REDIS MISS → AMBIL DARI DB
       * ==============================
       */

      const user = await prisma.person.findUnique({
        where: { id: userId },
        select: {
          roles: {
            select: {
              role: {
                select: {
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

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      /**
       * 3️⃣ FLATTEN PERMISSION
       */
      const permissions = user.roles.flatMap((rp) =>
        rp.role.privileges.map(
          (p) => `${p.privilege.module.name}:${p.privilege.name}`,
        ),
      );

      const uniquePermissions = [...new Set(permissions)];

      /**
       * 4️⃣ RE-CACHE KE REDIS
       */
      if (uniquePermissions.length > 0) {
        await redisClient.del(permissionKey);
        await redisClient.sAdd(permissionKey, uniquePermissions);
        await redisClient.expire(permissionKey, 60 * 60 * 24);
      }

      /**
       * 5️⃣ CEK LAGI SETELAH RE-CACHE
       */
      if (!uniquePermissions.includes(required)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };
};
