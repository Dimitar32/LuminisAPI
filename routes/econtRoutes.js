import express from 'express';
import { getEcontOffices } from '../controllers/econtController.js';

const router = express.Router();

router.post('/get-offices', getEcontOffices);

export default router;
