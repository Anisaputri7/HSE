/* script.js - Updated for Integrated Dashboard */

// --- START: VARIABEL LOGIN UNTUK MANAGER (BISA DIGANTI) ---
const MANAGER_USERNAME = 'hsemanager';
const MANAGER_PASSWORD = 'password123'; 
// --- END: VARIABEL LOGIN ---


// URL Web App Google Apps Script Anda (WAJIB SAMA)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz_eaJLR4kRskSYskNmz4Ilsz9p4--hK83HIM6c6mvwtX4zP-fPKPx0HtPsRvb_vQCLlw/exec';
const SUBMIT_URL = WEB_APP_URL; 
const READ_REPORTS_URL = `${WEB_APP_URL}?action=read`; 

let allReports = []; 

document.addEventListener('DOMContentLoaded', () => {
    
    // === START: LOGIC UNTUK LOGIN DASHBOARD ===
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const mainContent = document.querySelector('main');
    const headerContent = document.querySelector('header');
    const loginMessage = document.getElementById('loginMessage');
    
    if (loginOverlay && mainContent && headerContent) {
        mainContent.style.display = 'none';
        headerContent.style.display = 'none';

        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;

            if (usernameInput === MANAGER_USERNAME && passwordInput === MANAGER_PASSWORD) {
                loginOverlay.style.display = 'none'; 
                mainContent.style.display = 'block'; 
                headerContent.style.display = 'block';
                
                fetchReportsAndRenderDashboard(); 

            } else {
                loginMessage.textContent = 'Username atau Password salah! Coba lagi.';
                loginMessage.style.display = 'block';
                loginMessage.style.color = '#FF0000'; 
            }
        });
        
        if (document.title.includes('Dashboard HSE')) {
            loginOverlay.style.display = 'flex';
        }
    }
    // === END: LOGIC UNTUK LOGIN DASHBOARD ===
    
    
    // === LOGIC UNTUK INPUT FORM (Tidak Berubah) ===
    const form = document.getElementById('reportForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Mengirim... ⏳';

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            data['action'] = 'insert'; 
            const urlEncodedData = new URLSearchParams(data).toString();

            fetch(SUBMIT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            })
            .then(response => response.json()) 
            .then(result => {
                if (result.status === 'SUCCESS') {
                    alert("Laporan berhasil dikirim! ✅ Data kamu langsung diolah, lho!");
                    form.reset();
                } else {
                    alert(`Gagal mengirim laporan. Cek Apps Script Anda: ${result.message}`);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Terjadi kesalahan jaringan atau server saat mengirim laporan.');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = '🚀 Kirim Laporan';
            });
        });
    }

    // === LOGIC UNTUK DASHBOARD DAN RINCIAN (index.html) ===
    const reportTableBody = document.getElementById('reportTableBody');
    const filterStatus = document.getElementById('filterStatus');
    const filterDateStart = document.getElementById('filterDateStart');
    const filterDateEnd = document.getElementById('filterDateEnd');
    
    // Fungsi untuk memperbarui tampilan dashboard
    function updateDashboardView() {
        const status = filterStatus ? filterStatus.value : 'Semua';
        const dateStart = filterDateStart ? filterDateStart.value : null;
        const dateEnd = filterDateEnd ? filterDateEnd.value : null;

        // Filter berdasarkan tanggal masih harus menggunakan Timestamp, walaupun tidak ditampilkan.
        const datedReports = filterReportsByDate(allReports, dateStart, dateEnd);
        
        calculateAndRenderStats(datedReports);
        renderReportsTable(datedReports, status);
        renderCategoryChart(datedReports);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', updateDashboardView);
    }
    
    if (filterDateStart) {
        filterDateStart.addEventListener('change', updateDashboardView);
    }
    if (filterDateEnd) {
        filterDateEnd.addEventListener('change', updateDashboardView);
    }


    // Fungsi Filter Tanggal (Menggunakan logika parsing yang sudah teruji)
    function filterReportsByDate(reports, startDate, endDate) {
        if (!reports || reports.length === 0) return [];
        if (!startDate && !endDate) return reports;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (end) {
            // Majukan End Date 1 hari agar tanggal akhir termasuk
            end.setDate(end.getDate() + 1);
        }

        return reports.filter(report => {
            if (!report.Timestamp || report.Timestamp === '') return false;
            
            // Logika Parsing Tanggal Aman
            let dateObj;
            try {
                const timestampData = report.Timestamp;
                const parts = timestampData.split(' '); 
                const dateParts = parts[0].split('/'); 
                const isoString = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} ${parts[1] || '00:00:00'}`;
                dateObj = new Date(isoString);
            } catch (e) {
                return false; 
            }

            if (isNaN(dateObj.getTime())) return false; 
            
            let isAfterStart = true;
            if (start) {
                const reportDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
                isAfterStart = reportDay >= start; 
            }

            let isBeforeEnd = true;
            if (end) {
                 isBeforeEnd = dateObj < end; 
            }
            
            return isAfterStart && isBeforeEnd;
        });
    }


    function fetchReportsAndRenderDashboard() {
        if (reportTableBody) {
            reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Memuat data laporan...</td></tr>`;
        }

        fetch(READ_REPORTS_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.reports) {
                    allReports = data.reports; 
                    updateDashboardView();
                }
            })
            .catch(error => {
                console.error('Fetching reports error:', error);
                if (reportTableBody) {
                    reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">❌ Error memuat data. Cek Apps Script Anda.</td></tr>`;
                }
            });
    }
    
    // Fungsi untuk Menghitung dan Menampilkan Statistik
    function calculateAndRenderStats(reports) {
        const total = reports.length;
        let nearMiss = 0;
        let firstAid = 0;
        let selesaiCount = 0;

        reports.forEach(report => {
            const kategori = report['Kategori Insiden'];
            const status = report['Status Tindak Lanjut'];

            if (kategori === 'Near Miss') {
                nearMiss++;
            } else if (kategori === 'First Aid') {
                firstAid++;
            }
            
            if (status === 'Selesai') {
                selesaiCount++;
            }
        });

        const persenSelesai = total > 0 ? ((selesaiCount / total) * 100).toFixed(0) : 0;

        document.getElementById('totalInsiden').textContent = total;
        document.getElementById('totalFirstAid').textContent = firstAid;
        document.getElementById('totalNearMiss').textContent = nearMiss;
        document.getElementById('persenSelesai').textContent = persenSelesai + '%';
    }


    // Fungsi untuk Membuat Grafik Dinamis
    let myChart;
    function renderCategoryChart(reports) {
        const categoryCounts = {};
        reports.forEach(report => {
            const category = report['Kategori Insiden'];
            if (category && category !== '') {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
        });
        
        const labels = Object.keys(categoryCounts);
        const data = Object.values(categoryCounts);
        
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'pie', 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distribusi Kategori Insiden',
                    data: data,
                    backgroundColor: [
                        'rgba(128, 0, 0, 0.8)', 
                        'rgba(192, 64, 64, 0.8)', 
                        'rgba(255, 159, 64, 0.8)', 
                        'rgba(75, 192, 192, 0.8)' 
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }


    // Fungsi untuk Menampilkan Rincian Laporan (Sekarang Deskripsi Singkat)
    function renderReportsTable(reports, filterValue) {
        const filteredReports = reports.filter(report => {
            if (filterValue === 'Semua') return true;
            return (report['Status Tindak Lanjut'] || 'Belum Diperiksa') === filterValue;
        });
        
        if (!reportTableBody) return;

        reportTableBody.innerHTML = ''; 
        
        if (filteredReports.length === 0) {
            reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Tidak ada laporan dengan status **${filterValue}** atau di rentang tanggal ini.</td></tr>`;
            return;
        }

        // Urutkan laporan terbaru di atas
        filteredReports.reverse().slice(0, 10).forEach(report => { 
            const status = report['Status Tindak Lanjut'] || 'Belum Diperiksa';
            const statusColor = status === 'Selesai' ? '#008000' : (status === 'Investigasi' ? '#ffcc00' : '#800000');
            const textColor = statusColor === '#ffcc00' ? '#333' : '#fff';

            // Ambil Deskripsi Kejadian dan potong agar tidak terlalu panjang
            const rawDescription = report['Deskripsi Kejadian'] || 'Tidak ada deskripsi.';
            const shortDescription = rawDescription.substring(0, 50) + (rawDescription.length > 50 ? '...' : '');
            
            const row = `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rawDescription}">${shortDescription}</td> <td style="padding: 10px; border-bottom: 1px solid #eee;">${report['ID Pekerja'] || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${report['Nama Pelapor'] || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${report['Lokasi Kejadian'] || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${report['Kategori Insiden'] || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                        <span style="background-color: ${statusColor}; color: ${textColor}; padding: 5px; border-radius: 5px; font-size: 0.8rem; font-weight: 500;">${status}</span>
                    </td>
                </tr>
            `;
            reportTableBody.innerHTML += row;
        });
    }
});