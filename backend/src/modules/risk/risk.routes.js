import { Router } from 'express';
import { riskController } from './risk.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

const router = Router();

// P1.5: All risk routes require authentication
router.use(authMiddleware);

// Risk Analytics & Cockpit
router.get('/snapshot', (req, res, next) => riskController.getSnapshot(req, res, next));
router.get('/metrics', (req, res, next) => riskController.getMetrics(req, res, next));
router.get('/correlation', (req, res, next) => riskController.getCorrelation(req, res, next));
router.get('/contribution', (req, res, next) => riskController.getContribution(req, res, next));
router.get('/drawdown-history', (req, res, next) => riskController.getDrawdownHistory(req, res, next));

// Stress Testing
router.get('/stress-scenarios', (req, res, next) => riskController.getStressScenarios(req, res, next));
router.post('/stress-test', (req, res, next) => riskController.executeStressTest(req, res, next));

// Stochastic Monte Carlo Simulator
router.post('/monte-carlo', (req, res, next) => riskController.runMonteCarlo(req, res, next));

export default router;
