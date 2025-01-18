import express from 'express';
import { getProducts, getProductQuantities } from '../controllers/productController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/products', getProducts); // Get all products or filter by brand

// Protected Routes
router.get('/products-quantity', verifyToken, getProductQuantities); // Get product quantities (protected)

export default router;
