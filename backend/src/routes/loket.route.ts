import express from "express";
import { getLoketByOfficeId } from "../controllers/loket.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/", getLoketByOfficeId);

export default router;
