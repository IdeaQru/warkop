// backend/models/Transaksi.js
const database = require('../config/db');
// Backend - Delete Method (Fixed)
const { ObjectId } = require('mongodb');  // Import ObjectId from MongoDB



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

  // Create Method
  async create(transaksiData, options = {}) {
    try {
      const { items, tipe_pembayaran } = transaksiData;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Items transaksi tidak boleh kosong');
      }

      const total_harga = items.reduce((total, item) => {
        const harga = Number(item.harga);
        const jumlah = Number(item.jumlah);
        if (Number.isNaN(harga) || Number.isNaN(jumlah)) {
          throw new Error('Harga atau jumlah tidak valid');
        }
        return total + (harga * jumlah);
      }, 0);

      // Normalisasi & validasi tipe pembayaran
      let paymentType = (tipe_pembayaran || 'tunai').toString().trim().toLowerCase();
      if (!['tunai', 'non_tunai'].includes(paymentType)) {
        throw new Error('tipe_pembayaran harus "tunai" atau "non_tunai"');
      }

      const now = new Date();
      const transaksi = {
        items: items.map(item => ({
          nama_menu: item.nama,
          harga: parseInt(item.harga, 10),
          jumlah: parseInt(item.jumlah, 10)
        })),
        total_harga: total_harga,
        tipe_pembayaran: paymentType, // ← field baru
        tanggal: now,
        dibuat: now
      };

      // Insert the transaction and capture the inserted ID
      const result = options.session
        ? await this.collection.insertOne(transaksi, { session: options.session })
        : await this.collection.insertOne(transaksi);

      // Ensure we send back the _id with the response
      const insertedTransaction = await this.collection.findOne({ _id: result.insertedId });
      return { success: true, data: insertedTransaction }; // Returning the complete transaction, including _id
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Gagal menyimpan transaksi');
    }
  }

  // Edit Method
// Edit transaction handler
static editTransaction(index) {
  const transaksi = this.currentReportData.data[index];
  console.log('Editing transaction', transaksi);

  const modal = document.getElementById('editTransactionModal');
  const namaMenuInput = document.getElementById('editNamaMenu');
  const hargaInput = document.getElementById('editHarga');
  const jumlahInput = document.getElementById('editJumlah');
  const tipePembayaranInput = document.getElementById('editTipePembayaran');
  
  // Populate the modal with current data, including _id
  namaMenuInput.value = transaksi.items[0].nama_menu;
  hargaInput.value = transaksi.items[0].harga;
  jumlahInput.value = transaksi.items[0].jumlah;
  tipePembayaranInput.value = transaksi.tipe_pembayaran;

  // Show modal
  modal.style.display = 'block';

  const saveButton = document.getElementById('saveEditTransaction');
  saveButton.onclick = async () => {
    try {
      const updatedNamaMenu = namaMenuInput.value;
      const updatedHarga = parseInt(hargaInput.value, 10);
      const updatedJumlah = parseInt(jumlahInput.value, 10);
      const updatedTipePembayaran = tipePembayaranInput.value;

      if (isNaN(updatedHarga) || isNaN(updatedJumlah)) {
        Utils.showNotification('Harga dan jumlah harus valid', 'error');
        return;
      }

      // Prepare updated transaction data
      const updatedTransaction = {
        items: [{
          nama_menu: updatedNamaMenu,
          harga: updatedHarga,
          jumlah: updatedJumlah
        }],
        total_harga: updatedHarga * updatedJumlah,
        tipe_pembayaran: updatedTipePembayaran
      };

      // Get the _id of the transaction to update
      const transaksiId = transaksi._id; // The correct _id should be passed here

      const response = await Utils.apiCall(`/transaksi/${transaksiId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedTransaction)
      });

      if (response.success) {
        this.currentReportData.data[index] = { ...this.currentReportData.data[index], ...updatedTransaction };
        modal.style.display = 'none';
        this.displayDetailReport(this.currentReportData.data, this.currentReportData.tanggalMulai, this.currentReportData.tanggalAkhir);
        Utils.showNotification('Transaksi berhasil diperbarui', 'success');
      } else {
        throw new Error('Failed to update transaction');
      }
    } catch (error) {
      console.error('Error editing transaction:', error);
      Utils.showNotification('Gagal memperbarui transaksi', 'error');
    }
  };
}



  // Delete Method
async delete(id) {
  try {
    const objectId = new ObjectId(id);  // Convert string ID to ObjectId

    // Check if the transaction exists
    const transaction = await this.collection.findOne({ _id: objectId });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Delete the transaction
    await this.collection.deleteOne({ _id: objectId });

    console.log(`✅ Transaction with ID: ${id} deleted successfully`);
    return { success: true, message: 'Transaction deleted successfully' };
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }
}




  async getStatistikHariIni() {
    try {
      console.log('📊 Getting today stats...');

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Agregasi total harian + breakdown per tipe pembayaran
      const pipeline = [
        {
          $match: {
            tanggal: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            total_pendapatan: { $sum: '$total_harga' },
            jumlah_transaksi: { $sum: 1 }
          }
        }
      ];

      const result = await this.collection.aggregate(pipeline).toArray();

      // Pipeline kedua untuk breakdown per tipe pembayaran (opsional tapi direkomendasikan)
      const breakdownPipeline = [
        {
          $match: {
            tanggal: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: {
              $ifNull: ['$tipe_pembayaran', 'tunai'] // data lama default tunai
            },
            total_pendapatan: { $sum: '$total_harga' },
            jumlah_transaksi: { $sum: 1 }
          }
        }
      ];
      const breakdown = await this.collection.aggregate(breakdownPipeline).toArray();

      const base = result.length > 0 ? result[0] : { total_pendapatan: 0, jumlah_transaksi: 0 };

      const by_payment_type = breakdown.reduce((acc, row) => {
        acc[row._id] = {
          total_pendapatan: row.total_pendapatan,
          jumlah_transaksi: row.jumlah_transaksi
        };
        return acc;
      }, {});

      return { ...base, by_payment_type };
    } catch (error) {
      console.error('Error getting today stats:', error);
      throw new Error('Gagal mengambil statistik hari ini');
    }
  }

  async getLaporanPeriode(tanggalMulai, tanggalAkhir) {
    try {
      console.log('📊 Getting detailed report...');
      console.log('📊 Date range:', tanggalMulai, 'to', tanggalAkhir);

      const startDate = new Date(tanggalMulai + 'T00:00:00+07:00');
      const endDate = new Date(tanggalAkhir + 'T23:59:59+07:00');

      console.log('📊 Parsed dates:', startDate, 'to', endDate);

      const transactions = await this.collection.find({
        tanggal: { $gte: startDate, $lte: endDate }
      }).sort({ tanggal: -1 }).toArray();

      console.log('📊 Raw transactions found:', transactions.length);

      const formattedTransactions = transactions.map(t => ({
        _id: t._id,
        tanggal: t.tanggal.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        total_harga: t.total_harga,
        tipe_pembayaran: t.tipe_pembayaran || 'tunai', // ← tampilkan, default bila data lama
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
