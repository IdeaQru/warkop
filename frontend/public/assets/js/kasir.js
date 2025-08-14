// ===== KASIR (POINT OF SALE) SYSTEM DENGAN MANAJEMEN STOK DAN PENCARIAN =====
class Kasir {
  static currentCategory = 'main_menu';
  static eventListenersInitialized = false;
  static searchTerm = '';

  static async load() {
    try {
      await this.loadMenuData();

      if (!this.eventListenersInitialized) {
        this.initEventListeners();
        this.initSearchBox(); // Tambahan untuk inisialisasi search box
        this.eventListenersInitialized = true;
      }

      this.displayMenuByCategory();
      this.updateOrderDisplay();
      this.fixCardTextTruncation();

    } catch (error) {
      console.error('Error loading kasir:', error);
      Utils.showNotification('Gagal memuat data kasir', 'error');
    }
  }

  static async loadMenuData() {
    try {
      const result = await Utils.apiCall('/menu');
      WarkopBabol.menuData = result.data;
    } catch (error) {
      console.error('Error loading menu data for kasir:', error);
      throw error;
    }
  }

  static initEventListeners() {
    // Category tabs
    const categoryTabsContainer = document.querySelector('.category-tabs');
    if (categoryTabsContainer) {
      categoryTabsContainer.replaceWith(categoryTabsContainer.cloneNode(true));
      document.querySelector('.category-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (tab) {
          const category = tab.getAttribute('data-category');
          this.switchCategory(category, tab);
        }
      });
    }

    // Clear order button
    const clearOrderBtn = document.getElementById('clearOrderBtn');
    if (clearOrderBtn) {
      const newClearBtn = clearOrderBtn.cloneNode(true);
      clearOrderBtn.parentNode.replaceChild(newClearBtn, clearOrderBtn);
      newClearBtn.addEventListener('click', () => this.clearOrder());
    }

    // Process order button dengan debouncing
    const processOrderBtn = document.getElementById('processOrderBtn');
    if (processOrderBtn) {
      const newProcessBtn = processOrderBtn.cloneNode(true);
      processOrderBtn.parentNode.replaceChild(newProcessBtn, processOrderBtn);
      newProcessBtn.addEventListener('click', this.debouncedProcessOrder.bind(this));
    }
  }

  /* FITUR PENCARIAN: Inisialisasi search box */
  static initSearchBox() {
    const input = document.getElementById('menuSearchInput');
    if (!input) return;

    // Hindari double binding
    if (input.dataset.initialized) return;
    input.dataset.initialized = 'true';

    // Gunakan debounce agar ringan
    input.addEventListener(
      'input',
      Utils.debounce((e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.filterMenuCards();
      }, 200)
    );

    // Clear search saat pindah kategori
    input.addEventListener('focus', () => {
      if (input.value.trim() === '') {
        this.searchTerm = '';
        this.filterMenuCards();
      }
    });
  }

  /* FITUR PENCARIAN: Sembunyikan/tampilkan kartu menu sesuai kata kunci */
  static filterMenuCards() {
    const search = this.searchTerm;
    const containerSelector = this.getActiveContainerSelector();

    document.querySelectorAll(`${containerSelector} .kasir-menu-item`).forEach((card) => {
      const name = card.dataset.name || '';
      const match = search.length < 2 ? true : name.includes(search);
      card.style.display = match ? 'block' : 'none';
    });

    // Tampilkan pesan jika tidak ada hasil
    this.showSearchResults(search);
  }

  /* Helper: Dapatkan selector container yang aktif */
  static getActiveContainerSelector() {
    const containerMap = {
      main_menu: '#kasirMainMenu',
      drinks: '#kasirDrinks',
      additional: '#kasirAdditional'
    };
    return containerMap[this.currentCategory];
  }

  /* Tampilkan pesan hasil pencarian */
  static showSearchResults(searchTerm) {
    if (searchTerm.length < 2) return;

    const containerSelector = this.getActiveContainerSelector();
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const visibleCards = container.querySelectorAll('.kasir-menu-item[style*="block"], .kasir-menu-item:not([style*="none"])');

    // Hapus pesan pencarian yang sudah ada
    const existingMessage = container.querySelector('.search-result-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Tampilkan pesan jika tidak ada hasil
    if (visibleCards.length === 0) {
      const noResultMessage = document.createElement('div');
      noResultMessage.className = 'search-result-message';
      noResultMessage.innerHTML = `
        <div class="no-search-result">
          <i class="fas fa-search"></i>
          <p>Tidak ada menu ditemukan</p>
          <small>Coba kata kunci lain untuk "${searchTerm}"</small>
        </div>
      `;
      container.appendChild(noResultMessage);
    }
  }

  static debouncedProcessOrder = this.debounce(() => {
    this.processOrder();
  }, 1000);

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static switchCategory(category, clickedTab = null) {
    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.remove('active');
    });

    if (clickedTab) {
      clickedTab.classList.add('active');
    } else {
      const targetTab = document.querySelector(`[data-category="${category}"]`);
      if (targetTab) targetTab.classList.add('active');
    }

    // Update active content
    document.querySelectorAll('.menu-category-grid').forEach(grid => {
      grid.classList.remove('active');
    });

    const gridIds = {
      main_menu: 'kasirMainMenu',
      drinks: 'kasirDrinks',
      additional: 'kasirAdditional'
    };

    const targetGrid = document.getElementById(gridIds[category]);
    if (targetGrid) {
      targetGrid.classList.add('active');
    }

    // Update current category dan filter ulang
    this.currentCategory = category;

    // Reset search box saat pindah kategori
    const searchInput = document.getElementById('menuSearchInput');
    if (searchInput && this.searchTerm) {
      // Terapkan filter pada kategori baru
      setTimeout(() => this.filterMenuCards(), 100);
    }
  }

  static displayMenuByCategory() {
    const categories = {
      main_menu: 'kasirMainMenu',
      drinks: 'kasirDrinks',
      additional: 'kasirAdditional'
    };

    Object.keys(categories).forEach(categoryKey => {
      const containerId = categories[categoryKey];
      const container = document.getElementById(containerId);
      const menus = WarkopBabol.menuData[categoryKey] || [];

      if (!container) return;

      if (menus.length === 0) {
        container.innerHTML = this.getEmptyMenuHTML(categoryKey);
        return;
      }

      container.innerHTML = menus.map(menu => this.getKasirMenuItemHTML(menu)).join('');
    });

    // Terapkan filter setelah menu ditampilkan
    if (this.searchTerm) {
      setTimeout(() => this.filterMenuCards(), 100);
    }
  }

  static getEmptyMenuHTML(category) {
    const titles = {
      main_menu: 'Main Menu',
      drinks: 'Drinks',
      additional: 'Additional'
    };

    return `
      <div class="empty-category">
        <i class="fas fa-exclamation-circle"></i>
        <p>Tidak ada ${titles[category]}</p>
        <small>Tambahkan menu terlebih dahulu</small>
      </div>
    `;
  }

  // PERBAIKAN: Menampilkan stok dan validasi saat diklik + data-name untuk pencarian
  static getKasirMenuItemHTML(menu) {
    const isOutOfStock = !menu.isInfinite && menu.stok <= 0;
    const stockClass = isOutOfStock ? 'out-of-stock' : '';

    let stockBadge;
    if (menu.isInfinite) {
      stockBadge = `<span class="stock-badge-kasir infinite">∞</span>`;
    } else if (isOutOfStock) {
      stockBadge = `<span class="stock-badge-kasir unavailable">Habis</span>`;
    } else {
      stockBadge = `<span class="stock-badge-kasir available">${menu.stok}</span>`;
    }

    const clickHandler = isOutOfStock
      ? `onclick="Utils.showNotification('Stok menu ${menu.nama} sudah habis!', 'warning')"`
      : `onclick="Kasir.addToOrder('${menu._id}', '${menu.nama.replace(/'/g, "\\'")}', ${menu.harga}, ${menu.stok}, ${menu.isInfinite})"`;

    return `
      <div class="kasir-menu-item ${stockClass}" 
           data-name="${menu.nama.toLowerCase()}" 
           ${clickHandler}>
        ${stockBadge}
        <h5>${menu.nama}</h5>
        <p class="price">${Utils.formatRupiah(menu.harga)}</p>
      </div>
    `;
  }

  // PERBAIKAN: Validasi stok saat menambah ke pesanan
  static addToOrder(id, nama, harga, stokTersedia, isInfinite) {
    // Bypass cek stok jika item tak terbatas
    if (!isInfinite) {
      const existingItem = WarkopBabol.currentOrder.find(item => item.id === id);
      const jumlahDipesan = existingItem ? existingItem.jumlah + 1 : 1;

      if (jumlahDipesan > stokTersedia) {
        Utils.showNotification(`Stok ${nama} tidak mencukupi! Sisa: ${stokTersedia}`, 'warning');
        return;
      }
    }

    const existingItem = WarkopBabol.currentOrder.find(item => item.id === id);
    if (existingItem) {
      existingItem.jumlah += 1;
      existingItem.subtotal = existingItem.harga * existingItem.jumlah;
    } else {
      WarkopBabol.currentOrder.push({
        id,
        nama,
        harga: parseInt(harga),
        jumlah: 1,
        subtotal: parseInt(harga),
        stokTersedia,
        isInfinite
      });
    }

    this.updateOrderDisplay();
    Utils.showNotification(`${nama} ditambahkan ke pesanan`, 'success');
  }

  static removeFromOrder(index) {
    const item = WarkopBabol.currentOrder[index];

    if (item.jumlah > 1) {
      item.jumlah -= 1;
      item.subtotal = item.harga * item.jumlah;
    } else {
      WarkopBabol.currentOrder.splice(index, 1);
    }

    this.updateOrderDisplay();
  }

  // PERBAIKAN: Validasi stok saat mengubah quantity
  static updateQuantity(index, change) {
    const item = WarkopBabol.currentOrder[index];
    const newQuantity = item.jumlah + change;

    if (newQuantity <= 0) {
      WarkopBabol.currentOrder.splice(index, 1);
    } else {
      // Validasi stok untuk item dengan stok terbatas
      if (!item.isInfinite && newQuantity > item.stokTersedia) {
        Utils.showNotification(`Stok ${item.nama} tidak mencukupi! Sisa: ${item.stokTersedia}`, 'warning');
        return;
      }

      item.jumlah = newQuantity;
      item.subtotal = item.harga * item.jumlah;
    }

    this.updateOrderDisplay();
  }

  static updateOrderDisplay() {
    const container = document.getElementById('orderItemsContainer');
    const processBtn = document.getElementById('processOrderBtn');
    const totalAmount = document.getElementById('totalAmount');

    if (!container || !totalAmount || !processBtn) return;

    if (WarkopBabol.currentOrder.length === 0) {
      container.innerHTML = `
        <div class="empty-order">
          <i class="fas fa-shopping-cart"></i>
          <p>Belum ada pesanan</p>
          <small>Pilih menu dari panel sebelah kiri</small>
        </div>
      `;
      totalAmount.textContent = 'Rp 0';
      processBtn.disabled = true;
      return;
    }

    let total = 0;
    container.innerHTML = WarkopBabol.currentOrder.map((item, index) => {
      total += item.subtotal;
      return this.getOrderItemHTML(item, index);
    }).join('');

    totalAmount.textContent = Utils.formatRupiah(total);
    processBtn.disabled = false;
  }

  // PERBAIKAN: Tampilkan informasi stok di order item
  static getOrderItemHTML(item, index) {
    const stockInfo = item.isInfinite ? '∞' : `(Sisa: ${item.stokTersedia})`;

    return `
      <div class="order-item">
        <div class="order-item-info">
          <h5>${item.nama}</h5>
          <small>${Utils.formatRupiah(item.harga)} × ${item.jumlah} ${stockInfo}</small>
        </div>
        <div class="order-item-controls">
          <div class="quantity-controls">
            <button class="quantity-btn" onclick="Kasir.updateQuantity(${index}, -1)">
              <i class="fas fa-minus"></i>
            </button>
            <span class="quantity-display">${item.jumlah}</span>
            <button class="quantity-btn" onclick="Kasir.updateQuantity(${index}, 1)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="order-item-price">${Utils.formatRupiah(item.subtotal)}</div>
        </div>
      </div>
    `;
  }

  static clearOrder() {
    if (WarkopBabol.currentOrder.length === 0) return;

    if (confirm('Yakin ingin menghapus semua pesanan?')) {
      WarkopBabol.currentOrder = [];
      this.updateOrderDisplay();
      Utils.showNotification('Pesanan dibersihkan', 'info');
    }
  }

  // PERBAIKAN: Process order yang akan mengurangi stok secara otomatis
  static async processOrder() {
    if (WarkopBabol.currentOrder.length === 0) {
      Utils.showNotification('Tidak ada pesanan untuk diproses', 'warning');
      return;
    }

    const processBtn = document.getElementById('processOrderBtn');
    if (processBtn.disabled || processBtn.classList.contains('processing')) {
      return;
    }

    try {
      // Disable button dan tambah loading state
      processBtn.disabled = true;
      processBtn.classList.add('processing');
      processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

      // PENTING: Backend akan otomatis mengurangi stok berdasarkan transaksi ini
      const items = WarkopBabol.currentOrder.map(item => ({
        nama: item.nama,
        harga: item.harga,
        jumlah: item.jumlah
      }));

      const paymentType = document.querySelector('input[name="paymentType"]:checked').value || 'tunai'; // Get payment type

      console.log('🛒 Processing order items:', items);

      const result = await Utils.apiCall('/transaksi', {
        method: 'POST',
        body: JSON.stringify({ items, tipe_pembayaran: paymentType })
      });

      console.log('✅ Transaction successful:', result);

      // Show receipt with the new transaction data
      this.showReceipt(result.data);

      // Clear order after successful transaction
      WarkopBabol.currentOrder = [];
      this.updateOrderDisplay();

      // Reload menu data to get the latest stock levels
      await this.loadMenuData();
      this.displayMenuByCategory();

      Utils.showNotification('Transaksi berhasil diproses! Stok telah diperbarui 🎉', 'success');

      // Update dashboard if active tab is 'dashboard'
      if (WarkopBabol.currentTab === 'dashboard') {
        Dashboard.load();
      }
    } catch (error) {
      console.error('Error processing order:', error);
      Utils.showNotification('Gagal memproses transaksi. Silakan coba lagi.', 'error');
    } finally {
      // Reset button state
      if (processBtn) {
        processBtn.disabled = false;
        processBtn.classList.remove('processing');
        processBtn.innerHTML = '<i class="fas fa-check-circle"></i> Proses Pesanan';
      }
    }
  }


  static showReceipt(transactionData) {
    const modal = document.getElementById('receiptModal');
    const content = document.getElementById('receiptContent');

    if (!modal || !content) return;

    const now = Utils.getIndonesiaDate(); // Gunakan waktu Indonesia
    let total = 0;

    // Gunakan data dari currentOrder yang baru saja diproses
    const receiptHTML = `
      <div class="receipt">
        <div class="receipt-header">
          <h3>🌸 WARKOP BABOL</h3>
          <p>Struk Pembelian</p>
          <small>${Utils.formatDate(now, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</small>
        </div>
        
        <div class="receipt-items">
          ${WarkopBabol.currentOrder.map(item => {
      total += item.subtotal;
      return `
              <div class="receipt-item">
                <span>${item.nama}</span>
                <span>${item.jumlah}x</span>
                <span>${Utils.formatRupiah(item.subtotal)}</span>
              </div>
            `;
    }).join('')}
        </div>
        
        <div class="receipt-total">
          <div class="receipt-item">
            <strong>TOTAL</strong>
            <strong></strong>
            <strong>${Utils.formatRupiah(total)}</strong>
          </div>
        </div>
        
        <div class="receipt-footer">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p>🌸 Sampai jumpa lagi di Warkop Babol 🌸</p>
          <small>Stok menu telah diperbarui secara otomatis</small>
        </div>
      </div>
    `;

    content.innerHTML = receiptHTML;
    ModalManager.show('receiptModal');

    // Close receipt modal events
    const closeReceiptBtn = document.getElementById('closeReceiptBtn');
    const closeReceiptModal = document.getElementById('closeReceiptModal');

    if (closeReceiptBtn) {
      closeReceiptBtn.onclick = () => ModalManager.hide('receiptModal');
    }
    if (closeReceiptModal) {
      closeReceiptModal.onclick = () => ModalManager.hide('receiptModal');
    }
  }

  // Fix text truncation untuk card titles
  static fixCardTextTruncation() {
    setTimeout(() => {
      const cardTitles = document.querySelectorAll('.kasir-menu-item h5');

      cardTitles.forEach(title => {
        const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
        const maxHeight = 2.4 * lineHeight;

        if (title.scrollHeight > maxHeight) {
          title.classList.add('js-truncate');
        }
      });
    }, 100);
  }

  // Utility functions
  static getTotalItems() {
    return WarkopBabol.currentOrder.reduce((total, item) => total + item.jumlah, 0);
  }

  static getTotalAmount() {
    return WarkopBabol.currentOrder.reduce((total, item) => total + item.subtotal, 0);
  }

  static reset() {
    this.eventListenersInitialized = false;
    this.currentCategory = 'main_menu';
    this.searchTerm = '';
    WarkopBabol.currentOrder = [];

    // Reset search input
    const searchInput = document.getElementById('menuSearchInput');
    if (searchInput) {
      searchInput.value = '';
      searchInput.dataset.initialized = '';
    }
  }
}

// Export for use in other files
window.Kasir = Kasir;
