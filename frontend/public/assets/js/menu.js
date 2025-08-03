// ===== MENU MANAGEMENT SYSTEM (LENGKAP & DIPERBAIKI) =====
class MenuManager {
  /**
   * State untuk melacak menu yang sedang diedit.
   * Jika null, berarti mode "Tambah Baru". Jika berisi objek, berarti mode "Edit".
   */
  static editingMenu = null;

  /**
   * Memuat data menu dan menginisialisasi event listener.
   */
  static async load() {
    try {
      await this.loadMenuData();
      this.initEventListeners();
    } catch (error) {
      console.error('Error loading menu management:', error);
      Utils.showNotification('Gagal memuat data menu', 'error');
    }
  }

  /**
   * Mengambil data menu dari API dan memicu render ulang.
   */
  static async loadMenuData() {
    try {
      const result = await Utils.apiCall('/menu');
      WarkopBabol.menuData = result.data;
      this.displayMenuByCategory();
    } catch (error) {
      console.error('Error loading menu data:', error);
      // Notifikasi error sudah ditangani oleh Utils.apiCall
      throw error;
    }
  }

  /**
   * Menampilkan menu yang sudah dikelompokkan ke dalam kategori di UI.
   */
  static displayMenuByCategory() {
    const categories = {
      main_menu: { containerId: 'mainMenuGrid', countId: 'mainMenuCount' },
      drinks: { containerId: 'drinksGrid', countId: 'drinksCount' },
      additional: { containerId: 'additionalGrid', countId: 'additionalCount' }
    };

    Object.keys(categories).forEach(categoryKey => {
      const { containerId, countId } = categories[categoryKey];
      const container = document.getElementById(containerId);
      const countElement = document.getElementById(countId);
      const menus = WarkopBabol.menuData[categoryKey] || [];

      if (countElement) {
        countElement.textContent = menus.length;
      }
      if (!container) return;

      if (menus.length === 0) {
        container.innerHTML = this.getEmptyCategoryHTML(categoryKey);
      } else {
        container.innerHTML = menus.map(menu => this.getMenuItemHTML(menu)).join('');
      }
    });
  }

  /**
   * Membuat HTML untuk placeholder kategori yang kosong.
   */
  static getEmptyCategoryHTML(category) {
    const icons = { main_menu: 'fa-utensils', drinks: 'fa-coffee', additional: 'fa-cookie-bite' };
    const titles = { main_menu: 'Main Menu', drinks: 'Drinks', additional: 'Additional' };
    return `<div class="empty-category"><i class="fas ${icons[category]}"></i><p>Belum ada ${titles[category]}</p><small>Tambahkan menu pertama Anda</small></div>`;
  }

  /**
   * PERBAIKAN: Membuat HTML untuk satu item menu, termasuk badge stok dan data untuk edit.
   */
  static getMenuItemHTML(menu) {
    let stockBadge;
    if (menu.isInfinite) {
      stockBadge = `<span class="stock-badge infinite">Tak Terbatas ∞</span>`;
    } else if (menu.stok > 0) {
      stockBadge = `<span class="stock-badge available">${menu.stok} Tersedia</span>`;
    } else {
      stockBadge = `<span class="stock-badge unavailable">Stok Habis</span>`;
    }

    // Menggunakan JSON.stringify untuk mengirim objek data menu dengan aman ke fungsi onclick
    const menuDataString = JSON.stringify({
      nama: menu.nama,
      harga: menu.harga,
      kategori: menu.kategori,
      stok: menu.stok || 0,
      isInfinite: menu.isInfinite || false
    }).replace(/'/g, "&apos;"); // Mengganti kutip tunggal agar aman di dalam atribut HTML

    return `
      <div class="menu-item-card" data-menu-id="${menu._id}">
        ${stockBadge}
        <h4>${menu.nama}</h4>
        <p class="price">${Utils.formatRupiah(menu.harga)}</p>
        <div class="menu-item-actions">
          <button class="btn btn-secondary btn-sm" onclick='MenuManager.editMenu(${menuDataString})'>
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="MenuManager.deleteMenu('${menu.nama.replace(/'/g, "\\'")}')">
            <i class="fas fa-trash"></i> Hapus
          </button>
        </div>
      </div>
    `;
  }

  /**
   * PENYEMPURNAAN: Menginisialisasi semua event listener dengan cara yang aman.
   */
  static initEventListeners() {
    // Tombol "Tambah Menu Baru"
    document.getElementById('showAddMenuBtn').onclick = () => this.showAddMenuModal();

    // Form Menu (Submit) - Ganti node untuk hapus listener lama, lalu pasang yang baru
    const addMenuForm = document.getElementById('addMenuForm');
    const newForm = addMenuForm.cloneNode(true);
    addMenuForm.parentNode.replaceChild(newForm, addMenuForm);
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit(); // Satu handler untuk Tambah & Update
    });

    // Tombol Batal & Tutup
    ['cancelAddMenu', 'closeAddMenuModal'].forEach(id => {
      document.getElementById(id).onclick = () => this.hideAddMenuModal();
    });

    // Checkbox Stok Tak Terbatas
    document.getElementById('isInfiniteStock').onchange = (e) => {
      document.getElementById('stokMenuContainer').classList.toggle('hidden', e.target.checked);
    };
  }

  /**
   * Menampilkan modal untuk menambah menu baru.
   */
  static showAddMenuModal() {
    this.resetAddMenuForm();
    document.getElementById('addMenuModalTitle').textContent = 'Tambah Menu Baru';
    document.querySelector('#addMenuForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Simpan Menu';
    ModalManager.show('addMenuModal');
  }

  /**
   * Menyembunyikan dan mereset modal menu.
   */
static hideAddMenuModal() {
  const modal = document.getElementById('addMenuModal');
  if (modal) {
    modal.classList.remove('show');
  }
  document.body.style.overflow = 'auto';
  this.resetAddMenuForm();
}


  /**
   * Mereset form menu ke keadaan awal dan menghapus state editing.
   */
  static resetAddMenuForm() {
    document.getElementById('addMenuForm').reset();
    document.getElementById('isInfiniteStock').dispatchEvent(new Event('change'));
    this.editingMenu = null; // Penting untuk kembali ke mode "Tambah Baru"
  }
  
  /**
   * PERBAIKAN: Menyiapkan modal untuk mode edit.
   */
  static editMenu(menuData) {
    this.editingMenu = menuData; // Simpan data menu asli yang akan diedit

    // Ganti judul modal dan tombol untuk menandakan mode edit
    document.getElementById('addMenuModalTitle').textContent = 'Edit Menu';
    document.querySelector('#addMenuForm button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Update Menu';

    // Isi form dengan data yang ada
    document.getElementById('namaMenu').value = menuData.nama;
    document.getElementById('hargaMenu').value = menuData.harga;
    document.getElementById('kategoriMenu').value = menuData.kategori;
    
    const isInfiniteCheckbox = document.getElementById('isInfiniteStock');
    isInfiniteCheckbox.checked = menuData.isInfinite;
    isInfiniteCheckbox.dispatchEvent(new Event('change')); // Memicu show/hide input stok

    document.getElementById('stokMenu').value = menuData.stok;

    ModalManager.show('addMenuModal');
  }

  /**
   * PERBAIKAN UTAMA: Handler form tunggal yang cerdas untuk mode Tambah dan Update.
   */
  static async handleFormSubmit() {
    try {
      const nama = document.getElementById('namaMenu').value.trim();
      const harga = document.getElementById('hargaMenu').value;
      const kategori = document.getElementById('kategoriMenu').value;
      const isInfinite = document.getElementById('isInfiniteStock').checked;
      const stok = isInfinite ? 0 : document.getElementById('stokMenu').value;

      // Validasi dasar
      if (!nama || !harga || !kategori) {
        return Utils.showNotification('Nama, harga, dan kategori harus diisi', 'warning');
      }
      if (parseInt(harga) <= 0) {
        return Utils.showNotification('Harga harus lebih besar dari 0', 'warning');
      }

      // Validasi nama duplikat yang lebih pintar
      const allMenus = Object.values(WarkopBabol.menuData).flat();
      const isDuplicate = allMenus.some(menu => 
        menu.nama.toLowerCase() === nama.toLowerCase() && 
        (!this.editingMenu || this.editingMenu.nama.toLowerCase() !== nama.toLowerCase())
      );

      if (isDuplicate) {
        return Utils.showNotification('Menu dengan nama tersebut sudah ada!', 'warning');
      }

      const payload = { nama, harga: parseInt(harga), kategori, stok: parseInt(stok), isInfinite };

      if (this.editingMenu) {
        // === MODE UPDATE ===
        await Utils.apiCall(`/menu/${encodeURIComponent(this.editingMenu.nama)}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        Utils.showNotification('Menu berhasil diupdate! 🎉', 'success');
      } else {
        // === MODE CREATE ===
        await Utils.apiCall('/menu', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        Utils.showNotification('Menu berhasil ditambahkan! 🎉', 'success');
      }

      this.hideAddMenuModal();
      await this.loadMenuData();
      
      // Update dashboard jika sedang aktif
      if (WarkopBabol.currentTab === 'dashboard') {
        Dashboard.load();
      }
    } catch (error) {
      console.error('Error submitting menu form:', error);
    }
  }

  /**
   * Menghapus menu setelah konfirmasi.
   */
  static async deleteMenu(nama) {
    if (!confirm(`Yakin ingin menghapus menu "${nama}"?`)) return;

    try {
      await Utils.apiCall(`/menu/${encodeURIComponent(nama)}`, { method: 'DELETE' });
      Utils.showNotification('Menu berhasil dihapus! 🗑️', 'success');
      await this.loadMenuData();
      if (WarkopBabol.currentTab === 'dashboard') Dashboard.load();
    } catch (error) {
      console.error('Error deleting menu:', error);
    }
  }
}

// Ekspor ke window object agar bisa diakses dari HTML
window.MenuManager = MenuManager;
