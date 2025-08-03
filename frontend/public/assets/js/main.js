// ===== WARKOP BABOL MAIN SCRIPT (DENGAN SISTEM AUTH) =====

// --- KONFIGURASI & STATE GLOBAL ---
const API_BASE = '/api';

const WarkopBabol = {
  currentTab: 'dashboard',
  menuData: { main_menu: [], drinks: [], additional: [] },
  currentOrder: [],
  isLoading: false,
  isAuthenticated: false // Tambahan untuk tracking auth status
};

// --- FUNGSI TIMEZONE UTAMA ---

/**
 * Mendapatkan waktu Indonesia (WIB/UTC+7) yang akurat dengan kalkulasi manual.
 * @returns {Date} Objek Date yang sudah disesuaikan dengan timezone Indonesia.
 */
function getIndonesiaTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (7 * 3600000)); // +7 jam untuk WIB
}

// --- SISTEM AUTENTIKASI ---

/**
 * Class untuk mengelola sistem autentikasi
 */
class AuthManager {
  static isChecking = false; // Flag untuk mencegah multiple check

  static async checkAuth() {
    if (this.isChecking) return;
    this.isChecking = true;

    console.log('🔐 Checking authentication...');
    
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      console.log('❌ No token found, redirecting to login');
      this.redirectToLogin();
      return false;
    }
    
    // Verify token dengan server
    const isValid = await this.verifyToken(token);
    this.isChecking = false;
    
    if (isValid) {
      WarkopBabol.isAuthenticated = true;
      this.setupLogoutHandler();
      return true;
    }
    
    return false;
  }
  
  static async verifyToken(token) {
    try {
      console.log('🔍 Verifying token with server...');
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Token valid, user authenticated:', data.user?.username);
          return true;
        }
      }
      
      console.log('❌ Token verification failed');
      this.redirectToLogin();
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      this.redirectToLogin();
      return false;
    }
  }
  
  static redirectToLogin() {
    console.log('🔄 Redirecting to login page...');
    localStorage.removeItem('authToken');
    WarkopBabol.isAuthenticated = false;
    
    // Pastikan tidak redirect jika sudah di halaman login
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  
  static logout() {
    if (confirm('Yakin ingin logout?')) {
      console.log('👋 User logging out...');
      localStorage.removeItem('authToken');
      WarkopBabol.isAuthenticated = false;
      window.location.href = '/login';
    }
  }

  static setupLogoutHandler() {
    // Tambahkan tombol logout ke header jika belum ada
    const headerInfo = document.querySelector('.header-info');
    if (headerInfo && !document.getElementById('logoutBtn')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logoutBtn';
      logoutBtn.className = 'logout-btn';
      logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      logoutBtn.onclick = () => this.logout();
      
      // Style untuk tombol logout
      logoutBtn.style.cssText = `
        background: linear-gradient(135deg, #FF69B4, #FFB6C1);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-left: 15px;
        transition: all 0.3s ease;
      `;
      
      headerInfo.appendChild(logoutBtn);
    }
  }

  static getAuthToken() {
    return localStorage.getItem('authToken');
  }
}

// --- KELAS-KELAS UTILITY & MANAGER ---

/**
 * Class berisi fungsi-fungsi pembantu (utilities) untuk seluruh aplikasi.
 */
class Utils {
  static formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(amount);
  }

  static formatDate(date, options = {}) {
    const defaultOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
    };
    return new Date(date).toLocaleDateString('id-ID', { ...defaultOptions, ...options });
  }

  static getIndonesiaDate() {
    return getIndonesiaTime();
  }

  static getIndonesiaDateString() {
    const indonesiaTime = getIndonesiaTime();
    const year = indonesiaTime.getFullYear();
    const month = String(indonesiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(indonesiaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    const icons = {
      success: 'fa-check-circle', error: 'fa-exclamation-triangle',
      warning: 'fa-exclamation-circle', info: 'fa-info-circle'
    };
    notification.innerHTML = `<i class="fas ${icons[type]}"></i> <span>${message}</span>`;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 4000);
  }

  static showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('show', show);
    WarkopBabol.isLoading = show;
  }

  static async apiCall(endpoint, options = {}) {
    // PERBAIKAN: Sertakan token auth dalam setiap API call
    const token = AuthManager.getAuthToken();
    
    if (!token && !endpoint.includes('/auth/')) {
      console.error('No auth token available for API call');
      AuthManager.redirectToLogin();
      throw new Error('Authentication required');
    }

    this.showLoading(true);
    try {
      const headers = { 
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Tambahkan Authorization header jika ada token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers,
        ...options
      });

      if (response.status === 401) {
        console.log('🔐 Unauthorized response, redirecting to login');
        AuthManager.redirectToLogin();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Terjadi kesalahan pada server');
      }
      return data;
    } catch (error) {
      console.error('API Call Error:', endpoint, error);
      
      // Jangan tampilkan notifikasi untuk auth errors
      if (!error.message.includes('Authentication') && !error.message.includes('Session expired')) {
        this.showNotification(error.message, 'error');
      }
      
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  static debounce(func, wait) {
    let timeout;
    return (...args) => {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static debugTimezone() {
    const now = new Date();
    const indonesiaTime = getIndonesiaTime();
    
    console.log('=== 🔍 TIMEZONE DEBUG ===');
    console.log('Browser Local Time:', now.toString());
    console.log('Browser Date:', now.getDate());
    console.log('Browser UTC Offset:', now.getTimezoneOffset());
    console.log('---');
    console.log('Indonesia Time (Manual UTC+7):', indonesiaTime.toString());
    console.log('Indonesia Date:', indonesiaTime.getDate());
    console.log('Indonesia Month:', indonesiaTime.getMonth() + 1);
    console.log('Indonesia Year:', indonesiaTime.getFullYear());
    console.log('Indonesia Date String:', this.getIndonesiaDateString());
    console.log('======================');
    
    return {
      browserTime: now,
      indonesiaTime: indonesiaTime,
      dateString: this.getIndonesiaDateString()
    };
  }
}

/**
 * Class untuk mengelola navigasi antar tab.
 */
class TabManager {
  static init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        this.showTab(item.getAttribute('data-tab'));
      };
    });
  }

  static showTab(tabName) {
    // PERBAIKAN: Cek autentikasi sebelum pindah tab
    if (!WarkopBabol.isAuthenticated) {
      console.log('🔐 User not authenticated, cannot switch tabs');
      return;
    }

    try {
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      document.getElementById(tabName)?.classList.add('active');

      WarkopBabol.currentTab = tabName;

      switch (tabName) {
        case 'dashboard': Dashboard.load(); break;
        case 'menu': MenuManager.load(); break;
        case 'kasir': Kasir.load(); break;
        case 'laporan': LaporanManager.load(); break;
      }
    } catch (error) {
      console.error(`Error switching to tab ${tabName}:`, error);
      Utils.showNotification('Terjadi kesalahan saat berpindah tab', 'error');
    }
  }
}

/**
 * Class untuk mengelola data dan tampilan Dashboard.
 */
class Dashboard {
  static async load() {
    if (!WarkopBabol.isAuthenticated) return;

    try {
      console.log('🔄 Memuat data dashboard...');
      await this.loadStats();
    } catch (error) {
      console.error('Gagal memuat dashboard:', error);
    }
  }

  static async loadStats() {
    try {
      // Panggil API secara paralel untuk performa lebih baik
      const [menuResult, statsResult] = await Promise.all([
        Utils.apiCall('/menu'),
        Utils.apiCall('/transaksi/stats-today')
      ]);

      // Update total menu
      const menuData = menuResult.data || {};
      const totalMenu = (menuData.main_menu?.length ?? 0) + 
                        (menuData.drinks?.length ?? 0) + 
                        (menuData.additional?.length ?? 0);
      document.getElementById('totalMenu').textContent = totalMenu;

      // Update statistik hari ini
      const stats = statsResult.data || {};
      document.getElementById('pendapatanHariIni').textContent = Utils.formatRupiah(stats.total_pendapatan || 0);
      document.getElementById('transaksiHariIni').textContent = stats.jumlah_transaksi || 0;
      
      console.log('📊 Data dashboard berhasil dimuat.');
    } catch (error) {
      console.error('Gagal memuat statistik dashboard:', error);
      // Set nilai default jika terjadi error
      document.getElementById('totalMenu').textContent = '0';
      document.getElementById('pendapatanHariIni').textContent = 'Rp 0';
      document.getElementById('transaksiHariIni').textContent = '0';
      Utils.showNotification('Gagal mengambil data statistik', 'error');
    }
  }

  static refresh = Utils.debounce(() => this.load(), 500);
}

/**
 * Class untuk mengelola tampilan dan interaksi modal.
 */
class ModalManager {
  static init() {
    document.body.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.closest('.modal-close')) {
        this.hideAll();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideAll();
    });
    console.log('✅ Modal Manager siap.');
  }

  static show(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      setTimeout(() => modal.querySelector('input, button, select, textarea')?.focus(), 100);
    }
  }

  static hideAll() {
    document.querySelectorAll('.modal-overlay.show').forEach(modal => {
      modal.classList.remove('show');
    });
    document.body.style.overflow = 'auto';
  }
}

// --- FUNGSI UTAMA & SIKLUS HIDUP APLIKASI ---

/**
 * Mengupdate tampilan tanggal dan waktu di header.
 */
function updateDateTime() {
  const datetimeDisplay = document.getElementById('datetimeDisplay');
  if (datetimeDisplay) {
    try {
      const indonesiaTime = getIndonesiaTime();
      datetimeDisplay.textContent = Utils.formatDate(indonesiaTime);
    } catch (error) {
      console.error('Gagal mengupdate waktu:', error);
      datetimeDisplay.textContent = 'Gagal memuat waktu';
    }
  }
}

/**
 * PERBAIKAN: Fungsi inisialisasi yang menunggu autentikasi selesai
 */
async function initApp() {
  console.log('🌸 Menginisialisasi Sistem Warkop Babol...');
  
  try {
    // LANGKAH 1: Cek autentikasi DULU sebelum init yang lain
    const isAuthenticated = await AuthManager.checkAuth();
    
    if (!isAuthenticated) {
      console.log('🔐 Authentication failed, stopping initialization');
      return; // Stop initialization jika tidak terautentikasi
    }

    console.log('✅ Authentication successful, continuing initialization...');

    // LANGKAH 2: Lanjutkan inisialisasi jika sudah terautentikasi
    updateDateTime();
    const timeInterval = setInterval(updateDateTime, 1000);
    window.warkopIntervals = [timeInterval];

    TabManager.init();
    ModalManager.init();
    
    // Set default dates untuk laporan
    const today = Utils.getIndonesiaDateString();
    const tanggalMulaiInput = document.getElementById('tanggalMulai');
    const tanggalAkhirInput = document.getElementById('tanggalAkhir');
    
    if (tanggalMulaiInput) tanggalMulaiInput.value = today;
    if (tanggalAkhirInput) tanggalAkhirInput.value = today;

    // LANGKAH 3: Load dashboard setelah semua siap
    await Dashboard.load();

    console.log(`✅ Sistem Warkop Babol berhasil diinisialisasi. Tanggal: ${today}`);
    
  } catch (error) {
    console.error('❌ Gagal total saat inisialisasi:', error);
    Utils.showNotification('Gagal memuat aplikasi', 'error');
  }
}

/**
 * Membersihkan resource seperti interval saat halaman ditutup.
 */
function cleanupApp() {
  (window.warkopIntervals || []).forEach(clearInterval);
  console.log('🧹 Aplikasi dibersihkan.');
}

// --- EVENT LISTENER GLOBAL ---

window.addEventListener('error', (e) => console.error('Error Global:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Promise Ditolak:', e.reason));
window.addEventListener('beforeunload', cleanupApp);

// PERBAIKAN: DOMContentLoaded handler yang benar
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌸 DOM Content Loaded, starting authentication check...');
  initApp(); // Panggil async function
});

// --- EKSPOR GLOBAL & DEBUG ---

window.WarkopBabol = WarkopBabol;
window.Utils = Utils;
window.ModalManager = ModalManager;
window.TabManager = TabManager;
window.Dashboard = Dashboard;
window.AuthManager = AuthManager; // Export AuthManager untuk akses global

window.debugWarkop = {
  timezone: () => Utils.debugTimezone(),
  refreshDashboard: () => Dashboard.refresh(),
  testNotification: (type = 'success') => Utils.showNotification(`Tes notifikasi (${type})`, type),
  checkAuth: () => AuthManager.checkAuth(),
  logout: () => AuthManager.logout()
};

console.log('📦 Skrip utama Warkop Babol berhasil dimuat.');
