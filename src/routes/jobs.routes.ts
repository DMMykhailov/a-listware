import { Router } from "express";
import { validateJobRequest } from "../middleware/validation.middleware.ts";
import { postJob, getJobs } from "../controllers/jobs.controller.ts";

const router = Router();

router.post("/", validateJobRequest, postJob);
router.get("/", getJobs);

export default router;
