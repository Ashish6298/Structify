import { Router } from 'express';
import { CatalogService } from '../application/catalog.service.js';

export const ecommerceRouter = Router();
const catalogService = new CatalogService();

ecommerceRouter.get('/products', async (req, res) => {
  const products = await catalogService.getProducts();
  res.json({ data: products });
});
