import express from "express";
import {
  register,
  login,
  logout,
  requestWalletNonceHandler,
  loginWalletVerifyHandler,
  refresh,
  user,
} from "../controllers/auth.controller";
import { authentication } from "../middlewares/authentication";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/wallet/nonce", requestWalletNonceHandler);
router.post("/wallet/verify", loginWalletVerifyHandler);
router.get("/refresh", refresh);
router.get("/logout", logout);
router.get("/me", authentication, user);

export default router;
