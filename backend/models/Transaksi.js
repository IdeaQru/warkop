// backend/models/Transaksi.js
const database = require('../config/db');

class Transaksi {
  constructor() {
    this.collection = null;
  }

  init() {
    try {
      this.collection = database.getDB().collection('transaksi');
      console.log('✅ Transaksi collection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Transaksi collection:', error);
      throw error;
    }
  }

  async create(transaksiData, options = {}) {
    try {
      const { items } = transaksiData;
      
      const total_harga = items.reduce((total, item) => {
        return total + (item.harga * item.jumlah);
      }, 0);

      const transaksi = {
        items: items.map(item => ({
          nama_menu: item.nama,
          harga: parseInt(item.harga),
          jumlah: parseInt(item.jumlah)
        })),
        total_harga: total_harga,
        tanggal: new Date(),
        dibuat: new Date()
      };

      const result = options.session 
        ? await this.collection.insertOne(transaksi, { session: options.session })
        : await this.collection.insertOne(transaksi);

      return { success: true, data: result.insertedId };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Gagal menyimpan transaksi');
    }
  }

  async getStatistikHariIni() {
    try {
      console.log('📊 Getting today stats...');
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const pipeline = [
        {
          $match: {
            tanggal: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            total_pendapatan: { $sum: "$total_harga" },
            jumlah_transaksi: { $sum: 1 }
          }
        }
      ];

      const result = await this.collection.aggregate(pipeline).toArray();
      
      return result.length > 0 ? result[0] : { total_pendapatan: 0, jumlah_transaksi: 0 };
    } catch (error) {
      console.error('Error getting today stats:', error);
      throw new Error('Gagal mengambil statistik hari ini');
    }
  }

  async getLaporanPeriode(tanggalMulai, tanggalAkhir) {
    try {
      console.log('📊 Getting detailed report...');
      console.log('📊 Date range:', tanggalMulai, 'to', tanggalAkhir);

      // Parse tanggal
      const startDate = new Date(tanggalMulai + 'T00:00:00+07:00');
      const endDate = new Date(tanggalAkhir + 'T23:59:59+07:00');

      console.log('📊 Parsed dates:', startDate, 'to', endDate);

      // Simple find query dulu untuk test
      const transactions = await this.collection.find({
        tanggal: { $gte: startDate, $lte: endDate }
      }).sort({ tanggal: -1 }).toArray();

      console.log('📊 Raw transactions found:', transactions.length);

      // Format untuk frontend
      const formattedTransactions = transactions.map(t => ({
        tanggal: t.tanggal.toLocaleString('id-ID', { 
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        total_harga: t.total_harga,
        items: t.items
      }));

      console.log('📊 Formatted transactions:', formattedTransactions.length);
      return formattedTransactions;

    } catch (error) {
      console.error('❌ Error in getLaporanPeriode:', error);
      throw new Error(`Gagal mengambil laporan: ${error.message}`);
    }
  }
}

module.exports = new Transaksi();
