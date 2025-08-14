// backend/routes/transaksi.js
const express = require('express');
const router = express.Router();
const Transaksi = require('../models/Transaksi');
const Menu = require('../models/Menu');

// POST /api/transaksi - Create new transaction
router.post('/', async (req, res) => {
  console.log('🛒 Starting transaction process...');

  try {
    const { items, tipe_pembayaran } = req.body;
    console.log('📦 Received items:', items);
    console.log('💳 Payment type:', tipe_pembayaran || '(default: tunai)');

    // 1. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items transaksi harus diisi'
      });
    }

    // 2. Validate payment type
    const paymentType = (tipe_pembayaran || 'tunai').toString().trim().toLowerCase();
    if (!['tunai', 'non_tunai'].includes(paymentType)) {
      return res.status(400).json({
        success: false,
        error: 'tipe_pembayaran harus "tunai" atau "non_tunai"'
      });
    }

    // 3. Fetch menu data for all items
    const itemNames = items.map(item => item.nama);
    console.log('🔍 Looking for menu items:', itemNames);

    const menuItemsInDb = await Menu.collection.find({
      nama: { $in: itemNames },
      aktif: true
    }).toArray();

    console.log('📊 Found menu items in DB:', menuItemsInDb);
    const menuMap = new Map(menuItemsInDb.map(m => [m.nama, m]));

    // 4. Validate stock
    const finiteStockItems = [];
    for (const item of items) {
      const menuItem = menuMap.get(item.nama);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          error: `Menu "${item.nama}" tidak ditemukan.`
        });
      }

      console.log(`🔍 Checking item: ${item.nama}, isInfinite: ${menuItem.isInfinite}, current stock: ${menuItem.stok}, requested: ${item.jumlah}`);

      if (!menuItem.isInfinite) {
        if (menuItem.stok < item.jumlah) {
          return res.status(400).json({
            success: false,
            error: `Stok untuk "${item.nama}" tidak mencukupi. Sisa: ${menuItem.stok}.`
          });
        }
        finiteStockItems.push(item);
      }
    }

    // 5. Reduce stock if needed
    if (finiteStockItems.length > 0) {
      console.log('⬇️ Reducing stock...');
      await Menu.kurangiStokTanpaSession(finiteStockItems);
      console.log('✅ Stock reduction completed');
    } else {
      console.log('ℹ️ No stock reduction needed (all items infinite)');
    }

    // 6. Create transaction
    console.log('💾 Creating transaction record...');
    const result = await Transaksi.create({ items, tipe_pembayaran: paymentType });
    console.log('✅ Transaction record created');

    res.json({ success: true, message: 'Transaksi berhasil disimpan dan stok diperbarui', data: result.data });

  } catch (error) {
    console.error('❌ Transaction Error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});


// POST /api/transaksi/laporan - Generate report
router.post('/laporan', async (req, res) => {
  try {
    const { tanggalMulai, tanggalAkhir } = req.body;

    if (!tanggalMulai || !tanggalAkhir) {
      return res.status(400).json({
        success: false,
        error: 'Tanggal mulai dan akhir harus diisi'
      });
    }

    const laporan = await Transaksi.getLaporanPeriode(tanggalMulai, tanggalAkhir);
    res.json({ success: true, data: laporan });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/transaksi/stats-today - Get today's statistics
router.get('/stats-today', async (req, res) => {
  try {
    const stats = await Transaksi.getStatistikHariIni();
    res.json({ success: true, data: stats });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/transaksi/laporan-detail - Detailed report
router.post('/laporan-detail', async (req, res) => {
  try {
    console.log('📊 === LAPORAN DETAIL DEBUG START ===');
    console.log('📊 Request body:', req.body);
    console.log('📊 Transaksi model status:', {
      hasCollection: !!Transaksi.collection,
      hasFunction: typeof Transaksi.getLaporanPeriode === 'function'
    });

    const { tanggalMulai, tanggalAkhir } = req.body;

    if (!tanggalMulai || !tanggalAkhir) {
      console.log('❌ Missing dates in request');
      return res.status(400).json({
        success: false,
        error: 'Tanggal mulai dan akhir harus diisi'
      });
    }

    if (!Transaksi.collection) {
      console.log('❌ Transaksi collection not initialized');
      return res.status(500).json({
        success: false,
        error: 'Database collection not initialized'
      });
    }

    console.log('📊 Calling getLaporanPeriode...');
    const result = await Transaksi.getLaporanPeriode(tanggalMulai, tanggalAkhir);

    console.log('📊 Success! Result length:', result.length);
    console.log('📊 === LAPORAN DETAIL DEBUG END ===');

    res.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ LAPORAN DETAIL ERROR:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// DELETE /api/transaksi/:id - Delete a transaction
// DELETE /api/transaksi/:id - Delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Transaksi.delete(id);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ Error deleting transaction:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// PUT /api/transaksi/:id - Edit a transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaksiData = req.body; // Updated transaction data (items, payment type)

    const result = await Transaksi.edit(id, transaksiData);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ Error editing transaction:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
