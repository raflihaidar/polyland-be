import express from "express";
import { getAllLand } from "../controllers/land.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get("/", getAllLand);

export default router;
