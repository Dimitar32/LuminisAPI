import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getOrders, saveOrder, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';

const router = express.Router();

router.get('/orders', verifyToken, getOrders);
router.post('/save-order', saveOrder);
router.put('/orders/:id', verifyToken, updateOrderStatus); 
router.delete('/orders/:id', verifyToken, deleteOrder); 

export default router;
