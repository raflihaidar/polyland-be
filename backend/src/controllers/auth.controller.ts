import * as AuthService from "../services/auth.service";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/error";
import bcrypt from "bcrypt";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, username, email, password, confirmPassword } = req.body;
    console.log("body yang dikirim fe : ", req.body);
    if (!name || !username || !email || !password || !confirmPassword) {
      throw new AppError("Semua field wajib diisi", 400);
    }

    if (password !== confirmPassword) {
      throw new AppError("Password dan konfirmasi password tidak sama", 400);
    }

    const result = await AuthService.register({
      name,
      email,
      password,
      username,
    });
    res.status(201).json({
      status: "success",
      message: "Register User Success",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email dan password tidak boleh kosong", 400);
    }

    const { accessToken, refreshToken, person } =
      await AuthService.login(email);

    if (!person) {
      throw new AppError("User tidak ditemukan", 404);
    }

    // Cek password
    const isMatch = await bcrypt.compare(password, person.password);

    if (!isMatch) {
      throw new AppError("Email atau password salah", 400);
    }

    res
      .status(200)
      .cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      })
      .json({ status: "success", message: "Login success" });
  } catch (error) {
    next(error);
  }
};

export const requestWalletNonceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { walletAddress } = req.body;
    const result = await AuthService.requestWalletNonce(walletAddress);
    res.status(200).json({
      status: "success",
      message: "Nonce wallet berhasil dibuat",
      data: result,
    });
  } catch (error: unknown) {
    next(error);
  }
};

export const loginWalletVerifyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { walletAddress, signature } = req.body;
    const { accessToken, refreshToken } = await AuthService.loginWalletVerify(
      walletAddress,
      signature,
    );
    res
      .status(200)
      .cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      })
      .json({ status: "success", message: "Login degan wallet sukses" });
  } catch (error: unknown) {
    next();
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token tidak ditemukan",
      });
    }

    const { accessToken } = await AuthService.verifyRefreshToken(refreshToken);

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 60 * 1000, // 30 menit
    });

    return res.json({
      message: "Access token refreshed",
      access_token: accessToken,
    });
  } catch (err: any) {
    throw new AppError("Refresh token tidak valid atau expired", 403);
  }
};

export const user = async (req: Request, res: Response) => {
  const user = req.person;
  const data = await AuthService.getUser(user.id);
  return res.status(200).json({
    message: "User retrieved successfully",
    data,
  });
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  res.clearCookie("access_token", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  res.status(200).json({ status: "success", message: "Logout berhasil" });
};
