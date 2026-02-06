import * as AuthService from "../services/auth.service";
import { Request, Response } from "express";
import bcrypt from "bcrypt";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password, confirmPassword } = req.body;
    if (!name || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const result = await AuthService.register({
      name,
      email,
      password,
      username,
    });
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error(error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ message: "Email or password is missing" });
    }

    const { accessToken, refreshToken, person } =
      await AuthService.login(email);

    // Cek password
    const isMatch = await bcrypt.compare(password, person.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
      })
      .json({ message: "Login success", token: accessToken });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const requestWalletNonceHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const { walletAddress } = req.body;
    const result = await AuthService.requestWalletNonce(walletAddress);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginWalletVerifyHandler = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;
    const result = await AuthService.loginWalletVerify(
      walletAddress,
      signature,
    );
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: "Internal server error" });
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
    return res.status(403).json({
      message: "Refresh token tidak valid atau expired",
    });
  }
};

export const user = async (req: Request, res: Response) => {
  const user = req.person;
  return res.status(200).json({
    message: "User retrieved successfully",
    user,
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

  res.json({ status: "success", message: "Logout berhasil" });
};
