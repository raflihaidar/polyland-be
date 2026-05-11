import express from "express";
import {
  getLoketByOfficeId,
  getQueueByLoketId,
} from "../controllers/loket.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/", getLoketByOfficeId);
router.get("/queues/:id", getQueueByLoketId);

export default router;
