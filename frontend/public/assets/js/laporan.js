// ===== LAPORAN KEUANGAN SYSTEM DENGAN FILTER PEMBAYARAN =====
class LaporanManager {
  static quickFiltersAdded = false;
  static paymentFilterAdded = false;

  static async load() {
    try {
      this.initEventListeners();
      this.setDefaultDates();

      // Tambah quick filters dan payment filter
      if (!this.quickFiltersAdded) {
        this.addQuickDateFilters();
        this.quickFiltersAdded = true;
      }

      if (!this.paymentFilterAdded) {
        this.addPaymentTypeFilter();
        this.paymentFilterAdded = true;
      }
    } catch (error) {
      console.error('Error loading laporan:', error);
      Utils.showNotification('Gagal memuat laporan', 'error');
    }
  }

  static initEventListeners() {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      const newForm = reportForm.cloneNode(true);
      reportForm.parentNode.replaceChild(newForm, reportForm);

      newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }
  }

  // ✨ FITUR BARU: Tambah filter pembayaran
  static addPaymentTypeFilter() {
    const reportControls = document.querySelector('.report-controls');
    if (!reportControls) return;

    const existingPaymentFilter = reportControls.querySelector('.payment-type-filter');
    if (existingPaymentFilter) return;

    const paymentFilterHTML = `
      <div class="payment-type-filter">
        <h4><i class="fas fa-credit-card"></i> Filter Pembayaran</h4>
        <div class="payment-filter-options">
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="semua" checked>
            <span class="checkmark"></span>
            <i class="fas fa-list"></i> Semua Pembayaran
          </label>
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="tunai">
            <span class="checkmark"></span>
            <i class="fas fa-money-bill-wave"></i> Tunai Saja
          </label>
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="non-tunai">
            <span class="checkmark"></span>
            <i class="fas fa-credit-card"></i> Non-Tunai Saja
          </label>
        </div>
      </div>
    `;

    const dateRangeSelector = reportControls.querySelector('.date-range-selector');
    if (dateRangeSelector) {
      dateRangeSelector.insertAdjacentHTML('beforeend', paymentFilterHTML);
    }
  }

  static setDefaultDates() {
    try {
      if (typeof Utils === 'undefined' || !Utils.getIndonesiaDateString) {
        console.warn('Utils.getIndonesiaDateString not available, using fallback');
        const today = new Date().toISOString().split('T')[0];
        this.setDateInputs(today);
        return;
      }

      const today = Utils.getIndonesiaDateString();
      this.setDateInputs(today);

    } catch (error) {
      console.error('Error setting default dates:', error);
      const today = new Date().toISOString().split('T')[0];
      this.setDateInputs(today);
    }
  }

  static setDateInputs(dateString) {
    const tanggalMulaiInput = document.getElementById('tanggalMulai');
    const tanggalAkhirInput = document.getElementById('tanggalAkhir');

    if (tanggalMulaiInput && !tanggalMulaiInput.value) {
      tanggalMulaiInput.value = dateString;
      console.log('📅 Laporan - Set tanggalMulai to:', dateString);
    }
    if (tanggalAkhirInput && !tanggalAkhirInput.value) {
      tanggalAkhirInput.value = dateString;
      console.log('📅 Laporan - Set tanggalAkhir to:', dateString);
    }
  }

  static addQuickDateFilters() {
    const reportControls = document.querySelector('.report-controls');
    if (!reportControls) return;

    const existingQuickFilters = reportControls.querySelector('.quick-date-filters');
    if (existingQuickFilters) return;

    const quickFiltersHTML = `
      <div class="quick-date-filters">
        <h4><i class="fas fa-clock"></i> Filter Cepat</h4>
        <div class="quick-filter-buttons">
          <button type="button" class="btn btn-outline btn-sm quick-filter-btn" data-period="today">
            <i class="fas fa-calendar-day"></i> Hari Ini
          </button>
          <button type="button" class="btn btn-outline btn-sm quick-filter-btn" data-period="yesterday">
            <i class="fas fa-calendar-minus"></i> Kemarin
          </button>
          <button type="button" class="btn btn-outline btn-sm quick-filter-btn" data-period="week">
            <i class="fas fa-calendar-week"></i> 7 Hari Terakhir
          </button>
          <button type="button" class="btn btn-outline btn-sm quick-filter-btn" data-period="month">
            <i class="fas fa-calendar-alt"></i> 30 Hari Terakhir
          </button>
        </div>
      </div>
    `;

    const dateRangeSelector = reportControls.querySelector('.date-range-selector');
    if (dateRangeSelector) {
      dateRangeSelector.insertAdjacentHTML('afterend', quickFiltersHTML);
      this.attachQuickFilterListeners();
    }
  }

  static attachQuickFilterListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-filter-btn')) {
        const button = e.target.closest('.quick-filter-btn');
        const period = button.getAttribute('data-period');
        this.setQuickDate(period, button);
      }
    });
  }

  static setQuickDate(period, clickedButton) {
    try {
      let today;
      if (typeof Utils !== 'undefined' && Utils.getIndonesiaDate) {
        today = Utils.getIndonesiaDate();
      } else if (typeof getIndonesiaTime !== 'undefined') {
        today = getIndonesiaTime();
      } else {
        today = new Date();
      }

      let startDate = new Date(today);
      let endDate = new Date(today);

      console.log('🕒 Quick Date - Today (Indonesia):', today.toString());
      console.log('📅 Quick Date - Period:', period);

      switch (period) {
        case 'today':
          startDate = new Date(today);
          endDate = new Date(today);
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday);
          endDate = new Date(yesterday);
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 6);
          startDate = new Date(weekAgo);
          endDate = new Date(today);
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 29);
          startDate = new Date(monthAgo);
          endDate = new Date(today);
          break;
      }

      const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const tanggalMulaiInput = document.getElementById('tanggalMulai');
      const tanggalAkhirInput = document.getElementById('tanggalAkhir');

      const startDateString = formatDateForInput(startDate);
      const endDateString = formatDateForInput(endDate);

      if (tanggalMulaiInput) {
        tanggalMulaiInput.value = startDateString;
        console.log('📅 Set tanggalMulai to:', startDateString);
      }
      if (tanggalAkhirInput) {
        tanggalAkhirInput.value = endDateString;
        console.log('📅 Set tanggalAkhir to:', endDateString);
      }

      document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      if (clickedButton) {
        clickedButton.classList.add('active');
      }

      this.generateReport();

    } catch (error) {
      console.error('Error in setQuickDate:', error);
      Utils.showNotification('Error setting quick date filter', 'error');
    }
  }

  // ✨ FUNGSI UTAMA: Generate report dengan filter pembayaran
  static async generateReport() {
    try {
      const tanggalMulaiInput = document.getElementById('tanggalMulai');
      const tanggalAkhirInput = document.getElementById('tanggalAkhir');

      if (!tanggalMulaiInput || !tanggalAkhirInput) {
        Utils.showNotification('Input tanggal tidak ditemukan', 'error');
        return;
      }

      const tanggalMulai = tanggalMulaiInput.value;
      const tanggalAkhir = tanggalAkhirInput.value;

      // ✨ AMBIL FILTER PEMBAYARAN
      const paymentFilter = document.querySelector('input[name="paymentFilter"]:checked')?.value || 'semua';

      console.log('📊 Generate Report - Tanggal Mulai:', tanggalMulai);
      console.log('📊 Generate Report - Tanggal Akhir:', tanggalAkhir);
      console.log('💳 Payment Filter:', paymentFilter);

      if (!tanggalMulai || !tanggalAkhir) {
        Utils.showNotification('Tanggal mulai dan akhir harus diisi', 'warning');
        return;
      }

      if (new Date(tanggalMulai) > new Date(tanggalAkhir)) {
        Utils.showNotification('Tanggal mulai tidak boleh lebih besar dari tanggal akhir', 'warning');
        return;
      }

      if (typeof Utils === 'undefined' || !Utils.apiCall) {
        throw new Error('Utils.apiCall tidak tersedia');
      }

      // ✨ KIRIM FILTER PEMBAYARAN KE API
      const result = await Utils.apiCall('/transaksi/laporan-detail', {
        method: 'POST',
        body: JSON.stringify({ 
          tanggalMulai, 
          tanggalAkhir,
          paymentFilter // Tambahkan filter pembayaran
        })
      });

      console.log('📊 Report data received:', result);

      if (!result || !result.data) {
        throw new Error('Data laporan tidak valid');
      }

      this.displayDetailReport(result.data, tanggalMulai, tanggalAkhir, paymentFilter);

    } catch (error) {
      console.error('Error generating report:', error);
      Utils.showNotification(`Gagal membuat laporan: ${error.message}`, 'error');
    }
  }

  // ✨ TAMPILKAN LAPORAN DENGAN PEMISAHAN TUNAI/NON-TUNAI
  static displayDetailReport(data, tanggalMulai, tanggalAkhir, paymentFilter = 'semua') {
    const reportResult = document.getElementById('reportResult');
    if (!reportResult) {
      console.error('Element reportResult tidak ditemukan');
      return;
    }

    if (!Array.isArray(data)) {
      console.error('Data laporan harus berupa array');
      reportResult.innerHTML = this.getEmptyReportHTML(tanggalMulai, tanggalAkhir, paymentFilter);
      return;
    }

    if (data.length === 0) {
      reportResult.innerHTML = this.getEmptyReportHTML(tanggalMulai, tanggalAkhir, paymentFilter);
      return;
    }

    // ✨ PISAHKAN DATA BERDASARKAN JENIS PEMBAYARAN
    const dataTunai = data.filter(t => (t.tipe_pembayaran || '').toLowerCase() === 'tunai');
    const dataNonTunai = data.filter(t => (t.tipe_pembayaran || '').toLowerCase() !== 'tunai');

    let totalKeseluruhan = 0;
    let totalTunai = 0;
    let totalNonTunai = 0;
    let totalTransaksi = data.length;
    let totalTransaksiTunai = dataTunai.length;
    let totalTransaksiNonTunai = dataNonTunai.length;

    // Hitung total untuk masing-masing jenis
    dataTunai.forEach(t => totalTunai += (t.total_harga || 0));
    dataNonTunai.forEach(t => totalNonTunai += (t.total_harga || 0));
    totalKeseluruhan = totalTunai + totalNonTunai;

    const tableRows = data.map((transaksi, index) => {
      try {
        const totalHarga = transaksi.total_harga || 0;
        const items = transaksi.items || [];
        const tanggal = transaksi.tanggal || 'Tanggal tidak tersedia';
        const paymentType = transaksi.tipe_pembayaran || 'Tunai';

        const itemsList = items.map(item => {
          const namaMenu = item.nama_menu || item.nama || 'Item tidak dikenal';
          const jumlah = item.jumlah || 0;
          return `${namaMenu} (${jumlah}x)`;
        }).join(', ');

        const totalItems = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);

        // ✨ STYLE BERBEDA UNTUK TUNAI DAN NON-TUNAI
        const paymentBadge = paymentType.toLowerCase() === 'tunai' 
          ? `<span class="badge badge-cash">💵 ${paymentType}</span>`
          : `<span class="badge badge-noncash">💳 ${paymentType}</span>`;

        return `
          <tr class="${paymentType.toLowerCase() === 'tunai' ? 'row-cash' : 'row-noncash'}">
            <td class="text-center">${index + 1}</td>
            <td><strong>${tanggal}</strong></td>
            <td><div class="transaction-items">${itemsList || 'Tidak ada item'}</div></td>
            <td class="text-center"><span class="badge">${totalItems}</span></td>
            <td class="text-right"><strong class="text-pink">${Utils.formatRupiah(totalHarga)}</strong></td>
            <td class="text-center">${paymentBadge}</td>
            <td class="text-center">
              <button class="btn btn-danger btn-sm" onclick="LaporanManager.deleteTransaction(${index})">Delete</button>
            </td>
          </tr>
        `;
      } catch (itemError) {
        console.error('Error processing transaction item:', itemError);
        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td colspan="6">Error memproses data transaksi</td>
          </tr>
        `;
      }
    }).join('');

    // ✨ HEADER DENGAN INFO FILTER
    const filterInfo = paymentFilter === 'semua' 
      ? 'Semua Pembayaran' 
      : paymentFilter === 'tunai' 
        ? 'Pembayaran Tunai Saja' 
        : 'Pembayaran Non-Tunai Saja';

    const reportHTML = `
      <div class="report-header">
        <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
        <p>${this.formatDateRange(tanggalMulai, tanggalAkhir)} | <strong>${filterInfo}</strong></p>
      </div>
      
      <div class="report-table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th class="text-center" width="5%">#</th>
              <th width="20%"><i class="fas fa-calendar-day"></i> Tanggal & Waktu</th>
              <th width="35%"><i class="fas fa-shopping-cart"></i> Item yang Dibeli</th>
              <th class="text-center" width="10%"><i class="fas fa-cube"></i> Total Item</th>
              <th class="text-right" width="15%"><i class="fas fa-money-bill-wave"></i> Total Harga</th>
              <th class="text-center" width="10%"><i class="fas fa-credit-card"></i> Pembayaran</th>
              <th class="text-center" width="5%"><i class="fas fa-cogs"></i> Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3"><strong>TOTAL KESELURUHAN</strong></td>
              <td class="text-center"><strong>${totalTransaksi} Transaksi</strong></td>
              <td class="text-right"><strong>${Utils.formatRupiah(totalKeseluruhan)}</strong></td>
              <td class="text-center"><strong>-</strong></td>
              <td class="text-center"><strong>-</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div class="report-summary">
        <h4><i class="fas fa-chart-pie"></i> Ringkasan Laporan</h4>
        
        <!-- ✨ RINGKASAN TERPISAH UNTUK TUNAI DAN NON-TUNAI -->
        <div class="payment-summary">
          <div class="payment-summary-item cash-summary">
            <h5><i class="fas fa-money-bill-wave"></i> Pembayaran Tunai</h5>
            <div class="payment-stats">
              <div class="stat-item">
                <span class="stat-label">Total Pendapatan:</span>
                <span class="stat-value cash">${Utils.formatRupiah(totalTunai)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Jumlah Transaksi:</span>
                <span class="stat-value">${totalTransaksiTunai}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Rata-rata:</span>
                <span class="stat-value">${totalTransaksiTunai > 0 ? Utils.formatRupiah(Math.round(totalTunai / totalTransaksiTunai)) : 'Rp 0'}</span>
              </div>
            </div>
          </div>

          <div class="payment-summary-item noncash-summary">
            <h5><i class="fas fa-credit-card"></i> Pembayaran Non-Tunai</h5>
            <div class="payment-stats">
              <div class="stat-item">
                <span class="stat-label">Total Pendapatan:</span>
                <span class="stat-value noncash">${Utils.formatRupiah(totalNonTunai)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Jumlah Transaksi:</span>
                <span class="stat-value">${totalTransaksiNonTunai}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Rata-rata:</span>
                <span class="stat-value">${totalTransaksiNonTunai > 0 ? Utils.formatRupiah(Math.round(totalNonTunai / totalTransaksiNonTunai)) : 'Rp 0'}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="summary-stats">
          <div class="summary-item">
            <h4>Total Pendapatan</h4>
            <div class="value">${Utils.formatRupiah(totalKeseluruhan)}</div>
          </div>
          <div class="summary-item">
            <h4>Total Transaksi</h4>
            <div class="value">${totalTransaksi}</div>
          </div>
          <div class="summary-item">
            <h4>Rata-rata per Transaksi</h4>
            <div class="value">${totalTransaksi > 0 ? Utils.formatRupiah(Math.round(totalKeseluruhan / totalTransaksi)) : 'Rp 0'}</div>
          </div>
          <div class="summary-item">
            <h4>Periode Laporan</h4>
            <div class="value period-text">${this.getDateDifferenceText(tanggalMulai, tanggalAkhir)}</div>
          </div>
        </div>
        
        <div class="report-actions">
          <button class="btn btn-primary" onclick="LaporanManager.printReport()">
            <i class="fas fa-print"></i> Print Laporan
          </button>
          <button class="btn btn-success" onclick="LaporanManager.exportCSV()">
            <i class="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
      </div>
    `;

    reportResult.innerHTML = reportHTML;

    // Store data for export dengan info pembayaran
    this.currentReportData = {
      data: data,
      tanggalMulai: tanggalMulai,
      tanggalAkhir: tanggalAkhir,
      totalKeseluruhan: totalKeseluruhan,
      totalTransaksi: totalTransaksi,
      totalTunai: totalTunai,
      totalNonTunai: totalNonTunai,
      totalTransaksiTunai: totalTransaksiTunai,
      totalTransaksiNonTunai: totalTransaksiNonTunai,
      paymentFilter: paymentFilter
    };

    reportResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ✨ EMPTY REPORT DENGAN INFO FILTER
  static getEmptyReportHTML(tanggalMulai, tanggalAkhir, paymentFilter = 'semua') {
    const filterInfo = paymentFilter === 'semua' 
      ? 'Semua Pembayaran' 
      : paymentFilter === 'tunai' 
        ? 'Pembayaran Tunai' 
        : 'Pembayaran Non-Tunai';

    return `
      <div class="report-header">
        <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
        <p>${this.formatDateRange(tanggalMulai, tanggalAkhir)} | <strong>${filterInfo}</strong></p>
      </div>
      
      <div class="empty-report">
        <i class="fas fa-receipt"></i>
        <h4>Tidak Ada Transaksi</h4>
        <p>Tidak ada transaksi ${filterInfo.toLowerCase()} pada periode ${this.formatDateRange(tanggalMulai, tanggalAkhir)}</p>
        <small>Coba ubah filter pembayaran atau rentang tanggal</small>
      </div>
    `;
  }

  // Sisanya tetap sama...
  static editTransaction(index) {
    const transaksi = this.currentReportData.data[index];
    console.log('Editing transaction', transaksi);

    const modal = document.getElementById('editTransactionModal');
    const namaMenuInput = document.getElementById('editNamaMenu');
    const hargaInput = document.getElementById('editHarga');
    const jumlahInput = document.getElementById('editJumlah');
    const tipePembayaranInput = document.getElementById('editTipePembayaran');

    namaMenuInput.value = transaksi.items[0].nama_menu;
    hargaInput.value = transaksi.items[0].harga;
    jumlahInput.value = transaksi.items[0].jumlah;
    tipePembayaranInput.value = transaksi.tipe_pembayaran;

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

        const updatedTransaction = {
          items: [{
            nama_menu: updatedNamaMenu,
            harga: updatedHarga,
            jumlah: updatedJumlah
          }],
          total_harga: updatedHarga * updatedJumlah,
          tipe_pembayaran: updatedTipePembayaran
        };

        const transaksiId = transaksi._id.$oid || transaksi._id;

        const response = await Utils.apiCall(`/transaksi/${transaksiId}`, {
          method: 'PUT',
          body: JSON.stringify(updatedTransaction),
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.success) {
          this.currentReportData.data[index] = { ...this.currentReportData.data[index], ...updatedTransaction };

          modal.style.display = 'none';
          this.displayDetailReport(this.currentReportData.data, this.currentReportData.tanggalMulai, this.currentReportData.tanggalAkhir, this.currentReportData.paymentFilter);

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

  static closeEditModal() {
    const modal = document.getElementById('editTransactionModal');
    modal.style.display = 'none';
  }

  static deleteTransaction(index) {
    const transaksi = this.currentReportData.data[index];
    const transaksiId = transaksi._id.$oid || transaksi._id;

    const confirmed = confirm(`Apakah Anda yakin ingin menghapus transaksi ${transaksiId}?`);
    if (confirmed) {
      Utils.apiCall(`/transaksi/${transaksiId}`, { method: 'DELETE' })
        .then(() => {
          this.currentReportData.data.splice(index, 1);
          this.displayDetailReport(this.currentReportData.data, this.currentReportData.tanggalMulai, this.currentReportData.tanggalAkhir, this.currentReportData.paymentFilter);
          Utils.showNotification('Transaksi berhasil dihapus', 'success');
        })
        .catch((error) => {
          console.error('Error deleting transaction:', error);
          Utils.showNotification('Gagal menghapus transaksi', 'error');
        });
    }
  }

  static getDateDifferenceText(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays === 1) {
        return '1 Hari';
      } else {
        return `${diffDays} Hari`;
      }
    } catch (error) {
      console.error('Error calculating date difference:', error);
      return 'Tidak dapat menghitung';
    }
  }

  static formatDateRange(startDate, endDate) {
    try {
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta'
      };

      const start = new Date(startDate + 'T00:00:00+07:00').toLocaleDateString('id-ID', options);
      const end = new Date(endDate + 'T00:00:00+07:00').toLocaleDateString('id-ID', options);

      if (startDate === endDate) {
        return start;
      }

      return `${start} - ${end}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return `${startDate} - ${endDate}`;
    }
  }

  // ✨ EXPORT CSV DENGAN PEMISAHAN TUNAI/NON-TUNAI
  static exportCSV() {
    try {
      if (!this.currentReportData || !this.currentReportData.data) {
        Utils.showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
      }

      const data = this.currentReportData.data;

      // Header CSV dengan info ringkasan
      let csv = 'LAPORAN KEUANGAN WARKOP BABOL\n';
      csv += `Periode: ${this.currentReportData.tanggalMulai} s/d ${this.currentReportData.tanggalAkhir}\n`;
      csv += `Filter: ${this.currentReportData.paymentFilter}\n\n`;
      
      // ✨ RINGKASAN PEMBAYARAN
      csv += 'RINGKASAN PEMBAYARAN\n';
      csv += `Tunai,${this.currentReportData.totalTransaksiTunai} transaksi,${Utils.formatRupiah(this.currentReportData.totalTunai)}\n`;
      csv += `Non-Tunai,${this.currentReportData.totalTransaksiNonTunai} transaksi,${Utils.formatRupiah(this.currentReportData.totalNonTunai)}\n`;
      csv += `TOTAL,${this.currentReportData.totalTransaksi} transaksi,${Utils.formatRupiah(this.currentReportData.totalKeseluruhan)}\n\n`;

      csv += 'DETAIL TRANSAKSI\n';
      csv += 'No,Tanggal & Waktu,Item yang Dibeli,Total Item,Total Harga,Pembayaran\n';

      // Data rows
      data.forEach((transaksi, index) => {
        try {
          const items = transaksi.items || [];
          const itemsList = items.map(item => {
            const namaMenu = item.nama_menu || item.nama || 'Item tidak dikenal';
            const jumlah = item.jumlah || 0;
            return `${namaMenu} (${jumlah}x)`;
          }).join('; ');

          const totalItems = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);
          const totalHarga = transaksi.total_harga || 0;
          const tanggal = transaksi.tanggal || 'Tanggal tidak tersedia';
          const tipePembayaran = transaksi.tipe_pembayaran || 'Tunai';

          csv += `"${index + 1}","${tanggal}","${itemsList}","${totalItems}","${Utils.formatRupiah(totalHarga)}","${tipePembayaran}"\n`;
        } catch (itemError) {
          console.error('Error processing CSV item:', itemError);
          csv += `"${index + 1}","Error","Error","0","Rp 0","Error"\n`;
        }
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `laporan-keuangan-warkop-babol-${this.currentReportData.tanggalMulai}-to-${this.currentReportData.tanggalAkhir}-${this.currentReportData.paymentFilter}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Utils.showNotification('Laporan keuangan berhasil diekspor! 📊', 'success');

    } catch (error) {
      console.error('Error exporting CSV:', error);
      Utils.showNotification('Gagal mengekspor data', 'error');
    }
  }

  static printReport() {
    try {
      const reportContent = document.getElementById('reportResult');
      if (!reportContent) {
        Utils.showNotification('Tidak ada laporan untuk dicetak', 'warning');
        return;
      }

      const printWindow = window.open('', '_blank');

      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Laporan Keuangan - Warkop Babol</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
            }
            .report-header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #FF69B4; 
              padding-bottom: 20px; 
            }
            .report-header h3 {
              color: #FF69B4;
              margin-bottom: 10px;
            }
            .report-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
              font-size: 11px;
            }
            .report-table th, .report-table td { 
              padding: 8px; 
              text-align: left; 
              border: 1px solid #ddd; 
              vertical-align: top;
            }
            .report-table th { 
              background-color: #FF69B4; 
              color: white;
              font-weight: bold; 
            }
            .total-row { 
              background-color: #FFB6C1; 
              font-weight: bold; 
            }
            .row-cash {
              background-color: #f0f8f0;
            }
            .row-noncash {
              background-color: #f0f0f8;
            }
            .badge-cash {
              background: #28a745;
              color: white;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 10px;
            }
            .badge-noncash {
              background: #007bff;
              color: white;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 10px;
            }
            .payment-summary {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 20px 0;
            }
            .payment-summary-item {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 8px;
            }
            .cash-summary {
              background: #f0f8f0;
            }
            .noncash-summary {
              background: #f0f0f8;
            }
            .stat-value.cash {
              color: #28a745;
              font-weight: bold;
            }
            .stat-value.noncash {
              color: #007bff;
              font-weight: bold;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .transaction-items {
              line-height: 1.4;
              word-wrap: break-word;
            }
            .report-actions { display: none; }
            
            @media print { 
              body { margin: 0; font-size: 10px; }
              .report-table { font-size: 9px; }
              .report-table th, .report-table td { padding: 4px; }
              .report-table td:last-child, .report-table th:last-child {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${reportContent.innerHTML}
          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
            <p>🌸 Warkop Babol - Dicetak pada ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })} ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} 🌸</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.print();

    } catch (error) {
      console.error('Error printing report:', error);
      Utils.showNotification('Gagal mencetak laporan', 'error');
    }
  }
}

// Export for use in other files
window.LaporanManager = LaporanManager;
