import express from "express";
import { createQueue } from "../controllers/queue.controller";
import { authentication } from "../middlewares/authentication";
import { authorize } from "../middlewares/authorization";

const router = express.Router();

router.use(authentication);

router.post("/:id", createQueue);

export default router;
