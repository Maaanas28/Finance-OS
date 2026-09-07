import { Router } from 'express';
import { newsController } from './news.controller.js';

const router = Router();

// GET /api/v1/news — paginated news feed with category/ticker filter
router.get('/', (req, res, next) => newsController.getNews(req, res, next));

// GET /api/v1/news/categories — available category list
router.get('/categories', (req, res, next) => newsController.getCategories(req, res, next));

// GET /api/v1/news/sentiment — aggregate market sentiment
router.get('/sentiment', (req, res, next) => newsController.getMarketSentiment(req, res, next));

// GET /api/v1/news/health — data pipeline health
router.get('/health', (req, res, next) => newsController.getHealth(req, res, next));

// GET /api/v1/news/ticker/:symbol — ticker-specific news
router.get('/ticker/:symbol', (req, res, next) => newsController.getTickerNews(req, res, next));

export default router;
