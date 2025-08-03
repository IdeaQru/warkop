const database = require('../config/db');

class Menu {
  constructor() {
    this.collection = null;
  }

  /**
   * Menginisialisasi koneksi ke collection 'menu' di database.
   */
  init() {
    this.collection = database.getDB().collection('menu');
  }

  /**
   * Membuat menu baru di database dengan validasi tipe data.
   * @param {object} menuData - Data menu yang akan dibuat.
   * @returns {Promise<object>} Hasil operasi insert.
   */
  async create(menuData) {
    try {
      // Validasi dan sanitasi data sebelum disimpan
      const isInfinite = menuData.isInfinite || false;
      const menu = {
        nama: menuData.nama,
        harga: parseInt(menuData.harga, 10),
        kategori: menuData.kategori.toLowerCase(),
        stok: isInfinite ? 0 : parseInt(menuData.stok, 10) || 0,
        isInfinite: isInfinite,
        aktif: true,
        dibuat: new Date(),
        diupdate: new Date()
      };
      
      const result = await this.collection.insertOne(menu);
      // Mengembalikan dokumen yang baru saja dibuat
      return { success: true, data: result.insertedId };
    } catch (error) {
      console.error('Error creating menu:', error);
      throw new Error('Gagal menambah menu');
    }
  }

  /**
   * PERBAIKAN: Menggabungkan getAll dan getByCategory menjadi satu fungsi yang lebih efisien.
   * Mengambil semua menu yang aktif dan mengelompokkannya berdasarkan kategori.
   * @returns {Promise<object>} Objek berisi menu yang sudah dikelompokkan.
   */
  async getAll() {
    try {
      const allMenus = await this.collection.find({ aktif: true }).sort({ dibuat: -1 }).toArray();
      
      const groupedMenus = {
        main_menu: [],
        drinks: [],
        additional: []
      };

      // Mengelompokkan menu di sisi server, lebih efisien daripada filter terpisah
      for (const menu of allMenus) {
        if (groupedMenus[menu.kategori]) {
          groupedMenus[menu.kategori].push(menu);
        }
      }
      
      return groupedMenus;
    } catch (error) {
      console.error('Error getting menus by category:', error);
      throw new Error('Gagal mengambil data menu berdasarkan kategori');
    }
  }
  async getByCategory(kategori) {
    try {
      const allMenus = await this.collection.find({ kategori: kategori, aktif: true }).sort({ dibuat: -1 }).toArray();
      return allMenus;
    } catch (error) {
      console.error('Error getting menus by category:', error);
      throw new Error('Gagal mengambil data menu berdasarkan kategori');
    }
  }

  /**
   * Melakukan "soft delete" pada menu dengan mengubah status 'aktif' menjadi false.
   * @param {string} nama - Nama menu yang akan dihapus.
   * @returns {Promise<object>} Status keberhasilan operasi.
   */
  async delete(nama) {
    try {
      const result = await this.collection.updateOne(
        { nama: nama, aktif: true },
        { 
          $set: { 
            aktif: false,
            diupdate: new Date()
          }
        }
      );
      
      if (result.matchedCount === 0) {
        return { success: false, message: 'Menu tidak ditemukan untuk dihapus' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw new Error('Gagal menghapus menu');
    }
  }

  /**
   * PERBAIKAN: Fungsi update yang lebih aman dengan validasi tipe data.
   * Memperbarui data menu yang sudah ada.
   * @param {string} originalNama - Nama asli menu yang akan diupdate.
   * @param {object} updateData - Data baru untuk menu.
   * @returns {Promise<object>} Status keberhasilan operasi.
   */
  async update(originalNama, updateData) {
    try {
      // Buat salinan untuk sanitasi agar tidak mengubah objek asli
      const sanitizedData = { ...updateData };

      // Pastikan tipe data benar sebelum dikirim ke database
      if (sanitizedData.harga) sanitizedData.harga = parseInt(sanitizedData.harga, 10);
      if (sanitizedData.stok) sanitizedData.stok = parseInt(sanitizedData.stok, 10);
      if (typeof sanitizedData.isInfinite !== 'undefined') {
        sanitizedData.isInfinite = Boolean(sanitizedData.isInfinite);
      }
      if (sanitizedData.kategori) sanitizedData.kategori = sanitizedData.kategori.toLowerCase();

      // Payload untuk dikirim ke MongoDB
      const updatePayload = {
        $set: {
          ...sanitizedData,
          diupdate: new Date()
        }
      };
      
      const result = await this.collection.updateOne(
        { nama: originalNama, aktif: true }, // Filter berdasarkan nama asli
        updatePayload
      );
      
      if (result.matchedCount === 0) {
        return { success: false, message: 'Menu tidak ditemukan untuk diupdate' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating menu:', error);
      throw new Error('Gagal mengupdate menu');
    }
  }
  
  /**
   * Mengurangi stok untuk beberapa item secara atomik menggunakan bulk write.
   * @param {Array<object>} items - Array item yang akan dikurangi stoknya.
   * @param {ClientSession} session - Session MongoDB untuk transaksi.
   */
// backend/models/Menu.js - Perbaikan fungsi kurangiStok
// backend/models/Menu.js
// Tambahkan fungsi ini di dalam class Menu

/**
 * Mengurangi stok tanpa menggunakan MongoDB session (untuk standalone MongoDB)
 * @param {Array<object>} items - Array item yang akan dikurangi stoknya.
 */
async kurangiStokTanpaSession(items) {
  console.log('📉 kurangiStokTanpaSession called with items:', items);
  
  // Filter item yang tidak infinite
  const finiteStockItems = items.filter(item => !item.isInfinite);
  console.log('📉 Finite stock items to process:', finiteStockItems);

  if (finiteStockItems.length === 0) {
    console.log('ℹ️ No finite stock items to reduce');
    return;
  }

  const bulkOps = finiteStockItems.map(item => ({
    updateOne: {
      filter: { 
        nama: item.nama, 
        aktif: true,
        stok: { $gte: item.jumlah }
      },
      update: { 
        $inc: { stok: -item.jumlah },
        $set: { diupdate: new Date() }
      },
    },
  }));

  console.log('📉 Bulk operations to execute:', JSON.stringify(bulkOps, null, 2));

  // TANPA SESSION - untuk standalone MongoDB
  const result = await this.collection.bulkWrite(bulkOps);
  console.log('📉 Bulk write result:', result);
  
  // Cek apakah semua stok berhasil dikurangi
  if (result.modifiedCount !== finiteStockItems.length) {
    console.error(`❌ Expected to modify ${finiteStockItems.length} documents, but only modified ${result.modifiedCount}`);
    throw new Error(`Stok tidak mencukupi untuk beberapa item. Modified: ${result.modifiedCount}, Expected: ${finiteStockItems.length}`);
  }
  
  console.log('✅ All stock reductions successful');
}


}

module.exports = new Menu();
