import express from "express";
import jobsRouter from "./routes/jobs.routes.ts";
import statsRouter from "./routes/stats.routes.ts";
import { errorHandler } from "./middleware/error.middleware.ts";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/jobs", jobsRouter);
app.use("/stats", statsRouter);

app.use(errorHandler);

export default app;
