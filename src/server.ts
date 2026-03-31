import app from "./app.ts";
import { logger } from "./utils/logger.ts";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  logger.info(`AdFlow Task Runner listening on http://localhost:${PORT}`);
  logger.info(
    "Endpoints: POST /jobs  |  GET /jobs  |  GET /stats  |  GET /health",
  );
});
