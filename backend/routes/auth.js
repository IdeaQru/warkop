// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt:', { username, timestamp: new Date() });
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username dan password harus diisi'
      });
    }

    // Get credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'warkop123';
    
    // Validate credentials
    if (username === adminUsername && password === adminPassword) {
      // Generate JWT token
      const token = jwt.sign(
        { 
          username: username,
          role: 'admin',
          loginTime: new Date()
        },
        process.env.JWT_SECRET || 'default_secret',
        { 
          expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
        }
      );

      console.log('✅ Login successful for user:', username);
      
      res.json({
        success: true,
        message: 'Login berhasil',
        token: token,
        user: {
          username: username,
          role: 'admin'
        }
      });
    } else {
      console.log('❌ Login failed for user:', username);
      
      res.status(401).json({
        success: false,
        error: 'Username atau password salah'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server'
    });
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token tidak ditemukan'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    res.json({
      success: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Token tidak valid'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
});

module.exports = router;
