import express from "express";
import {
  createQueue,
  getQueueByPersonId,
  getDetailQueue,
} from "../controllers/queue.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.get("/", getQueueByPersonId);
router.get("/detail/:id", getDetailQueue);
router.post("/:id", createQueue);

export default router;
