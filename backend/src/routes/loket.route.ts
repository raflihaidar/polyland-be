import express from "express";
import {
  getLoketByOfficeId,
  getQueueByLoketId,
} from "../controllers/loket.controller.js";
import { authentication } from "../middlewares/authentication.js";
import { authorize } from "../middlewares/authorization.js";

const router = express.Router();

router.use(authentication);

router.get("/", authorize("kantah", "read"), getLoketByOfficeId);
router.get("/queues/:id", authorize("kantah", "read"), getQueueByLoketId);

export default router;
