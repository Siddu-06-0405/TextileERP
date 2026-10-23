import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import productRouter from './routes/productRoutes.js'
import customerRouter from './routes/customerRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import returnRouter from './routes/returnRoutes.js'
import stockRouter from './routes/stockRoutes.js'
import cors from 'cors'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()

app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

// Mount all routes under /api/v1
app.use('/api/v1/products', productRouter)
app.use('/api/v1/customer', customerRouter)
app.use('/api/v1/order', orderRouter)
app.use('/api/v1/returns', returnRouter)
app.use('/api/v1/stock', stockRouter)

mongoose.connect(process.env.MONGO_URI)
.then(()=>{
  console.log(`MongoDb Connnected Successfully!`)
})
.catch((err)=>{
  console.error(`Error Connecting MongoDb: ${err}`)
})

const PORT = process.env.PORT

app.listen(PORT, () =>{
  console.log(`Server Running on PORT ${PORT}`)
})