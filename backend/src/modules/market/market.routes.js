import { Router } from 'express';
import { marketController } from './market.controller.js';

const router = Router();

// Specific routes before parameterized paths
router.get('/health', (req, res, next) => marketController.getHealth(req, res, next));
router.get('/status', (req, res, next) => marketController.getMarketStatus(req, res, next));
router.get('/movers', (req, res, next) => marketController.getTopMovers(req, res, next));
router.get('/search', (req, res, next) => marketController.searchSymbols(req, res, next));
router.get('/quotes', (req, res, next) => marketController.getQuotes(req, res, next));

// Parameterized item routes
router.get('/quote/:symbol', (req, res, next) => marketController.getQuote(req, res, next));
router.get('/history/:symbol', (req, res, next) => marketController.getHistoricalPrices(req, res, next));

export default router;
