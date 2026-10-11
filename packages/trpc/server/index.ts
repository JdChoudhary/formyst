import { router } from "./trpc";

import { adminRouter } from "./routes/admin/route";
import { aiBuilderRouter } from "./routes/ai-builder/route";
import { healthRouter } from "./routes/health/route";
import { folderRouter } from "./routes/folder/route";
import { formRouter } from "./routes/form/route";
import { responseRouter } from "./routes/response/route";
import { themeRouter } from "./routes/theme/route";

export const serverRouter = router({
  admin: adminRouter,
  aiBuilder: aiBuilderRouter,
  health: healthRouter,
  folder: folderRouter,
  form: formRouter,
  response: responseRouter,
  theme: themeRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
// Re-exported so infrastructure callers (the Express app) can map service
// failures without reaching into the services package directly.
export { isServiceError, ServiceError, type ServiceErrorCode } from "@repo/services/errors";
