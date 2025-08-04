// ===== MENU MANAGEMENT SYSTEM (LENGKAP DENGAN FITUR PENCARIAN) =====
class MenuManager {
  /**
   * State untuk melacak menu yang sedang diedit.
   * Jika null, berarti mode "Tambah Baru". Jika berisi objek, berarti mode "Edit".
   */
  static editingMenu = null;

  /**
   * State untuk fitur pencarian dan filter
   */
  static searchTerm = '';
  static categoryFilter = '';
  static stockFilter = '';
  static searchInitialized = false;

  /**
   * Memuat data menu dan menginisialisasi event listener.
   */
  static async load() {
    try {
      await this.loadMenuData();
      this.initEventListeners();
      this.initSearchFeatures();
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
      throw error;
    }
  }

  // FITUR PENCARIAN: Inisialisasi search box dan filters
  static initSearchFeatures() {
    if (this.searchInitialized) return;
    this.searchInitialized = true;

    // Search input
    const searchInput = document.getElementById('menuManagementSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', 
        Utils.debounce((e) => {
          this.searchTerm = e.target.value.trim().toLowerCase();
          this.applyFilters();
        }, 300)
      );
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.categoryFilter = e.target.value;
        this.applyFilters();
      });
    }

    // Stock filter
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) {
      stockFilter.addEventListener('change', (e) => {
        this.stockFilter = e.target.value;
        this.applyFilters();
      });
    }

    // Add search results info element if not exists
    this.addSearchResultsInfo();
  }

  // Tambahkan info hasil pencarian
  static addSearchResultsInfo() {
    const container = document.querySelector('.menu-categories-container');
    if (!container || container.querySelector('.search-results-info')) return;

    const searchInfo = document.createElement('div');
    searchInfo.className = 'search-results-info';
    searchInfo.id = 'searchResultsInfo';
    container.insertBefore(searchInfo, container.firstChild);
  }

  // FITUR PENCARIAN: Apply semua filter
  static applyFilters() {
    const searchTerm = this.searchTerm;
    const categoryFilter = this.categoryFilter;
    const stockFilter = this.stockFilter;

    let totalVisible = 0;
    let totalItems = 0;

    // Filter setiap kategori
    ['main_menu', 'drinks', 'additional'].forEach(category => {
      const container = document.getElementById(this.getCategoryGridId(category));
      const categoryPanel = container?.closest('.category-panel');
      
      if (!container || !categoryPanel) return;

      const menuItems = container.querySelectorAll('.menu-item-card');
      let categoryVisible = 0;

      menuItems.forEach(item => {
        totalItems++;
        
        // Get menu data from element
        const name = (item.querySelector('h4')?.textContent || '').toLowerCase();
        const itemCategory = this.getItemCategory(item);
        const stockBadge = item.querySelector('.stock-badge');
        const isInfinite = stockBadge?.classList.contains('infinite') || false;
        const stockText = stockBadge?.textContent || '';
        const stockNumber = parseInt(stockText.match(/\d+/)?.[0] || '0');
        const isOutOfStock = stockBadge?.classList.contains('unavailable') || false;
        
        let isVisible = true;

        // Apply text search
        if (searchTerm.length >= 2) {
          isVisible = isVisible && name.includes(searchTerm);
        }

        // Apply category filter
        if (categoryFilter) {
          isVisible = isVisible && (itemCategory === categoryFilter);
        }

        // Apply stock filter
        if (stockFilter) {
          switch (stockFilter) {
            case 'available':
              isVisible = isVisible && (isInfinite || (!isOutOfStock && stockNumber > 0));
              break;
            case 'low':
              isVisible = isVisible && (!isInfinite && !isOutOfStock && stockNumber > 0 && stockNumber <= 10);
              break;
            case 'out':
              isVisible = isVisible && isOutOfStock;
              break;
            case 'infinite':
              isVisible = isVisible && isInfinite;
              break;
          }
        }

        // Show/hide item
        if (isVisible) {
          item.classList.remove('search-hidden');
          categoryVisible++;
          totalVisible++;
        } else {
          item.classList.add('search-hidden');
        }
      });

      // Show/hide category panel
      if (categoryVisible === 0 && menuItems.length > 0) {
        categoryPanel.classList.add('all-hidden');
      } else {
        categoryPanel.classList.remove('all-hidden');
      }

      // Update category count
      this.updateCategoryCount(category, categoryVisible, menuItems.length);
    });

    // Update search results info
    this.updateSearchResultsInfo(totalVisible, totalItems);
  }

  // Helper: Get item category from DOM position
  static getItemCategory(item) {
    const container = item.closest('.menu-items-grid');
    if (!container) return '';
    
    if (container.id === 'mainMenuGrid') return 'main_menu';
    if (container.id === 'drinksGrid') return 'drinks';
    if (container.id === 'additionalGrid') return 'additional';
    return '';
  }

  // Update info hasil pencarian
  static updateSearchResultsInfo(visible, total) {
    const searchInfo = document.getElementById('searchResultsInfo');
    if (!searchInfo) return;

    const hasFilters = this.searchTerm.length >= 2 || this.categoryFilter || this.stockFilter;

    if (hasFilters) {
      searchInfo.classList.add('active');
      
      let message = `Menampilkan ${visible} dari ${total} menu`;
      
      if (this.searchTerm.length >= 2) {
        message += ` untuk "<strong>${this.searchTerm}</strong>"`;
      }
      
      if (this.categoryFilter) {
        const categoryNames = {
          main_menu: 'Main Menu',
          drinks: 'Drinks', 
          additional: 'Additional'
        };
        message += ` dalam kategori <strong>${categoryNames[this.categoryFilter]}</strong>`;
      }

      if (this.stockFilter) {
        const stockNames = {
          available: 'stok tersedia',
          low: 'stok rendah',
          out: 'stok habis',
          infinite: 'stok tak terbatas'
        };
        message += ` dengan <strong>${stockNames[this.stockFilter]}</strong>`;
      }

      searchInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
      
      // Show clear filters button if needed
      if (!searchInfo.querySelector('.clear-filters-btn')) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'clear-filters-btn';
        clearBtn.innerHTML = '<i class="fas fa-times"></i> Bersihkan Filter';
        clearBtn.onclick = () => this.resetFilters();
        searchInfo.appendChild(clearBtn);
      }
    } else {
      searchInfo.classList.remove('active');
    }
  }

  // Helper: Update category count
  static updateCategoryCount(category, visibleCount, totalCount) {
    const countElement = document.getElementById(this.getCategoryCountId(category));
    if (countElement) {
      const hasFilters = this.searchTerm.length >= 2 || this.categoryFilter || this.stockFilter;
      if (hasFilters) {
        countElement.textContent = `${visibleCount}/${totalCount}`;
        countElement.classList.add('filtered');
      } else {
        countElement.textContent = totalCount;
        countElement.classList.remove('filtered');
      }
    }
  }

  // Helper: Get category grid ID
  static getCategoryGridId(category) {
    const gridIds = {
      main_menu: 'mainMenuGrid',
      drinks: 'drinksGrid',
      additional: 'additionalGrid'
    };
    return gridIds[category];
  }

  // Helper: Get category count ID  
  static getCategoryCountId(category) {
    const countIds = {
      main_menu: 'mainMenuCount',
      drinks: 'drinksCount',
      additional: 'additionalCount'
    };
    return countIds[category];
  }

  // Reset semua filter
  static resetFilters() {
    this.searchTerm = '';
    this.categoryFilter = '';
    this.stockFilter = '';

    // Reset form inputs
    const searchInput = document.getElementById('menuManagementSearchInput');
    const categorySelect = document.getElementById('categoryFilter');
    const stockSelect = document.getElementById('stockFilter');

    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (stockSelect) stockSelect.value = '';

    // Apply filters (akan menampilkan semua)
    this.applyFilters();
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
        countElement.classList.remove('filtered');
      }
      
      if (!container) return;

      if (menus.length === 0) {
        container.innerHTML = this.getEmptyCategoryHTML(categoryKey);
      } else {
        container.innerHTML = menus.map(menu => this.getMenuItemHTML(menu, categoryKey)).join('');
      }
    });

    // Apply current filters setelah render
    if (this.searchTerm || this.categoryFilter || this.stockFilter) {
      setTimeout(() => this.applyFilters(), 100);
    }
  }

  /**
   * Membuat HTML untuk placeholder kategori yang kosong.
   */
  static getEmptyCategoryHTML(category) {
    const icons = { main_menu: 'fa-utensils', drinks: 'fa-coffee', additional: 'fa-cookie-bite' };
    const titles = { main_menu: 'Main Menu', drinks: 'Drinks', additional: 'Additional' };
    return `
      <div class="empty-category">
        <i class="fas ${icons[category]}"></i>
        <p>Belum ada ${titles[category]}</p>
        <small>Tambahkan menu pertama Anda</small>
      </div>
    `;
  }

  /**
   * PERBAIKAN: Membuat HTML untuk satu item menu, dengan data attributes untuk pencarian.
   */
  static getMenuItemHTML(menu, category) {
    // Determine stock status
    const isOutOfStock = !menu.isInfinite && menu.stok <= 0;
    const isLowStock = !menu.isInfinite && menu.stok > 0 && menu.stok <= 10;
    
    let stockBadge;
    if (menu.isInfinite) {
      stockBadge = `<span class="stock-badge infinite">Tak Terbatas ∞</span>`;
    } else if (isOutOfStock) {
      stockBadge = `<span class="stock-badge unavailable">Stok Habis</span>`;
    } else if (isLowStock) {
      stockBadge = `<span class="stock-badge low">${menu.stok} Tersedia</span>`;
    } else {
      stockBadge = `<span class="stock-badge available">${menu.stok} Tersedia</span>`;
    }

    // Prepare menu data for editing (safe JSON stringify)
    const menuDataString = JSON.stringify({
      nama: menu.nama,
      harga: menu.harga,
      kategori: menu.kategori || category,
      stok: menu.stok || 0,
      isInfinite: menu.isInfinite || false
    }).replace(/'/g, "&apos;");

    return `
      <div class="menu-item-card" 
           data-menu-id="${menu._id}"
           data-name="${menu.nama.toLowerCase()}"
           data-category="${category}"
           data-stock="${menu.stok || 0}"
           data-infinite="${menu.isInfinite || false}">
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
        
        ${isOutOfStock ? '<div class="stock-warning">Stok Habis!</div>' : ''}
        ${isLowStock ? '<div class="stock-warning low">Stok Rendah!</div>' : ''}
      </div>
    `;
  }

  /**
   * PENYEMPURNAAN: Menginisialisasi semua event listener dengan cara yang aman.
   */
  static initEventListeners() {
    // Tombol "Tambah Menu Baru"
    const showAddMenuBtn = document.getElementById('showAddMenuBtn');
    if (showAddMenuBtn) {
      showAddMenuBtn.onclick = () => this.showAddMenuModal();
    }

    // Form Menu (Submit) - Ganti node untuk hapus listener lama, lalu pasang yang baru
    const addMenuForm = document.getElementById('addMenuForm');
    if (addMenuForm) {
      const newForm = addMenuForm.cloneNode(true);
      addMenuForm.parentNode.replaceChild(newForm, addMenuForm);
      newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Tombol Batal & Tutup
    ['cancelAddMenu', 'closeAddMenuModal'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.onclick = () => this.hideAddMenuModal();
      }
    });

    // Checkbox Stok Tak Terbatas
    const infiniteCheckbox = document.getElementById('isInfiniteStock');
    if (infiniteCheckbox) {
      infiniteCheckbox.onchange = (e) => {
        const stokContainer = document.getElementById('stokMenuContainer');
        if (stokContainer) {
          stokContainer.classList.toggle('hidden', e.target.checked);
        }
      };
    }
  }

  /**
   * Menampilkan modal untuk menambah menu baru.
   */
  static showAddMenuModal() {
    this.resetAddMenuForm();
    const modalTitle = document.getElementById('addMenuModalTitle');
    const submitBtn = document.querySelector('#addMenuForm button[type="submit"]');
    
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Tambah Menu Baru';
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Menu';
    
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
    const form = document.getElementById('addMenuForm');
    if (form) {
      form.reset();
    }
    
    const infiniteCheckbox = document.getElementById('isInfiniteStock');
    if (infiniteCheckbox) {
      infiniteCheckbox.dispatchEvent(new Event('change'));
    }
    
    this.editingMenu = null;
  }
  
  /**
   * PERBAIKAN: Menyiapkan modal untuk mode edit.
   */
  static editMenu(menuData) {
    this.editingMenu = menuData;

    // Ganti judul modal dan tombol untuk menandakan mode edit
    const modalTitle = document.getElementById('addMenuModalTitle');
    const submitBtn = document.querySelector('#addMenuForm button[type="submit"]');
    
    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Menu';
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Menu';

    // Isi form dengan data yang ada
    const namaInput = document.getElementById('namaMenu');
    const hargaInput = document.getElementById('hargaMenu');
    const kategoriSelect = document.getElementById('kategoriMenu');
    const isInfiniteCheckbox = document.getElementById('isInfiniteStock');
    const stokInput = document.getElementById('stokMenu');

    if (namaInput) namaInput.value = menuData.nama;
    if (hargaInput) hargaInput.value = menuData.harga;
    if (kategoriSelect) kategoriSelect.value = menuData.kategori;
    
    if (isInfiniteCheckbox) {
      isInfiniteCheckbox.checked = menuData.isInfinite;
      isInfiniteCheckbox.dispatchEvent(new Event('change'));
    }

    if (stokInput) stokInput.value = menuData.stok;

    ModalManager.show('addMenuModal');
  }

  /**
   * PERBAIKAN UTAMA: Handler form tunggal yang cerdas untuk mode Tambah dan Update.
   */
  static async handleFormSubmit() {
    try {
      const nama = document.getElementById('namaMenu')?.value?.trim();
      const harga = document.getElementById('hargaMenu')?.value;
      const kategori = document.getElementById('kategoriMenu')?.value;
      const isInfinite = document.getElementById('isInfiniteStock')?.checked || false;
      const stok = isInfinite ? 0 : (document.getElementById('stokMenu')?.value || 0);

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

      const payload = { 
        nama, 
        harga: parseInt(harga), 
        kategori, 
        stok: parseInt(stok), 
        isInfinite 
      };

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
    if (!confirm(`Yakin ingin menghapus menu "${nama}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await Utils.apiCall(`/menu/${encodeURIComponent(nama)}`, { method: 'DELETE' });
      Utils.showNotification('Menu berhasil dihapus! 🗑️', 'success');
      await this.loadMenuData();
      
      if (WarkopBabol.currentTab === 'dashboard') {
        Dashboard.load();
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
    }
  }

  /**
   * Refresh data menu (utility function)
   */
  static async refresh() {
    await this.loadMenuData();
  }

  /**
   * Reset state saat keluar dari tab
   */
  static reset() {
    this.editingMenu = null;
    this.searchTerm = '';
    this.categoryFilter = '';
    this.stockFilter = '';
    this.searchInitialized = false;
  }
}

// Ekspor ke window object agar bisa diakses dari HTML
window.MenuManager = MenuManager;
