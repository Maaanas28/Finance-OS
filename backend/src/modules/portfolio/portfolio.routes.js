import { Router } from 'express';
import { portfolioController } from './portfolio.controller.js';
import { optionalAuth } from '../../middleware/authMiddleware.js';

const router = Router();

router.use(optionalAuth);

router.get('/list', (req, res, next) => portfolioController.getPortfolios(req, res, next));
router.post('/', (req, res, next) => portfolioController.createPortfolio(req, res, next));

router.get('/summary', (req, res, next) => portfolioController.getSummary(req, res, next));
router.get('/holdings', (req, res, next) => portfolioController.getHoldings(req, res, next));
router.get('/allocations', (req, res, next) => portfolioController.getAllocations(req, res, next));
router.get('/transactions', (req, res, next) => portfolioController.getTransactions(req, res, next));
router.post('/transactions', (req, res, next) => portfolioController.executeTransaction(req, res, next));
router.get('/performance', (req, res, next) => portfolioController.getPerformanceHistory(req, res, next));

export default router;
