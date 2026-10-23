import express from 'express'
import { getAdjustments, createAdjustment } from '../controller/adjustmentController.js'

const router = express.Router()

router.get('/', getAdjustments)
router.post('/', createAdjustment)

export default router 