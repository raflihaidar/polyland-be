import express from "express";
import {
  register,
  login,
  logout,
  requestWalletNonceHandler,
  loginWalletVerifyHandler,
  refresh,
  user,
} from "../controllers/auth.controller.js";
import { authentication } from "../middlewares/authentication.js";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/wallet/nonce", requestWalletNonceHandler);
router.post("/wallet/verify", loginWalletVerifyHandler);
router.post("/logout", authentication, logout);
router.get("/refresh", refresh);
router.get("/me", authentication, user);

export default router;
