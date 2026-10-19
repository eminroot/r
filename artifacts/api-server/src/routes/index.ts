import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campaigns from "./campaigns";
import applications from "./applications";
import submissions from "./submissions";
import account from "./account";
import integrations from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campaigns);
router.use(applications);
router.use(submissions);
router.use(account);
router.use(integrations);

export default router;
