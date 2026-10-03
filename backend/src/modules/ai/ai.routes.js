import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = Router();

// P1.5: All AI routes require authentication
router.use(authMiddleware);

router.get('/insight', (req, res, next) => aiController.getFinancialInsight(req, res, next));
router.get('/risk-analysis', (req, res, next) => aiController.getRiskAnalysis(req, res, next));
router.post('/query', (req, res, next) => aiController.processQuery(req, res, next));

export default router;
