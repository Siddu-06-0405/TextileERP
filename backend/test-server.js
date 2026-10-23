import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import productRouter from './routes/productRoutes.js'
import customerRouter from './routes/customerRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import returnRouter from './routes/returnRoutes.js'
import cors from 'cors'

dotenv.config()

const app = express()

app.use(express.json())

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

// Mount all routes under /api/v1
app.use('/api/v1/products', productRouter)
app.use('/api/v1/customer', customerRouter)
app.use('/api/v1/order', orderRouter)
app.use('/api/v1/returns', returnRouter)

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Backend server is running!' })
})

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`)
  console.log(`Test endpoint: http://localhost:${PORT}/test`)
  console.log(`Returns endpoint: http://localhost:${PORT}/api/v1/returns`)
})
