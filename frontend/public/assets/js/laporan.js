// ===== LAPORAN KEUANGAN SYSTEM DENGAN FILTER FRONTEND =====
class LaporanManager {
  static quickFiltersAdded = false;
  static paymentFilterAdded = false;

  static async load() {
    try {
      this.initEventListeners();
      this.setDefaultDates();

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

    // ✨ TAMBAH EVENT LISTENER UNTUK FILTER PEMBAYARAN
    document.addEventListener('change', (e) => {
      if (e.target.name === 'paymentFilter') {
        console.log('🔄 Payment filter changed to:', e.target.value);
        // Auto-generate report saat filter berubah
        if (this.currentReportData) {
          this.applyPaymentFilter(e.target.value);
        }
      }
    });
  }

  // ✨ PERBAIKAN: Pastikan filter ditambahkan dengan benar
  static addPaymentTypeFilter() {
    const reportControls = document.querySelector('.report-controls');
    if (!reportControls) {
      console.error('Report controls container not found');
      return;
    }

    const existingPaymentFilter = reportControls.querySelector('.payment-type-filter');
    if (existingPaymentFilter) {
      console.log('Payment filter already exists');
      return;
    }

    const paymentFilterHTML = `
      <div class="payment-type-filter">
        <h4><i class="fas fa-credit-card"></i> Filter Pembayaran</h4>
        <div class="payment-filter-options">
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="semua" checked>
            <span class="radio-custom"></span>
            <i class="fas fa-list"></i> Semua Pembayaran
          </label>
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="tunai">
            <span class="radio-custom"></span>
            <i class="fas fa-money-bill-wave"></i> Tunai Saja
          </label>
          <label class="payment-option">
            <input type="radio" name="paymentFilter" value="non-tunai">
            <span class="radio-custom"></span>
            <i class="fas fa-credit-card"></i> Non-Tunai Saja
          </label>
        </div>
      </div>
    `;

    // Cari tempat yang tepat untuk menambahkan filter
    const dateRangeSelector = reportControls.querySelector('.date-range-selector');
    if (dateRangeSelector) {
      dateRangeSelector.insertAdjacentHTML('beforeend', paymentFilterHTML);
      console.log('✅ Payment filter added successfully');
    } else {
      // Fallback: tambahkan di akhir report controls
      reportControls.insertAdjacentHTML('beforeend', paymentFilterHTML);
      console.log('✅ Payment filter added to report controls');
    }
  }

  // ✨ GENERATE REPORT TANPA KIRIM FILTER KE BACKEND
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

      console.log('📊 Generate Report - Tanggal Mulai:', tanggalMulai);
      console.log('📊 Generate Report - Tanggal Akhir:', tanggalAkhir);

      if (!tanggalMulai || !tanggalAkhir) {
        Utils.showNotification('Tanggal mulai dan akhir harus diisi', 'warning');
        return;
      }

      if (new Date(tanggalMulai) > new Date(tanggalAkhir)) {
        Utils.showNotification('Tanggal mulai tidak boleh lebih besar dari tanggal akhir', 'warning');
        return;
      }

      // ✨ PANGGIL API TANPA FILTER PEMBAYARAN (backend original)
      const result = await Utils.apiCall('/transaksi/laporan-detail', {
        method: 'POST',
        body: JSON.stringify({ tanggalMulai, tanggalAkhir })
      });

      console.log('📊 Report data received:', result);

      if (!result || !result.data) {
        throw new Error('Data laporan tidak valid');
      }

      // ✨ SIMPAN DATA LENGKAP, LALU APPLY FILTER DI FRONTEND
      this.rawReportData = result.data; // Simpan data mentah
      const selectedPaymentFilter = document.querySelector('input[name="paymentFilter"]:checked')?.value || 'semua';
      this.applyPaymentFilter(selectedPaymentFilter);

    } catch (error) {
      console.error('Error generating report:', error);
      Utils.showNotification(`Gagal membuat laporan: ${error.message}`, 'error');
    }
  }

  // ✨ FUNGSI BARU: APPLY FILTER DI FRONTEND
  static applyPaymentFilter(paymentFilter) {
    if (!this.rawReportData) {
      console.error('No raw data available for filtering');
      return;
    }

    let filteredData = [...this.rawReportData];

    // ✨ FILTER DATA BERDASARKAN JENIS PEMBAYARAN
    if (paymentFilter === 'tunai') {
      filteredData = this.rawReportData.filter(t => 
        (t.tipe_pembayaran || '').toLowerCase() === 'tunai'
      );
    } else if (paymentFilter === 'non-tunai') {
      filteredData = this.rawReportData.filter(t => 
        (t.tipe_pembayaran || '').toLowerCase() !== 'tunai' && 
        (t.tipe_pembayaran || '') !== ''
      );
    }

    console.log('🔍 Filtered data:', filteredData.length, 'from', this.rawReportData.length);

    // Ambil tanggal dari input
    const tanggalMulai = document.getElementById('tanggalMulai').value;
    const tanggalAkhir = document.getElementById('tanggalAkhir').value;

    this.displayDetailReport(filteredData, tanggalMulai, tanggalAkhir, paymentFilter);
  }

  // ✨ DISPLAY REPORT DENGAN PERBAIKAN
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

    // ✨ PISAHKAN DATA BERDASARKAN JENIS PEMBAYARAN DARI DATA YANG SUDAH DIFILTER
    const dataTunai = data.filter(t => (t.tipe_pembayaran || '').toLowerCase() === 'tunai');
    const dataNonTunai = data.filter(t => (t.tipe_pembayaran || '').toLowerCase() !== 'tunai' && (t.tipe_pembayaran || '') !== '');

    let totalKeseluruhan = 0;
    let totalTunai = 0;
    let totalNonTunai = 0;
    let totalTransaksi = data.length;
    let totalTransaksiTunai = dataTunai.length;
    let totalTransaksiNonTunai = dataNonTunai.length;

    // Hitung total
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

        // ✨ BADGE PEMBAYARAN DENGAN STYLING
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

    // ✨ INFO FILTER YANG SEDANG AKTIF
    const filterInfo = paymentFilter === 'semua' 
      ? 'Semua Pembayaran' 
      : paymentFilter === 'tunai' 
        ? 'Pembayaran Tunai Saja' 
        : 'Pembayaran Non-Tunai Saja';

    const reportHTML = `
      <div class="report-header">
        <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
        <p>${this.formatDateRange(tanggalMulai, tanggalAkhir)} | <strong style="color: #FF69B4;">${filterInfo}</strong></p>
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

    // Store data untuk export
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

  // Sisanya tetap sama seperti sebelumnya...
  static setQuickDate(period, clickedButton) {
    try {
      let today;
      if (typeof Utils !== 'undefined' && Utils.getIndonesiaDate) {
        today = Utils.getIndonesiaDate();
      } else {
        today = new Date();
      }

      let startDate = new Date(today);
      let endDate = new Date(today);

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

      if (tanggalMulaiInput) tanggalMulaiInput.value = formatDateForInput(startDate);
      if (tanggalAkhirInput) tanggalAkhirInput.value = formatDateForInput(endDate);

      document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));
      if (clickedButton) clickedButton.classList.add('active');

      this.generateReport();

    } catch (error) {
      console.error('Error in setQuickDate:', error);
      Utils.showNotification('Error setting quick date filter', 'error');
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

  static setDefaultDates() {
    try {
      const today = typeof Utils !== 'undefined' && Utils.getIndonesiaDateString 
        ? Utils.getIndonesiaDateString() 
        : new Date().toISOString().split('T')[0];
      
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
    }
    if (tanggalAkhirInput && !tanggalAkhirInput.value) {
      tanggalAkhirInput.value = dateString;
    }
  }

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

      return startDate === endDate ? start : `${start} - ${end}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return `${startDate} - ${endDate}`;
    }
  }

  static getDateDifferenceText(startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return diffDays === 1 ? '1 Hari' : `${diffDays} Hari`;
    } catch (error) {
      console.error('Error calculating date difference:', error);
      return 'Tidak dapat menghitung';
    }
  }

  // Export dan Print methods tetap sama...
  static exportCSV() {
    try {
      if (!this.currentReportData || !this.currentReportData.data) {
        Utils.showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
      }

      const data = this.currentReportData.data;

      let csv = 'LAPORAN KEUANGAN WARKOP BABOL\n';
      csv += `Periode: ${this.currentReportData.tanggalMulai} s/d ${this.currentReportData.tanggalAkhir}\n`;
      csv += `Filter: ${this.currentReportData.paymentFilter}\n\n`;
      
      csv += 'RINGKASAN PEMBAYARAN\n';
      csv += `Tunai,${this.currentReportData.totalTransaksiTunai} transaksi,${Utils.formatRupiah(this.currentReportData.totalTunai)}\n`;
      csv += `Non-Tunai,${this.currentReportData.totalTransaksiNonTunai} transaksi,${Utils.formatRupiah(this.currentReportData.totalNonTunai)}\n`;
      csv += `TOTAL,${this.currentReportData.totalTransaksi} transaksi,${Utils.formatRupiah(this.currentReportData.totalKeseluruhan)}\n\n`;

      csv += 'DETAIL TRANSAKSI\n';
      csv += 'No,Tanggal & Waktu,Item yang Dibeli,Total Item,Total Harga,Pembayaran\n';

      data.forEach((transaksi, index) => {
        const items = transaksi.items || [];
        const itemsList = items.map(item => `${item.nama_menu || item.nama || 'Item tidak dikenal'} (${item.jumlah || 0}x)`).join('; ');
        const totalItems = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);
        const totalHarga = transaksi.total_harga || 0;
        const tanggal = transaksi.tanggal || 'Tanggal tidak tersedia';
        const tipePembayaran = transaksi.tipe_pembayaran || 'Tunai';

        csv += `"${index + 1}","${tanggal}","${itemsList}","${totalItems}","${Utils.formatRupiah(totalHarga)}","${tipePembayaran}"\n`;
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
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF69B4; padding-bottom: 20px; }
            .report-header h3 { color: #FF69B4; margin-bottom: 10px; }
            .report-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
            .report-table th, .report-table td { padding: 8px; text-align: left; border: 1px solid #ddd; vertical-align: top; }
            .report-table th { background-color: #FF69B4; color: white; font-weight: bold; }
            .total-row { background-color: #FFB6C1; font-weight: bold; }
            .row-cash { background-color: rgba(40, 167, 69, 0.1); }
            .row-noncash { background-color: rgba(0, 123, 255, 0.1); }
            .badge-cash { background: #28a745; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; }
            .badge-noncash { background: #007bff; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .report-actions { display: none; }
            @media print { 
              body { margin: 0; font-size: 10px; }
              .report-table td:last-child, .report-table th:last-child { display: none; }
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

  // Method delete transaction tetap sama
  static deleteTransaction(index) {
    const transaksi = this.currentReportData.data[index];
    const transaksiId = transaksi._id.$oid || transaksi._id;

    const confirmed = confirm(`Apakah Anda yakin ingin menghapus transaksi ${transaksiId}?`);
    if (confirmed) {
      Utils.apiCall(`/transaksi/${transaksiId}`, { method: 'DELETE' })
        .then(() => {
          this.currentReportData.data.splice(index, 1);
          this.rawReportData = this.rawReportData.filter(t => (t._id.$oid || t._id) !== transaksiId);
          
          const selectedPaymentFilter = document.querySelector('input[name="paymentFilter"]:checked')?.value || 'semua';
          this.applyPaymentFilter(selectedPaymentFilter);
          
          Utils.showNotification('Transaksi berhasil dihapus', 'success');
        })
        .catch((error) => {
          console.error('Error deleting transaction:', error);
          Utils.showNotification('Gagal menghapus transaksi', 'error');
        });
    }
  }
}

// Export for use in other files
window.LaporanManager = LaporanManager;
