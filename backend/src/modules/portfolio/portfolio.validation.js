import { z } from 'zod';

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(2, 'Portfolio name must be at least 2 characters').max(60),
  description: z.string().trim().max(200).optional(),
  currency: z.enum(['INR', 'USD']).default('INR'),
  benchmarkSymbol: z.string().trim().default('NIFTY 50'),
  initialCash: z.coerce.number().min(0, 'Initial cash cannot be negative').default(0),
});

export const executeTransactionSchema = z.object({
  portfolioId: z.string().min(1, 'Portfolio ID is required').optional(),
  type: z.enum(['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL']),
  symbol: z.string().trim().toUpperCase().optional(),
  exchange: z.string().trim().default('NSE').optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero').optional(),
  price: z.coerce.number().positive('Price must be greater than zero').optional(),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  fees: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(200).optional(),
}).refine((data) => {
  if (['BUY', 'SELL'].includes(data.type)) {
    return Boolean(data.symbol && data.quantity && data.price);
  }
  if (['DEPOSIT', 'WITHDRAWAL'].includes(data.type)) {
    return Boolean(data.amount && data.amount > 0);
  }
  return true;
}, {
  message: 'BUY and SELL transactions require symbol, quantity, and price. DEPOSIT and WITHDRAWAL require amount.',
});
