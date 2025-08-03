// backend/routes/menu.js
const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');

// GET /api/menu - Get all menus grouped by category
router.get('/', async (req, res) => {
  try {
    console.log('🔍 API /menu called - fetching all menus...');
    
    const { kategori } = req.query;
    let menus;
    
    if (kategori) {
      // Jika ada parameter kategori, ambil menu dari kategori tertentu
      console.log(`📂 Fetching category: ${kategori}`);
      const categoryMenus = await Menu.getByCategory(kategori);
      
      // Format response untuk konsistensi dengan frontend
      menus = {
        main_menu: kategori === 'main_menu' ? categoryMenus : [],
        drinks: kategori === 'drinks' ? categoryMenus : [],
        additional: kategori === 'additional' ? categoryMenus : []
      };
    } else {
      // Jika tidak ada parameter, ambil semua menu yang sudah dikelompokkan
      console.log('📂 Fetching all categories');
      menus = await Menu.getAll();
    }
    
    console.log('✅ Menu data fetched successfully');
    console.log('📊 Data structure:', {
      main_menu: menus.main_menu?.length || 0,
      drinks: menus.drinks?.length || 0,
      additional: menus.additional?.length || 0
    });
    
    res.json({ success: true, data: menus });
    
  } catch (error) {
    console.error('❌ Error fetching menu:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/menu - Create new menu
router.post('/', async (req, res) => {
  try {
    const { nama, harga, kategori, stok, isInfinite } = req.body;
    
    if (!nama || !harga || !kategori) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nama, harga, dan kategori harus diisi' 
      });
    }

    const result = await Menu.create({ nama, harga, kategori, stok, isInfinite });
    res.status(201).json({ success: true, message: 'Menu berhasil ditambahkan', data: result.data });

  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/menu/:nama - Update menu
router.put('/:nama', async (req, res) => {
  try {
    const { nama } = req.params;
    const updateData = req.body;
    
    const result = await Menu.update(nama, updateData);
    
    if (result.success) {
      res.json({ success: true, message: 'Menu berhasil diupdate' });
    } else {
      res.status(404).json({ success: false, error: result.message || 'Menu tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/menu/:nama - Delete menu
router.delete('/:nama', async (req, res) => {
  try {
    const { nama } = req.params;
    const result = await Menu.delete(nama);
    
    if (result.success) {
      res.json({ success: true, message: 'Menu berhasil dihapus' });
    } else {
      res.status(404).json({ success: false, error: result.message || 'Menu tidak ditemukan' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
