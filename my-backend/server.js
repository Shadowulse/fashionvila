const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); // Import multer

const app = express();
const PORT = 3000;

// === Database Files ===
const ORDERS_DB = './orders.json';
const PRODUCTS_DB = './products.json'; 

// === File Upload (Multer) Setup ===
const storage = multer.diskStorage({
  destination: './uploads/', // The folder to save images
  filename: function(req, file, cb) {
    // Create a unique filename
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// === Middleware ===
app.use(cors()); 
app.use(express.json()); 

// === Make the 'uploads' folder public ===
// This allows http://localhost:3000/uploads/image.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === Helper Functions (Read/Write JSON) ===
function getProducts() {
  if (!fs.existsSync(PRODUCTS_DB)) { return []; }
  return JSON.parse(fs.readFileSync(PRODUCTS_DB, 'utf8'));
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_DB, JSON.stringify(products, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving products:', error);
    return false;
  }
}

// === Routes ===
app.get('/', (req, res) => res.send('Fashion Villa Back-End is running!'));

// --- PRODUCT ENDPOINTS ---

/**
 * @route   GET /api/products
 * @desc    Get all products
 */
app.get('/api/products', (req, res) => {
  try {
    const products = getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error reading products.' });
  }
});

/**
 * @route   POST /api/products
 * @desc    Add a new product (NOW WITH IMAGE UPLOAD)
 */
// 'productImage' must match the name in the admin.html FormData
app.post('/api/products', upload.single('productImage'), (req, res) => {
  try {
    const newProductData = req.body; // Get text data from req.body
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required.' });
    }

    const newProduct = {
      id: 'prod_' + Date.now(),
      name: newProductData.name,
      category: newProductData.category,
      price: parseInt(newProductData.price, 10),
      description: newProductData.description,
      defaultSize: newProductData.defaultSize,
      imagePath: req.file.path, // <-- Save the path to the image
      rating: 0, // <-- Rating now defaults to 0
      reviews: [] // <-- Ready for customer reviews
    };
    
    const products = getProducts();
    products.push(newProduct);
    
    if (saveProducts(products)) {
      res.status(201).json(newProduct);
    } else {
      throw new Error('Failed to save product to file.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error saving product.' });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 */
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  try {
    let products = getProducts();
    const productToDelete = products.find(p => p.id === id);

    if (!productToDelete) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    
    // Also delete the image file from the server
    if (productToDelete.imagePath && fs.existsSync(productToDelete.imagePath)) {
      fs.unlinkSync(productToDelete.imagePath);
    }

    products = products.filter(p => p.id !== id);
    
    if (saveProducts(products)) {
      res.json({ success: true, message: 'Product deleted.' });
    } else {
      throw new Error('Failed to save updated product list.');
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting product.' });
  }
});

// --- ORDER ENDPOINT (No changes) ---
app.post('/api/create-order', (req, res) => {
  // ... (same as before) ...
});

// === Start the Server ===
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});