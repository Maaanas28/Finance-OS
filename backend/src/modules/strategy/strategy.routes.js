import { Router } from 'express';
import { strategyController } from './strategy.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = Router();

// P1.5: All strategy routes require authentication
router.use(authMiddleware);

router.get('/templates', (req, res, next) => strategyController.getTemplates(req, res, next));
router.post('/backtest', (req, res, next) => strategyController.runBacktest(req, res, next));
router.get('/history', (req, res, next) => strategyController.getUserHistory(req, res, next));

export default router;
