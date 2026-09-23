import { Router } from 'express';
import { CpqController } from './cpq.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Products Catalog (§24)
router.get('/products', CpqController.listProducts);
router.get('/products/:id', CpqController.getProductById);
router.post('/products', CpqController.createProduct);
router.put('/products/:id', CpqController.updateProduct);
router.delete('/products/:id', CpqController.deleteProduct);

// Price Books & Pricing Matrices (§24)
router.get('/price-books', CpqController.listPriceBooks);
router.get('/price-books/:id', CpqController.getPriceBookById);
router.post('/price-books', CpqController.createPriceBook);
router.post('/price-books/:id/entries', CpqController.addPriceBookEntry);
router.delete('/price-books/entries/:entryId', CpqController.deletePriceBookEntry);

// Quotes & CPQ Lifecycle (§25)
router.get('/quotes', CpqController.listQuotes);
router.get('/quotes/:id', CpqController.getQuoteById);
router.post('/quotes', CpqController.createQuote);
router.put('/quotes/:id', CpqController.updateQuote);
router.patch('/quotes/:id/status', CpqController.updateQuoteStatus);
router.post('/quotes/:id/sign', CpqController.processQuoteSignature);
router.get('/quotes/:id/pdf', CpqController.generateQuotePdf);

export default router;
