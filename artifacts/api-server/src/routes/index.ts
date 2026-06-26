import { Router, type IRouter } from "express";
import healthRouter from "./health";
import promptsRouter from "./prompts";
import adminRouter from "./admin";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(promptsRouter);
router.use(adminRouter);
router.use(settingsRouter);

export default router;
