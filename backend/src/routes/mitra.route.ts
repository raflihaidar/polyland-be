import express from "express";
import { getMitra } from "../controllers/mitra.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("testing", "read"), getMitra);

export default router;
