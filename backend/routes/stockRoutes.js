import express from 'express'
import {
  createStock,
  getAllStocks,
  getStockById,
  updateStock,
  deleteStock,
  getStockSummary,
  getStockCategoryBreakdown,
  getStockMovement,
  getDesignStocks,
  getStockCount
} from '../controller/stockController.js'

const router = express.Router()

router.get('/stats', getStockCount)
// Create a new stock
router.post('/', createStock)

// Get all stocks
router.get('/', getAllStocks)
router.get('/design', getDesignStocks)

// Get stock by ID
router.get('/:id', getStockById)

// Update stock
router.put('/:id', updateStock)

// Delete stock
router.delete('/:id', deleteStock)

// Get stock summary
router.get('/get/summary', getStockSummary)

// Get stock category breakdown
router.get('/get/category-breakdown', getStockCategoryBreakdown)

// Get stock movement report
router.get('/get/movement-report', getStockMovement)
export default router
