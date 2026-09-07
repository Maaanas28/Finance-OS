import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { optionalAuth } from '../../middleware/authMiddleware.js';

const router = Router();

router.use(optionalAuth);

router.get('/insight', (req, res, next) => aiController.getFinancialInsight(req, res, next));
router.get('/risk-analysis', (req, res, next) => aiController.getRiskAnalysis(req, res, next));
router.post('/query', (req, res, next) => aiController.processQuery(req, res, next));

export default router;
