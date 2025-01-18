import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import econtRoutes from './routes/econtRoutes.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';
import { loggerMiddleware } from './middleware/loggerMiddleware.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json()); // Parse JSON payloads
app.use(cors());         // Enable CORS for all origins
app.use('/images', express.static('public/images')); // Serve static images
app.use(loggerMiddleware); // Log all requests

// Routes
app.use('/api', authRoutes);       // Authentication routes
app.use('/api', orderRoutes);   // Order routes (can be protected using verifyToken in route definitions)
app.use('/api', productRoutes); // Product routes

app.use('/api', econtRoutes); // Prefix route

// Error Handling Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
