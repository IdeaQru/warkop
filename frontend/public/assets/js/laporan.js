// ===== LAPORAN KEUANGAN SYSTEM (DIPERBAIKI) =====
class LaporanManager {
  static quickFiltersAdded = false;

  static async load() {
    try {
      this.initEventListeners();
      this.setDefaultDates();
      
      // Hanya tambah quick filters jika belum ada
      if (!this.quickFiltersAdded) {
        this.addQuickDateFilters();
        this.quickFiltersAdded = true;
      }
    } catch (error) {
      console.error('Error loading laporan:', error);
      Utils.showNotification('Gagal memuat laporan', 'error');
    }
  }

  static initEventListeners() {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      // Remove existing event listener jika ada
      const newForm = reportForm.cloneNode(true);
      reportForm.parentNode.replaceChild(newForm, reportForm);
      
      // Add fresh event listener
      newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.generateReport();
      });
    }
  }

  // PERBAIKAN: Gunakan timezone Indonesia yang konsisten
  static setDefaultDates() {
    try {
      // Pastikan fungsi Utils ada
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
      // Fallback ke tanggal lokal
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

    // Cek jika quick filters sudah ada
    const existingQuickFilters = reportControls.querySelector('.quick-date-filters');
    if (existingQuickFilters) {
      return;
    }

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
      
      // Add event listeners untuk quick filter buttons
      this.attachQuickFilterListeners();
    }
  }

  static attachQuickFilterListeners() {
    // Gunakan event delegation untuk menghindari duplikasi
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quick-filter-btn')) {
        const button = e.target.closest('.quick-filter-btn');
        const period = button.getAttribute('data-period');
        this.setQuickDate(period, button);
      }
    });
  }

  // PERBAIKAN UTAMA: Gunakan timezone Indonesia yang konsisten dengan error handling
  static setQuickDate(period, clickedButton) {
    try {
      // Gunakan Utils.getIndonesiaDate() dengan fallback
      let today;
      if (typeof Utils !== 'undefined' && Utils.getIndonesiaDate) {
        today = Utils.getIndonesiaDate();
      } else if (typeof getIndonesiaTime !== 'undefined') {
        today = getIndonesiaTime();
      } else {
        // Fallback ke waktu lokal
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

      // Format untuk input date HTML (YYYY-MM-DD)
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

      // Highlight active button
      document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      if (clickedButton) {
        clickedButton.classList.add('active');
      }

      // Auto generate report
      this.generateReport();

    } catch (error) {
      console.error('Error in setQuickDate:', error);
      Utils.showNotification('Error setting quick date filter', 'error');
    }
  }

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

      // PERBAIKAN: Pastikan Utils.apiCall ada
      if (typeof Utils === 'undefined' || !Utils.apiCall) {
        throw new Error('Utils.apiCall tidak tersedia');
      }

      // GET DETAIL TRANSAKSI INDIVIDUAL
      const result = await Utils.apiCall('/transaksi/laporan-detail', {
        method: 'POST',
        body: JSON.stringify({ tanggalMulai, tanggalAkhir })
      });

      console.log('📊 Report data received:', result);

      // PERBAIKAN: Validasi struktur data response
      if (!result || !result.data) {
        throw new Error('Data laporan tidak valid');
      }

      this.displayDetailReport(result.data, tanggalMulai, tanggalAkhir);

    } catch (error) {
      console.error('Error generating report:', error);
      Utils.showNotification(`Gagal membuat laporan: ${error.message}`, 'error');
    }
  }

  static displayDetailReport(data, tanggalMulai, tanggalAkhir) {
    const reportResult = document.getElementById('reportResult');
    if (!reportResult) {
      console.error('Element reportResult tidak ditemukan');
      return;
    }

    // PERBAIKAN: Validasi data
    if (!Array.isArray(data)) {
      console.error('Data laporan harus berupa array');
      reportResult.innerHTML = this.getEmptyReportHTML(tanggalMulai, tanggalAkhir);
      return;
    }

    if (data.length === 0) {
      reportResult.innerHTML = this.getEmptyReportHTML(tanggalMulai, tanggalAkhir);
      return;
    }

    let totalKeseluruhan = 0;
    let totalTransaksi = data.length;

    // PERBAIKAN: Validasi struktur data transaksi
    const tableRows = data.map((transaksi, index) => {
      try {
        // Pastikan transaksi memiliki struktur yang benar
        const totalHarga = transaksi.total_harga || 0;
        const items = transaksi.items || [];
        const tanggal = transaksi.tanggal || 'Tanggal tidak tersedia';

        totalKeseluruhan += totalHarga;
        
        // Format items yang dibeli dengan validasi
        const itemsList = items.map(item => {
          const namaMenu = item.nama_menu || item.nama || 'Item tidak dikenal';
          const jumlah = item.jumlah || 0;
          return `${namaMenu} (${jumlah}x)`;
        }).join(', ');

        // Hitung total item dengan validasi
        const totalItems = items.reduce((sum, item) => sum + (item.jumlah || 0), 0);

        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>
              <strong>${tanggal}</strong>
            </td>
            <td>
              <div class="transaction-items">
                ${itemsList || 'Tidak ada item'}
              </div>
            </td>
            <td class="text-center">
              <span class="badge">${totalItems}</span>
            </td>
            <td class="text-right">
              <strong class="text-pink">${Utils.formatRupiah(totalHarga)}</strong>
            </td>
          </tr>
        `;
      } catch (itemError) {
        console.error('Error processing transaction item:', itemError);
        return `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td colspan="4">Error memproses data transaksi</td>
          </tr>
        `;
      }
    }).join('');

    const reportHTML = `
      <div class="report-header">
        <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
        <p>${this.formatDateRange(tanggalMulai, tanggalAkhir)}</p>
      </div>
      
      <div class="report-table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th class="text-center" width="5%">#</th>
              <th width="20%"><i class="fas fa-calendar-day"></i> Tanggal & Waktu</th>
              <th width="40%"><i class="fas fa-shopping-cart"></i> Item yang Dibeli</th>
              <th class="text-center" width="15%"><i class="fas fa-cube"></i> Total Item</th>
              <th class="text-right" width="20%"><i class="fas fa-money-bill-wave"></i> Total Harga</th>
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
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div class="report-summary">
        <h4><i class="fas fa-chart-pie"></i> Ringkasan Laporan</h4>
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
      totalTransaksi: totalTransaksi
    };
    
    // Scroll to result
    reportResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  static getEmptyReportHTML(tanggalMulai, tanggalAkhir) {
    return `
      <div class="report-header">
        <h3><i class="fas fa-receipt"></i> Detail Transaksi</h3>
        <p>${this.formatDateRange(tanggalMulai, tanggalAkhir)}</p>
      </div>
      
      <div class="empty-report">
        <i class="fas fa-receipt"></i>
        <h4>Tidak Ada Transaksi</h4>
        <p>Tidak ada transaksi yang ditemukan pada periode ${this.formatDateRange(tanggalMulai, tanggalAkhir)}</p>
        <small>Coba ubah rentang tanggal atau pastikan ada transaksi pada periode tersebut</small>
      </div>
    `;
  }

  // PERBAIKAN: Gunakan timezone Indonesia untuk format date range dengan error handling
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
          <title>Detail Transaksi - Warkop Babol</title>
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
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .transaction-items {
              line-height: 1.4;
              word-wrap: break-word;
            }
            .badge {
              background: #FF69B4;
              color: white;
              padding: 2px 6px;
              border-radius: 10px;
              font-size: 10px;
            }
            .summary-stats { 
              display: grid; 
              grid-template-columns: repeat(2, 1fr); 
              gap: 15px; 
              margin-top: 20px; 
            }
            .summary-item { 
              text-align: center; 
              padding: 15px; 
              border: 1px solid #ddd; 
              border-radius: 5px;
            }
            .value { 
              font-size: 14px; 
              font-weight: bold; 
              color: #FF69B4; 
              margin-top: 5px;
            }
            .period-text {
              font-size: 12px !important;
            }
            .report-actions { display: none; }
            
            @media print { 
              body { margin: 0; font-size: 10px; }
              .report-table { font-size: 9px; }
              .report-table th, .report-table td { padding: 4px; }
            }
          </style>
        </head>
        <body>
          ${reportContent.innerHTML}
          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
            <p>🌸 Warkop Babol - Dicetak pada ${new Date().toLocaleDateString('id-ID', {timeZone: 'Asia/Jakarta'})} ${new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Jakarta'})} 🌸</p>
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

  static exportCSV() {
    try {
      if (!this.currentReportData || !this.currentReportData.data) {
        Utils.showNotification('Tidak ada data untuk diekspor', 'warning');
        return;
      }

      const data = this.currentReportData.data;
      
      // Header CSV
      let csv = 'No,Tanggal & Waktu,Item yang Dibeli,Total Item,Total Harga\n';
      
      // Data rows dengan validasi
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
          
          csv += `"${index + 1}","${tanggal}","${itemsList}","${totalItems}","${Utils.formatRupiah(totalHarga)}"\n`;
        } catch (itemError) {
          console.error('Error processing CSV item:', itemError);
          csv += `"${index + 1}","Error","Error","0","Rp 0"\n`;
        }
      });
      
      // Total row
      csv += `"","TOTAL","","${this.currentReportData.totalTransaksi} Transaksi","${Utils.formatRupiah(this.currentReportData.totalKeseluruhan)}"\n`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `detail-transaksi-warkop-babol-${this.currentReportData.tanggalMulai}-to-${this.currentReportData.tanggalAkhir}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Utils.showNotification('Detail transaksi berhasil diekspor! 📊', 'success');

    } catch (error) {
      console.error('Error exporting CSV:', error);
      Utils.showNotification('Gagal mengekspor data', 'error');
    }
  }
}

// Export for use in other files
window.LaporanManager = LaporanManager;
