import express from "express";
import { recoverPendingRecommendations } from "./services/ai/recommendationService.js";
import { processPendingStorageDeletions } from "./services/storage/storageCleanupService.js";
import { startDecisionEmailWorker } from "./services/notifications/decisionEmailOutbox.js";
import { ENV } from "./constants/env.js";

import { setupKeycloakConfig } from "./config/keycloak/keycloak.js";
import session from "express-session";

import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import connectPrisma from "./utils/prisma/connectPrisma.js";
import { bootstrapTenantAndAdmin } from "./utils/bootstrap/bootstrapTenantAndAdmin.js";

import authRoutes from "./routers/auth/authRoute.js";
import awsRouter from "./routers/aws/awsRoute.js";
import vendorRoutes from "./routers/vendor/vendorRoutes.js";
import hiringManagerRoutes from "./routers/hiring/hiringManagerRoutes.js";
import adminRoutes from "./routers/admin/adminRoutes.js";
import jobsRoutes from "./routers/jobs/jobsRoutes.js";
import candidateRoutes from "./routers/candidate/candidateRoutes.js";
import candidatesDecisionRoutes from "./routers/candidates/candidatesDecisionRoutes.js";
import dashboardRoutes from "./routers/dashboard/dashboardRoutes.js";


const app = express();

async function startServer() {
  try {

    const { keycloak, memoryStore } = await setupKeycloakConfig();

    await connectPrisma();
    await bootstrapTenantAndAdmin();

    app.use(helmet());
    app.use(express.json({ limit: "1mb" }));
    app.use(cookieParser());

    const allowedOrigins = ENV.ALLOWED_ORIGINS
      ? ENV.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [ENV.FRONTEND_URL || "http://localhost:5173"];

    app.use(
      cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["set-cookie"],
      })
    );

    const sessionSecret = ENV.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error("SESSION_SECRET must be configured before the server starts");
    }

    app.use(
      session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true,
        store: memoryStore,
      })
    );

    app.use(keycloak.middleware());

    app.use((req, _, next) => {
      console.log(`[Server] ${req.method} ${req.path}`);
      next();
    });

    // Mounted routes (supporting both /api/v1 and root prefixes)
    app.use("/api/v1/auth", authRoutes);
    app.use("/auth", authRoutes);

    app.use("/api/v1/aws", awsRouter);
    app.use("/aws", awsRouter);

    app.use("/api/v1/vendor", vendorRoutes);
    app.use("/vendor", vendorRoutes);

    app.use("/api/v1/hiring-manager", hiringManagerRoutes);
    app.use("/hiring-manager", hiringManagerRoutes);

    app.use("/api/v1/admin", adminRoutes);
    app.use("/admin", adminRoutes);

    app.use("/api/v1/jobs", jobsRoutes);
    app.use("/jobs", jobsRoutes);

    app.use("/api/v1/candidate", candidateRoutes);
    app.use("/candidate", candidateRoutes);

    app.use("/api/v1/candidates", candidatesDecisionRoutes);
    app.use("/candidates", candidatesDecisionRoutes);

    app.use("/api/v1/dashboard", dashboardRoutes);
    app.use("/dashboard", dashboardRoutes);

    app.get("/", (_, res) => {
      res.send("Server Connected!");
    });

    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        const status =
          typeof (err as Error & { status?: unknown }).status === "number" &&
          (err as Error & { status: number }).status >= 400 &&
          (err as Error & { status: number }).status < 500
            ? (err as Error & { status: number }).status
            : 500;
        console.error("Global request error:", err);
        res.status(status).json({
          error: status === 500 ? "Internal Server Error" : err.message,
        });
      }
    );

    void recoverPendingRecommendations();
    setInterval(() => { void recoverPendingRecommendations(); }, 60_000).unref();
    void processPendingStorageDeletions();
    setInterval(() => { void processPendingStorageDeletions(); }, 60_000).unref();
    startDecisionEmailWorker();

    const PORT = ENV.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}...`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safeMessage = message.replace(/(postgres(?:ql)?:\/\/)[^@/\s]+@/gi, "$1[redacted]@");
    console.error(JSON.stringify({
      level: "error",
      event: "SERVER_INITIALIZATION_FAILED",
      error: safeMessage,
    }));
    process.exit(1);
  }
}

await startServer();
