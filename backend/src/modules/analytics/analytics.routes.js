import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = Router();

// P1.5: All analytics routes require authentication
router.use(authMiddleware);

router.get('/summary', (req, res, next) => analyticsController.getSummary(req, res, next));
router.get('/performance-series', (req, res, next) => analyticsController.getPerformanceSeries(req, res, next));
router.get('/attribution', (req, res, next) => analyticsController.getAttribution(req, res, next));
router.get('/ratios', (req, res, next) => analyticsController.getRatios(req, res, next));

export default router;
