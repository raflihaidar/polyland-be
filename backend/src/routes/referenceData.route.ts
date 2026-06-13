import express from "express";
import { authentication } from "../middlewares/authentication.js";
import { getAllRole } from "../controllers/referenceData.controller.js";
// import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/role", getAllRole);

export default router;
