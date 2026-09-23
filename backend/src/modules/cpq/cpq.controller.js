import { CpqService } from './cpq.service.js';

export class CpqController {
  // Products
  static async listProducts(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { search, category, isActive, limit, offset } = req.query;
      const products = await CpqService.listProducts(orgId, { search, category, isActive, limit, offset });
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const product = await CpqService.getProductById(orgId, parseInt(req.params.id, 10));
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const product = await CpqService.createProduct(orgId, userId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const product = await CpqService.updateProduct(orgId, parseInt(req.params.id, 10), req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const deleted = await CpqService.deleteProduct(orgId, parseInt(req.params.id, 10));
      if (!deleted) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // Price Books
  static async listPriceBooks(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { isActive } = req.query;
      const priceBooks = await CpqService.listPriceBooks(orgId, { isActive });
      res.json({ success: true, data: priceBooks });
    } catch (err) {
      next(err);
    }
  }

  static async getPriceBookById(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const priceBook = await CpqService.getPriceBookById(orgId, parseInt(req.params.id, 10));
      if (!priceBook) return res.status(404).json({ success: false, message: 'Price book not found' });
      res.json({ success: true, data: priceBook });
    } catch (err) {
      next(err);
    }
  }

  static async createPriceBook(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const priceBook = await CpqService.createPriceBook(orgId, req.body);
      res.status(201).json({ success: true, data: priceBook });
    } catch (err) {
      next(err);
    }
  }

  static async addPriceBookEntry(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const priceBookId = parseInt(req.params.id, 10);
      const entry = await CpqService.addPriceBookEntry(orgId, priceBookId, req.body);
      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      next(err);
    }
  }

  static async deletePriceBookEntry(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const entryId = parseInt(req.params.entryId, 10);
      const deleted = await CpqService.deletePriceBookEntry(orgId, entryId);
      if (!deleted) return res.status(404).json({ success: false, message: 'Entry not found' });
      res.json({ success: true, message: 'Price book entry deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Quotes
  static async listQuotes(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { dealId, companyId, status, search, limit, offset } = req.query;
      const quotes = await CpqService.listQuotes(orgId, { dealId, companyId, status, search, limit, offset });
      res.json({ success: true, data: quotes });
    } catch (err) {
      next(err);
    }
  }

  static async getQuoteById(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const quote = await CpqService.getQuoteById(orgId, parseInt(req.params.id, 10));
      if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async createQuote(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const quote = await CpqService.createQuote(orgId, userId, req.body);
      res.status(201).json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async updateQuote(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const quote = await CpqService.updateQuote(orgId, parseInt(req.params.id, 10), req.body);
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async updateQuoteStatus(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const { status, notes } = req.body;
      const quote = await CpqService.updateQuoteStatus(orgId, userId, parseInt(req.params.id, 10), status, notes);
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async processQuoteSignature(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const { signerName, signatureData } = req.body;
      const quote = await CpqService.processQuoteSignature(orgId, parseInt(req.params.id, 10), { signerName, signatureData });
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  }

  static async generateQuotePdf(req, res, next) {
    try {
      const orgId = req.user.organizationId || req.user.organization_id;
      const pdfData = await CpqService.generateQuotePdf(orgId, parseInt(req.params.id, 10));
      res.json({ success: true, data: pdfData });
    } catch (err) {
      next(err);
    }
  }
}
