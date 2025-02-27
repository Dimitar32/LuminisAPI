import express from 'express';
import { getProducts, getProductById, getProductQuantities, updateProduct, getSetOptions, getProductNameById } from '../controllers/productController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/products', getProducts); // Get all products or filter by brand
router.get('/products/:id', getProductById); // Get a single product by ID
router.get('/productname/:id', getProductNameById); // Get a single product by ID
router.get('/set-options/:setId', getSetOptions); 
router.put('/products/:id', updateProduct); 

// Protected Routes
router.get('/products-quantity', verifyToken, getProductQuantities); // Get product quantities (protected)


export default router;
