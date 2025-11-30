/* script.js - Updated for Integrated Dashboard */

// URL Web App Google Apps Script Anda (WAJIB SAMA)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz_eaJLR4kRskSYskNmz4Ilsz9p4--hK83HIM6c6mvwtX4zP-fPKPx0HtPsRvb_vQCLlw/exec';
const SUBMIT_URL = WEB_APP_URL; 
const READ_REPORTS_URL = `${WEB_APP_URL}?action=read`; 

let allReports = []; // Variabel global untuk menyimpan semua laporan yang diambil

document.addEventListener('DOMContentLoaded', () => {
    // === LOGIC UNTUK INPUT FORM (Tidak Berubah) ===
    const form = document.getElementById('reportForm');
    if (form) {
        // ... (Kode submit form ke Apps Script, sama seperti sebelumnya) ...
        form.addEventListener('submit', function(event) {
            event.preventDefault(); 
            // ... (logika fetch ke SUBMIT_URL) ...
            
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

    // === LOGIC UNTUK DASHBOARD DAN RINCIAN (dashboard.html) ===
    const reportTableBody = document.getElementById('reportTableBody');
    const statsGrid = document.getElementById('statsGrid');
    const filterStatus = document.getElementById('filterStatus');

    if (reportTableBody || statsGrid) {
        fetchReportsAndRenderDashboard();
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', () => {
            renderReportsTable(allReports, filterStatus.value);
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
                    allReports = data.reports; // Simpan data di variabel global
                    calculateAndRenderStats(allReports);
                    renderReportsTable(allReports, 'Semua');
                    renderCategoryChart(allReports);
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

        // Update DOM elements
        document.getElementById('totalInsiden').textContent = total;
        document.getElementById('totalFirstAid').textContent = firstAid;
        document.getElementById('totalNearMiss').textContent = nearMiss;
        document.getElementById('persenSelesai').textContent = persenSelesai + '%';
    }


    // Fungsi untuk Membuat Grafik Dinamis (Contoh Tren Kategori)
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
        
        // Hancurkan chart lama jika ada
        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'pie', // Menggunakan pie chart untuk distribusi kategori
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distribusi Kategori Insiden',
                    data: data,
                    backgroundColor: [
                        'rgba(128, 0, 0, 0.8)', // Maroon
                        'rgba(192, 64, 64, 0.8)', // Maroon Light
                        'rgba(255, 159, 64, 0.8)', // Oranye
                        'rgba(75, 192, 192, 0.8)' // Hijau muda
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


    // Fungsi untuk Menampilkan Rincian Laporan (dengan Filter)
    function renderReportsTable(reports, filterValue) {
        const filteredReports = reports.filter(report => {
            if (filterValue === 'Semua') return true;
            return (report['Status Tindak Lanjut'] || 'Belum Diperiksa') === filterValue;
        });
        
        if (!reportTableBody) return;

        reportTableBody.innerHTML = ''; // Kosongkan tabel
        
        if (filteredReports.length === 0) {
            reportTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Tidak ada laporan dengan status **${filterValue}**.</td></tr>`;
            return;
        }

        // Tampilkan 10 laporan terbaru dari hasil filter (reverse and slice)
        filteredReports.reverse().slice(0, 10).forEach(report => { 
            const status = report['Status Tindak Lanjut'] || 'Belum Diperiksa';
            const statusColor = status === 'Selesai' ? '#008000' : (status === 'Investigasi' ? '#ffcc00' : '#800000');
            const textColor = statusColor === '#ffcc00' ? '#333' : '#fff';

            const timestamp = report['Timestamp'] ? new Date(report['Timestamp']).toLocaleDateString('id-ID') : '-';
            
            const row = `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${timestamp}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${report['ID Pekerja'] || '-'}</td>
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