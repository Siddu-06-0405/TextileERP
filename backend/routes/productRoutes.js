import express from 'express';
import { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct, getTopProducts, getRecentOrdersByProduct, getAllProductNames, fixOrdersForRenamedProducts, fixProductStockInconsistencies, syncAllStocksWithProducts, createCategory, createTag, getTags, getCategories, deleteCategories, deleteTags, createColor, getColors, deleteColors, searchProducts, getProductStats } from "../controller/productController.js";
import { uploadImages } from '../controller/imageController.js';
import { upload } from '../middleware/uploadMiddleware.js';


const router = express.Router();
// Product Routes
router.get('/stats', getProductStats);
router.post('/addProduct', createProduct);
router.get('/search', searchProducts);
router.get('/', getAllProducts);
router.get('/all/names', getAllProductNames);

router.post('/upload-images', upload.array('images', 5), uploadImages);
router.get('/top/Products', getTopProducts);
router.get('/recent/orders/:productId', getRecentOrdersByProduct);
router.post('/fix-renamed-products', fixOrdersForRenamedProducts);
router.post('/fix-stock-inconsistencies', fixProductStockInconsistencies);
router.post('/sync-stocks-with-products', syncAllStocksWithProducts);

// category routes here
router.post('/addCategory', createCategory);
router.delete('/categories',deleteCategories)

// tag routes here
router.post('/addTag', createTag);
router.delete('/tags',deleteTags);

// get tags
router.get('/tags', getTags);

// get categories 
router.get('/categories', getCategories);

// colors routes
router.post('/addColor', createColor);
router.get('/colors', getColors);
router.delete('/colors', deleteColors);

// Dynamic Product Routes
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
export default router;