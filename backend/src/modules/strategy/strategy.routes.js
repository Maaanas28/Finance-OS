import { Router } from 'express';
import { strategyController } from './strategy.controller.js';
import { optionalAuth } from '../../middleware/authMiddleware.js';

const router = Router();

router.use(optionalAuth);

router.get('/templates', (req, res, next) => strategyController.getTemplates(req, res, next));
router.post('/backtest', (req, res, next) => strategyController.runBacktest(req, res, next));
router.get('/history', (req, res, next) => strategyController.getUserHistory(req, res, next));

export default router;
