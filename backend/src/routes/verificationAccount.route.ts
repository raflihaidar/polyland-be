import express from "express";
import { submit, verify } from "../controllers/verificationAccount.controller";
import { authentication } from "../middlewares/authentication";

const router = express.Router();

router.use(authentication);

router.post("/submit", submit);
router.post("/verify/:id", verify);

export default router;
