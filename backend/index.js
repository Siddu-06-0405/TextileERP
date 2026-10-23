import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import productRouter from './routes/productRoutes.js'
import customerRouter from './routes/customerRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import returnRouter from './routes/returnRoutes.js'
import stockRouter from './routes/stockRoutes.js'
import dashboardRouter from './routes/dashboardRoutes.js'
import cors from 'cors'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import whatsappNotificationRoutes from "./routes/whatsappNotificationRoutes.js";
import WhatsappMessageRoutes from './routes/whatsappMessagesRoutes.js';
import agentRouter from './routes/agent.js';
import adjustmentRouter from './routes/adjustmentRoutes.js';
import stockLogsRouter from './routes/stockLogsRoutes.js';
import adminRouter from './routes/admin.js';
import businessRouter from './routes/business.js';
import userRouter from './routes/user.js';

dotenv.config()

const app = express()

app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}))


// Mount all routes under /api/v1
app.use('/api/v1/products', productRouter);
app.use('/api/v1/customer', customerRouter);
app.use('/api/v1/order', orderRouter);
app.use('/api/v1/returns', returnRouter);
app.use('/api/v1/stock', stockRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use("/api/v1/whatsapp-notifications", whatsappNotificationRoutes);
app.use('/api/v1/whatsapp-messages', WhatsappMessageRoutes);
app.use('/api/v1/agent', agentRouter);
app.use('/api/v1/adjustments', adjustmentRouter);
app.use('/api/v1/stock-logs', stockLogsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/business', businessRouter);
app.use('/api/v1/user', userRouter);
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`MongoDb Connnected Successfully!`)
  })
  .catch((err) => {
    console.error(`Error Connecting MongoDb: ${err}`)
  })

const PORT = process.env.PORT

app.listen(PORT, () => {
  console.log(`Server Running on PORT ${PORT}`)
})