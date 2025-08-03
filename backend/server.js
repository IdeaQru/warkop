require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./config/db');
const Menu = require('./models/Menu');
const Transaksi = require('./models/Transaksi');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files dari frontend
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Routes
app.use('/api/menu', require('./routes/menu'));
app.use('/api/transaksi', require('./routes/transaksi'));
app.use('/api/auth', require('./routes/auth')); // NEW: Auth routes
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '🌸 Warkop Babol API is running!',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend untuk semua route non-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Terjadi kesalahan pada server' 
  });
});

// Initialize database and models
// Perbaikan di server.js
async function startServer() {
  try {
    console.log('🌸 Starting Warkop Babol server...');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected successfully');
    
    // Initialize models
    console.log('🔧 Initializing models...');
    Menu.init();
    Transaksi.init();
    console.log('✅ Models initialized successfully');
    
    // Test model connection
    try {
      const menuCount = await Menu.collection.countDocuments({});
      console.log(`📊 Found ${menuCount} menu items in database`);
    } catch (error) {
      console.error('⚠️ Warning: Could not count menu items:', error.message);
    }
    
    app.listen(PORT, () => {
      console.log(`🌸 Warkop Babol server running on port ${PORT}`);
      console.log(`🌐 Access: http://localhost:${PORT}`);
      console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🍽️ Menu API: http://localhost:${PORT}/api/menu`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🌸 Shutting down Warkop Babol server...');
  await database.close();
  process.exit(0);
});

startServer();
