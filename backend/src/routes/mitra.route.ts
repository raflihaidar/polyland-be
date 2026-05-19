import express from "express";
import { getMitra } from "../controllers/mitra.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("testing", "read"), getMitra);

export default router;
