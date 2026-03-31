import type { Request, Response, NextFunction } from "express";

export function validateJobRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { jobName, arguments: args } = req.body ?? {};

  if (typeof jobName !== "string" || jobName.trim().length === 0) {
    res
      .status(400)
      .json({ error: "`jobName` is required and must be a non-empty string." });
    return;
  }

  if (args !== undefined) {
    if (!Array.isArray(args)) {
      res
        .status(400)
        .json({ error: "`arguments` must be an array of strings." });
      return;
    }
    if (args.some((a) => typeof a !== "string")) {
      res
        .status(400)
        .json({ error: "Every item in `arguments` must be a string." });
      return;
    }
  }

  next();
}
