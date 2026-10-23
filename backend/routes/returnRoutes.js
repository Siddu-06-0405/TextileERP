import express from 'express'
import { 
  createReturn, 
  getAllReturns, 
  getReturnById, 
  updateReturn, 
  deleteReturn,
  undoReturn
} from '../controller/returnController.js'

const router = express.Router()

// Create a new return
router.post('/', createReturn)

// Get all returns
router.get('/', getAllReturns)

// Get return by ID
router.get('/:id', getReturnById)

// Undo return (move approved or rejected return back to pending) - MUST come before general update route
router.put('/:id/undo', undoReturn)

// Update return
router.put('/:id', updateReturn)

// Delete return
router.delete('/:id', deleteReturn)

export default router
