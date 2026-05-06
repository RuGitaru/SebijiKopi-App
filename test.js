
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        coffee: {
                            50: '#f8f5f2', 100: '#efebe7', 200: '#dfd7cf', 300: '#c8b9ab', 
                            400: '#ac9582', 500: '#947a67', 600: '#846959', 700: '#6e574b', 
                            800: '#5a4940', 900: '#4b3d36', 950: '#281f1c'
                        },
                        accent: {
                            gold: '#c6a664',
                            cream: '#faf7f2',
                            terracotta: '#a65d4a'
                        }
                    },
                    fontFamily: {
                        display: ['Outfit', 'sans-serif'],
                        sans: ['Inter', 'sans-serif']
                    }
                }
            }
        }
    

        const PRODUCT_LIST = ['Arabika Gayo Specialty', 'Robusta Dampit Premium', 'Liberika Jambi Eksotik', 'Excelsa House Blend'];
        const PRODUCT_PRICES = { 'Arabika Gayo Specialty': 120, 'Robusta Dampit Premium': 85, 'Liberika Jambi Eksotik': 145, 'Excelsa House Blend': 110 };
        const WMS_CONFIG = { BLOCKS_PER_ZONE: 4, CAPACITY_PER_BLOCK: 400 };

        let currentUser = null; let customerCart = []; let globalOrdersCache = []; let globalStocksCache = null; let sdmDataArray = []; let globalInboundTasksCache = [];
        let globalReportInboundCache = []; let globalReportOutboundCache = [];
        let adminTrendChart = null; let adminCompositionChart = null;

        let globalPagination = {
            custOrders: { current: 1, size: 6 },
            adminOrders: { current: 1, size: 8 },
            adminCustomers: { current: 1, size: 10 },
            adminSdm: { current: 1, size: 10 },
            whOrders: { current: 1, size: 8 },
            whInbound: { current: 1, size: 6 },
            whReportInbound: { current: 1, size: 10 },
            whReportOutbound: { current: 1, size: 10 }
        };

        function switchPage(context, page) {
            globalPagination[context].current = page;
            if (context === 'custOrders') renderCustomerDashboard(true);
            else if (context === 'adminOrders') renderAdminDashboard('orders', true);
            else if (context === 'adminCustomers') renderAdminDashboard('customers', true);
            else if (context === 'adminSdm') renderAdminDashboard('all', true);
            else if (context === 'whOrders') loadWarehouseData('picking', true);
            else if (context === 'whInbound') loadWarehouseData('inbound', true);
            else if (context === 'whReportInbound') renderReportInbound();
            else if (context === 'whReportOutbound') renderReportOutbound();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function renderPagination(totalItems, pageSize, currentPage, targetId, context) {
            const container = document.getElementById(targetId);
            if (!container) return;
            const totalPages = Math.ceil(totalItems / pageSize);
            if (totalPages <= 1) { container.innerHTML = ""; return; }
            let html = `<div class="flex justify-center items-center gap-3 mt-10 pb-6">`;
            html += `<button onclick="switchPage('${context}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-6 py-3 rounded-2xl bg-white border border-coffee-100 text-coffee-950 font-black text-[10px] hover:bg-coffee-50 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm uppercase tracking-widest">&larr; Prev</button>`;
            for (let i = 1; i <= totalPages; i++) {
                const active = i === currentPage ? 'bg-coffee-950 text-white border-coffee-950 shadow-xl shadow-coffee-200' : 'bg-white text-coffee-400 border-coffee-100 hover:bg-coffee-50 shadow-sm';
                html += `<button onclick="switchPage('${context}', i)" class="w-12 h-12 rounded-2xl border font-black text-xs transition active:scale-90 ${active}">${i}</button>`;
            }
            html += `<button onclick="switchPage('${context}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-6 py-3 rounded-2xl bg-white border border-coffee-100 text-coffee-950 font-black text-[10px] hover:bg-coffee-50 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm uppercase tracking-widest">Next &rarr;</button>`;
            html += `</div>`;
            container.innerHTML = html;
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('wh-sidebar');
            if (sidebar.classList.contains('w-64')) { sidebar.classList.replace('w-64', 'w-0'); }
            else { sidebar.classList.replace('w-0', 'w-64'); }
        }

        function switchWhTab(tabId) {
            document.querySelectorAll('.wh-tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.wh-nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.getElementById(`btn-${tabId}`).classList.add('active');
            if (window.innerWidth < 768) {
                const sidebar = document.getElementById('wh-sidebar');
                if (sidebar && sidebar.classList.contains('w-64')) toggleSidebar();
            }
            if (tabId === 'tab-reports') loadReportsData();
        }

        function updateClock() {
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
            document.querySelectorAll('.live-clock').forEach(c => c.innerHTML = `${dateStr} &bull; ${timeStr}`);
        }
        setInterval(updateClock, 1000); updateClock();

        function toggleCustSidebar() {
            const sidebar = document.getElementById('cust-sidebar');
            if (sidebar.classList.contains('w-64')) { sidebar.classList.replace('w-64', 'w-0'); }
            else { sidebar.classList.replace('w-0', 'w-64'); }
        }

        function switchCustTab(tabId) {
            document.querySelectorAll('.cust-tab-content').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); });
            document.querySelectorAll('.cust-nav-btn').forEach(el => el.classList.remove('active'));
            const activeEl = document.getElementById(tabId);
            if(activeEl) { activeEl.classList.add('active'); activeEl.classList.remove('hidden'); }
            const activeBtn = document.getElementById(`btn-${tabId}`);
            if(activeBtn) activeBtn.classList.add('active');
            if (tabId === 'cust-tab-profile') fillProfileForm();
            if (window.innerWidth < 1024) {
                const sidebar = document.getElementById('cust-sidebar');
                if (sidebar && sidebar.classList.contains('w-64')) toggleCustSidebar();
            }
        }

        function fillProfileForm() {
            if (!currentUser) return;
            const u = currentUser;
            document.getElementById('prof-name').value = u.name || '';
            document.getElementById('prof-email').value = u.email || '';
            document.getElementById('prof-phone').value = u.phone || '';
            document.getElementById('prof-address').value = u.address || '';
            document.getElementById('prof-password').value = '';
            
            // Header UI update
            document.getElementById('profile-name-header').innerText = u.name || 'User';
            document.getElementById('profile-username-header').innerText = '@' + (u.username || 'user');
            if(u.name) document.getElementById('profile-initial-circle').innerText = u.name.charAt(0).toUpperCase();
        }

        function updateCustomerProfile() {
            const btn = document.getElementById('btn-save-profile');
            const ogText = btn.innerHTML;
            
            const payload = {
                name: document.getElementById('prof-name').value.trim(),
                email: document.getElementById('prof-email').value.trim(),
                phone: document.getElementById('prof-phone').value.trim(),
                address: document.getElementById('prof-address').value.trim(),
                password: document.getElementById('prof-password').value
            };

            const executeUpdate = () => {
                btn.innerHTML = `<svg class="animate-spin w-5 h-5 mr-3" viewBox="0 0 24 24">...</svg> Memproses...`;
                btn.disabled = true;

                fetch('/api/customer/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        currentUser.name = data.user.name;
                        currentUser.email = data.user.email;
                        currentUser.phone = data.user.phone;
                        currentUser.address = data.user.address;
                        
                        document.getElementById('cust-name-display').innerText = data.user.name;
                        alert("Profil berhasil diperbarui!");
                        fillProfileForm();
                    } else {
                        alert("Gagal: " + data.message);
                    }
                }).finally(() => {
                    btn.innerHTML = ogText;
                    btn.disabled = false;
                });
            };

            if (payload.password) {
                openConfirmModal(
                    "Konfirmasi Ganti Sandi", 
                    "Anda memasukkan kata sandi baru. Apakah Anda yakin ingin memperbarui keamanan akun Anda?", 
                    executeUpdate
                );
            } else {
                executeUpdate();
            }
        }

        function navigateTo(pageId) {
            document.querySelectorAll('.page-wrapper').forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            window.scrollTo(0, 0);

            if (pageId === 'page-customer') {
                switchCustTab('cust-tab-dashboard');
                renderCustomerDashboard();
            }
            if (pageId === 'page-admin') {
                initMonthPickers();
                renderAdminDashboard();
                switchAdminTab('admin-tab-dashboard');
            }
            if (pageId === 'page-warehouse') {
                applyWarehouseTheme();
                switchWhTab('tab-picking');
                initMonthPickers();
                loadSdmDataAndWarehouse(); // Memuat data karyawan terlebih dahulu
            }
        }

        function initMonthPickers() {
            const now = new Date();
            const mVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            ['admin-orders-month', 'admin-customers-month', 'admin-analytics-month', 'wh-inbound-month', 'wh-picking-month', 'report-month'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.value) el.value = mVal;
            });
        }

        // =========================================
        // ISOLASI HAK AKSES KETAT (SPV VS OPERATOR)
        // =========================================
        function applyRoleAccess() {
            if (!currentUser) return;
            const role = currentUser.role;

            // Mencari jabatan spesifik operator di database (Inbound / Packing)
            const myData = sdmDataArray.find(s => s.name === currentUser.name);
            const specificRole = myData ? myData.role : '';

            // Elemen Menu
            const btnPicking = document.getElementById('btn-tab-picking');
            const btnInbound = document.getElementById('btn-tab-inbound');
            const btnLayout = document.getElementById('btn-tab-layout');
            const btnOpname = document.getElementById('btn-tab-opname');
            const btnSdm = document.getElementById('btn-tab-sdm');
            const btnReports = document.getElementById('btn-tab-reports');
            const hdrMaster = document.getElementById('sidebar-header-master');
            const roleDisplay = document.getElementById('warehouse-role-display');

            // Elemen Baris Eksekusi Massal (Hanya SPV)
            const batchControls = document.getElementById('batch-controls-container');

            if (role === 'wh_operator') {
                // Yang Operator BOLEH lihat
                if (btnLayout) btnLayout.style.display = 'flex'; // Operator boleh lihat Peta 2D

                // Yang Operator TIDAK BOLEH lihat
                if (btnOpname) btnOpname.style.display = 'none';
                if (btnSdm) btnSdm.style.display = 'none';
                if (btnReports) btnReports.style.display = 'none';
                if (hdrMaster) hdrMaster.style.display = 'none';
                if (batchControls) batchControls.style.display = 'none';

                // Spesifik Tugas: Inbound vs Packing
                if (specificRole.includes('Inbound')) {
                    if (btnInbound) btnInbound.style.display = 'flex';
                    if (btnPicking) btnPicking.style.display = 'none'; // Operator Inbound tidak mempicking
                    if (roleDisplay) { roleDisplay.innerText = 'OPERATOR INBOUND'; roleDisplay.className = "text-emerald-300 font-black"; }
                    switchWhTab('tab-inbound');
                } else {
                    if (btnInbound) btnInbound.style.display = 'none'; // Operator Picking tidak bisa masuk barang
                    if (roleDisplay) { roleDisplay.innerText = 'OPERATOR PICKING'; roleDisplay.className = "text-emerald-300 font-black"; }
                }

            } else if (role === 'wh_supervisor') {
                // Supervisor melihat semuanya
                if (btnPicking) btnPicking.style.display = 'flex';
                if (btnInbound) btnInbound.style.display = 'flex';
                if (btnLayout) btnLayout.style.display = 'flex';
                if (btnOpname) btnOpname.style.display = 'flex';
                if (btnSdm) btnSdm.style.display = 'flex';
                if (btnReports) btnReports.style.display = 'flex';
                if (hdrMaster) hdrMaster.style.display = 'block';
                if (batchControls) batchControls.style.display = 'flex';

                if (roleDisplay) {
                    roleDisplay.innerText = 'SUPERVISOR';
                    roleDisplay.className = "text-red-400 font-black";
                }
            }
        }
        
        function loadReportsData() {
            const monthInput = document.getElementById('report-month');
            let query = '';
            if (monthInput && monthInput.value) {
                query = '?month=' + monthInput.value;
            } else if (monthInput) {
                const now = new Date();
                const mVal = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
                monthInput.value = mVal;
                query = '?month=' + mVal;
            }
            
            fetch('/api/warehouse/reports' + query).then(res => res.json()).then(data => {
                if (!data.success) return console.error("Gagal memuat laporan.");
                
                // Cache data dan reset paginasi
                globalReportInboundCache = data.inbound;
                globalReportOutboundCache = data.outbound;
                globalPagination.whReportInbound.current = 1;
                globalPagination.whReportOutbound.current = 1;

                renderReportInbound();
                renderReportOutbound();

                // Kalkulasi Ringkasan Volume Per Produk (Tetap pakai full data hasil fetch)
                const inboundTotals = {};
                const outboundTotals = {};
                PRODUCT_LIST.forEach(p => { inboundTotals[p] = 0; outboundTotals[p] = 0; });
                
                globalReportInboundCache.forEach(t => { if(inboundTotals[t.product] !== undefined) inboundTotals[t.product] += t.qty; });
                globalReportOutboundCache.forEach(o => { o.items.forEach(i => { if(outboundTotals[i.product] !== undefined) outboundTotals[i.product] += i.qty; }); });
                
                const summaryContainer = document.getElementById('report-summary-container');
                if (summaryContainer) {
                    let summaryHTML = `<h3 class="font-black text-coffee-950 text-xl mb-8 flex items-center gap-3 font-display uppercase tracking-tighter"><span class="w-2.5 h-8 bg-coffee-950 rounded-full inline-block"></span> Ringkasan Volume Produk</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-8">`;
                    
                    // Inbound Card
                    summaryHTML += `
                    <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-coffee-50 flex flex-col hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                        <div class="absolute -right-8 -top-8 w-20 h-20 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div class="flex items-center gap-4 mb-6 relative z-10">
                            <div class="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl shadow-sm border border-emerald-100">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-black text-coffee-950 uppercase tracking-[0.2em] text-[10px]">Total Inbound Stok</h4>
                                <p class="text-[9px] font-bold text-coffee-300 uppercase tracking-widest mt-0.5">Bulan Ini</p>
                            </div>
                        </div>
                        <div class="space-y-3 relative z-10">`;
                    PRODUCT_LIST.forEach(p => {
                        summaryHTML += `
                        <div class="flex justify-between items-center bg-coffee-50/30 p-4 rounded-2xl border border-coffee-50/50 hover:border-emerald-200 transition">
                            <span class="text-[11px] font-black text-coffee-600 uppercase tracking-tight">${p}</span>
                            <span class="font-black text-coffee-950 text-base">${Math.round(inboundTotals[p])} <span class="text-[10px] text-coffee-300 font-bold uppercase">Kg</span></span>
                        </div>`;
                    });
                    summaryHTML += `</div></div>`;
                    
                    // Outbound Card
                    summaryHTML += `
                    <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border border-coffee-50 flex flex-col hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                        <div class="absolute -right-8 -top-8 w-20 h-20 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div class="flex items-center gap-4 mb-6 relative z-10">
                            <div class="bg-blue-50 text-blue-600 p-3.5 rounded-2xl shadow-sm border border-blue-100">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-black text-coffee-950 uppercase tracking-[0.2em] text-[10px]">Total Outbound Selesai</h4>
                                <p class="text-[9px] font-bold text-coffee-300 uppercase tracking-widest mt-0.5">Bulan Ini</p>
                            </div>
                        </div>
                        <div class="space-y-3 relative z-10">`;
                    PRODUCT_LIST.forEach(p => {
                        summaryHTML += `
                        <div class="flex justify-between items-center bg-coffee-50/30 p-4 rounded-2xl border border-coffee-50/50 hover:border-blue-200 transition">
                            <span class="text-[11px] font-black text-coffee-600 uppercase tracking-tight">${p}</span>
                            <span class="font-black text-coffee-950 text-base">${Math.round(outboundTotals[p])} <span class="text-[10px] text-coffee-300 font-bold uppercase">Kg</span></span>
                        </div>`;
                    });
                    summaryHTML += `</div></div></div>`;
                    
                    summaryContainer.innerHTML = summaryHTML;
                }
            });
        }

        function renderReportInbound() {
            const inBody = document.getElementById('inbound-report-body');
            if (!inBody) return;
            
            const pg = globalPagination.whReportInbound;
            if (globalReportInboundCache.length === 0) {
                inBody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-coffee-300 font-black uppercase tracking-widest text-sm">Belum ada riwayat Inbound</td></tr>`;
                renderPagination(0, pg.size, pg.current, 'pagination-report-inbound', 'whReportInbound');
                return;
            }
            
            const start = (pg.current - 1) * pg.size;
            const end = start + pg.size;
            const paginated = globalReportInboundCache.slice(start, end);
            
            inBody.innerHTML = paginated.map(t => `
                <tr class="border-b border-coffee-50 hover:bg-emerald-50/20 transition-colors group">
                    <td class="p-6 text-[10px] font-black text-coffee-300 uppercase tracking-tight">${t.date}</td>
                    <td class="p-6 font-black text-coffee-950 uppercase tracking-tight">${t.product}</td>
                    <td class="p-6">
                        <span class="text-emerald-600 font-black text-lg">+ ${Math.round(t.qty)} <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Kg</span></span>
                    </td>
                    <td class="p-6 text-xs font-black text-coffee-600 uppercase tracking-tight">${t.operator}</td>
                    <td class="p-6">
                        ${t.status === 'Selesai Inbound' ? 
                            '<span class="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">✅ Selesai</span>' : 
                            '<span class="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100 shadow-sm">' + t.status.toUpperCase() + '</span>'}
                    </td>
                </tr>`).join('');
                
            renderPagination(globalReportInboundCache.length, pg.size, pg.current, 'pagination-report-inbound', 'whReportInbound');
        }

        function renderReportOutbound() {
            const outBody = document.getElementById('outbound-report-body');
            if (!outBody) return;
            
            const pg = globalPagination.whReportOutbound;
            if (globalReportOutboundCache.length === 0) {
                outBody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-coffee-300 font-black uppercase tracking-widest text-sm">Belum ada transaksi keluar.</td></tr>`;
                renderPagination(0, pg.size, pg.current, 'pagination-report-outbound', 'whReportOutbound');
                return;
            }
            
            const start = (pg.current - 1) * pg.size;
            const end = start + pg.size;
            const paginated = globalReportOutboundCache.slice(start, end);
            
            outBody.innerHTML = paginated.map(o => {
                const itemList = o.items.map(i => `
                    <div class="mb-2 flex items-center justify-between bg-coffee-50/50 px-3 py-1.5 rounded-lg border border-coffee-100/50">
                        <span class="text-[10px] font-bold text-coffee-600">${i.product}</span>
                        <span class="text-[10px] font-black text-coffee-950">${Math.round(i.qty)} Kg</span>
                    </div>`).join('');
                return `
                    <tr class="border-b border-coffee-50 hover:bg-blue-50/20 transition-colors group">
                        <td class="p-6 text-[10px] font-black text-coffee-300 uppercase tracking-tight">${o.date}</td>
                        <td class="p-6">
                            <span class="font-mono text-sm font-black text-coffee-950 bg-coffee-50 px-3 py-1 rounded-xl border border-coffee-100">#ORD-${o.id}</span>
                        </td>
                        <td class="p-6 font-black text-coffee-950 uppercase tracking-tight">${o.customer}</td>
                        <td class="p-6 w-72">${itemList}</td>
                    </tr>`;
            }).join('');
            
            renderPagination(globalReportOutboundCache.length, pg.size, pg.current, 'pagination-report-outbound', 'whReportOutbound');
        }

        function toggleAuth(type) {
            document.getElementById('form-login-container').classList.toggle('hidden', type !== 'login');
            document.getElementById('form-register-container').classList.toggle('hidden', type !== 'register');
        }

        function fillLogin(username) {
            document.getElementById('input-username').value = username;
            document.getElementById('input-password').value = '123';
        }

        function processLogin() {
            const userBox = document.getElementById('input-username').value.trim();
            const passBox = document.getElementById('input-password').value.trim();
            const errBox = document.getElementById('login-error');

            fetch('/api/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userBox, password: passBox })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    currentUser = data; errBox.classList.add('hidden');
                    if (data.role === 'customer') {
                        document.getElementById('cust-name-display').innerText = data.name;
                        customerCart = []; renderCart(); navigateTo('page-customer');
                    } else if (data.role === 'admin') navigateTo('page-admin');
                    else if (data.role === 'wh_supervisor' || data.role === 'wh_operator') {
                        document.getElementById('warehouse-loc-display').innerText = data.location;
                        document.getElementById('warehouse-user-greeting').innerText = `Selamat datang, ${data.name}`;
                        document.getElementById('wh-sidebar').classList.replace('w-0', 'w-64');
                        navigateTo('page-warehouse');
                    }
                } else {
                    errBox.classList.remove('hidden'); errBox.innerText = data.message;
                }
            }).catch(e => { alert("Pastikan server Python sedang berjalan!"); });
        }

        function safeLogout() {
            openConfirmModal(
                "Konfirmasi Keluar", 
                "Apakah Anda yakin ingin mengakhiri sesi ini? Anda harus masuk kembali untuk mengakses portal.", 
                () => {
                    fetch('/api/logout', { method: 'POST' }).then(() => {
                        currentUser = null; 
                        document.getElementById('input-username').value = ''; 
                        document.getElementById('input-password').value = '';
                        navigateTo('page-landing');
                    });
                }
            );
        }

        function processRegister() {
            const payload = {
                username: document.getElementById('reg-username').value.trim(),
                password: document.getElementById('reg-password').value.trim(),
                name: document.getElementById('reg-name').value.trim(),
                email: document.getElementById('reg-email').value.trim(),
                address: document.getElementById('reg-address').value.trim(),
                phone: document.getElementById('reg-phone').value.trim()
            };
            if (!payload.name || !payload.address || !payload.phone || !payload.username || !payload.password || !payload.email) return alert("Lengkapi semua kolom, termasuk email!");
            fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                .then(res => res.json()).then(data => {
                    if (data.success) { alert("Pendaftaran Berhasil! Silakan Login."); document.getElementById('input-username').value = payload.username; document.getElementById('input-password').value = payload.password; document.getElementById('register-form').reset(); toggleAuth('login'); }
                    else alert(data.message);
                });
        }

        function applyWarehouseTheme() {
            if (!currentUser) return;
            const header = document.getElementById('wh-sidebar-header');
            if (header) {
                header.classList.remove('bg-emerald-700', 'bg-blue-700', 'bg-orange-600', 'bg-slate-900');
                if (currentUser.location === 'Bekasi') header.classList.add('bg-emerald-700');
                else if (currentUser.location === 'Jakarta Utara') header.classList.add('bg-blue-700');
                else if (currentUser.location === 'Cikarang') header.classList.add('bg-orange-600');
                else header.classList.add('bg-slate-900');
            }
        }

        function addToCart() {
            const prodSelect = document.getElementById('order-product'); const prod = prodSelect.options[prodSelect.selectedIndex].text.split(' (')[0];
            const qty = parseFloat(document.getElementById('order-qty').value); if (qty <= 0 || isNaN(qty)) return;
            const existing = customerCart.find(i => i.product === prod);
            if (existing) existing.qty += qty; else customerCart.push({ product: prod, qty: qty });
            document.getElementById('order-qty').value = 10; renderCart();
        }

        function removeFromCart(idx) { customerCart.splice(idx, 1); renderCart(); }

        function renderCart() {
            const container = document.getElementById('cart-items-container'); 
            const btnCheckout = document.getElementById('btn-checkout'); 
            const totalEl = document.getElementById('cart-total-price');
            const cartCounter = document.getElementById('cart-counter');
            if (!container) return;
            
            if (customerCart.length === 0) { 
                container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-coffee-200 py-16 opacity-50">
                    <div class="w-20 h-20 bg-coffee-50 rounded-full flex items-center justify-center mb-4">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    </div>
                    <p class="text-xs font-black uppercase tracking-widest">Keranjang Kosong</p>
                </div>`; 
                btnCheckout.disabled = true; 
                btnCheckout.classList.add('opacity-30', 'grayscale'); 
                if (totalEl) totalEl.innerText = '0'; 
                if(cartCounter) cartCounter.innerText = '0 Item'; 
                return; 
            }
            
            btnCheckout.disabled = false; 
            btnCheckout.classList.remove('opacity-30', 'grayscale');
            let totalCartPrice = 0;
            
            container.innerHTML = customerCart.map((item, idx) => {
                const pricePerKg = PRODUCT_PRICES[item.product]; 
                const roundedQty = Math.round(item.qty);
                const subtotal = pricePerKg * roundedQty; 
                totalCartPrice += subtotal;
                
                return `
                <div class="group bg-white p-6 rounded-[2rem] border border-coffee-50 shadow-sm hover:shadow-xl hover:border-accent-gold/20 transition-all duration-500 relative overflow-hidden">
                    <div class="absolute -right-6 -top-6 w-16 h-16 bg-coffee-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="relative z-10">
                        <div class="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-2">${item.product}</div>
                        <div class="flex justify-between items-end">
                            <div>
                                <div class="text-2xl font-black text-coffee-950 tracking-tighter">${roundedQty} <span class="text-xs font-bold text-coffee-300 uppercase">Kg</span></div>
                                <div class="text-[10px] font-black text-accent-gold uppercase tracking-widest mt-1">Rp ${pricePerKg}K / Kg</div>
                            </div>
                            <div class="text-right">
                                <div class="text-lg font-black text-coffee-950 tracking-tight">Rp ${subtotal.toLocaleString('id-ID')}K</div>
                                <button onclick="removeFromCart(${idx})" class="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest mt-2 transition">Hapus Item</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
            
            if (totalEl) totalEl.innerText = totalCartPrice.toLocaleString('id-ID');
            if (cartCounter) cartCounter.innerText = customerCart.length + ' Item';
        }

        function submitOrderCustomer() {
            if (customerCart.length === 0) return;
            const btn = document.getElementById('btn-checkout'); const ogText = btn.innerHTML;
            btn.innerHTML = "Memproses..."; btn.classList.replace('bg-blue-600', 'bg-emerald-500');
            fetch('/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: customerCart }) })
                .then(res => res.json()).then(data => {
                    if (data.success) { customerCart = []; setTimeout(() => { btn.innerHTML = ogText; btn.classList.replace('bg-emerald-500', 'bg-blue-600'); renderCart(); renderCustomerDashboard(); }, 500); }
                }).catch(e => { alert("Gagal memproses pesanan."); btn.innerHTML = ogText; btn.classList.replace('bg-emerald-500', 'bg-blue-600'); });
        }
        function renderCustomerDashboard(fromPagination = false) {
            if (!fromPagination) globalPagination.custOrders.current = 1;
            
            const month = document.getElementById('cust-history-month')?.value || 'all';
            const year = document.getElementById('cust-history-year')?.value || 'all';
            const query = `?month=${month}&year=${year}`;

            fetch('/api/customer/orders' + query).then(res => { if (!res.ok) throw new Error("Terjadi Error 500"); return res.json(); }).then(myOrders => {
                if (myOrders.error) return; globalOrdersCache = myOrders;
                const stats = document.getElementById('cust-stats-container-new'); const tbody = document.getElementById('customer-orders-body-new');
                const summaryDiv = document.getElementById('cust-history-period-summary');
                if (!stats || !tbody) return;

                const activeCount = myOrders.filter(o => o.status !== 'Serahkan ke Jasa Kirim' && o.status !== 'Selesai').length;
                const completedCount = myOrders.filter(o => o.status === 'Selesai').length;
                let totalKg = 0; myOrders.forEach(o => o.items.forEach(i => totalKg += i.qty));

                // Dashboard Stats
                stats.innerHTML = `
                    <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-coffee-100 flex items-center gap-5 hover:shadow-md transition">
                        <div class="bg-coffee-100 text-coffee-600 p-5 rounded-2xl"><svg class="w-8 h-8 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg></div>
                        <div><div class="text-[10px] text-coffee-400 font-black uppercase tracking-widest mb-1">Total Belanja</div><div class="text-3xl font-black text-coffee-950 tracking-tighter">${Math.round(totalKg)} <span class="text-sm font-bold text-coffee-400">Kg</span></div></div>
                    </div>
                    <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-coffee-100 flex items-center gap-5 hover:shadow-md transition">
                        <div class="bg-accent-gold/10 text-accent-gold p-5 rounded-2xl"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                        <div><div class="text-[10px] text-coffee-400 font-black uppercase tracking-widest mb-1">Order Aktif</div><div class="text-3xl font-black text-coffee-950 tracking-tighter">${activeCount} <span class="text-sm font-bold text-coffee-400">Batch</span></div></div>
                    </div>
                    <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-coffee-100 flex items-center gap-5 hover:shadow-md transition">
                        <div class="bg-emerald-50 text-emerald-600 p-5 rounded-2xl"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                        <div><div class="text-[10px] text-coffee-400 font-black uppercase tracking-widest mb-1">Status Member</div><div class="text-3xl font-black text-coffee-950 tracking-tighter">Premium</div></div>
                    </div>`;

                // Period Summary
                if (summaryDiv) {
                    summaryDiv.innerHTML = `
                        <div class="bg-coffee-900 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-white/10 glass">
                            <div class="flex items-center gap-5">
                                <div class="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20"><svg class="w-6 h-6 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg></div>
                                <div>
                                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-accent-gold opacity-80">Ringkasan Periode</p>
                                    <h4 class="text-lg font-black tracking-tight">${month !== 'all' ? document.getElementById('cust-history-month').options[document.getElementById('cust-history-month').selectedIndex].text : 'Semua Bulan'} ${year}</h4>
                                </div>
                            </div>
                            <div class="flex gap-8">
                                <div class="text-center">
                                    <p class="text-[9px] font-bold text-coffee-300 uppercase tracking-widest mb-1">Total Serapan</p>
                                    <p class="text-2xl font-black text-white">${Math.round(totalKg)} <span class="text-xs font-bold text-white/50">Kg</span></p>
                                </div>
                                <div class="w-[1px] bg-white/10"></div>
                                <div class="text-center">
                                    <p class="text-[9px] font-bold text-coffee-300 uppercase tracking-widest mb-1">Selesai</p>
                                    <p class="text-2xl font-black text-accent-gold">${completedCount} <span class="text-xs font-bold text-white/50">Batch</span></p>
                                </div>
                            </div>
                        </div>`;
                }

                if (myOrders.length === 0) { tbody.innerHTML = `<div class="col-span-1 md:col-span-2 bg-white p-16 text-center rounded-[3rem] border border-coffee-100 shadow-sm flex flex-col items-center justify-center gap-3"><div class="w-20 h-20 bg-coffee-50 text-coffee-300 rounded-full flex items-center justify-center mb-2"><svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg></div><p class="font-black text-coffee-400 uppercase tracking-widest text-sm">Belum ada riwayat pesanan.</p></div>`; return; }
                
                // Pagination Slice
                const pg = globalPagination.custOrders;
                const start = (pg.current - 1) * pg.size;
                const end = start + pg.size;
                const paginatedData = myOrders.slice(start, end);

                tbody.innerHTML = paginatedData.map(o => {
                    let orderTotal = 0; const itemsHtml = o.items.map(i => {
                        const price = PRODUCT_PRICES[i.product] || 0; const subtotal = price * i.qty; orderTotal += subtotal;
                        return `<div class="font-black text-sm text-coffee-950">${i.product} <span class="bg-coffee-50 text-coffee-600 px-2 py-0.5 rounded-lg text-xs ml-1 font-bold">${Math.round(i.qty)} Kg</span></div>`;
                    }).join('');

                    let awbHtml = ''; if (o.awb_number) { 
                        awbHtml = `<div class="mt-4 bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div class="font-mono text-sm font-black text-coffee-900 tracking-widest uppercase">${o.awb_number}</div></div><span class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">${o.expedition}</span></div>`; 
                    }

                    return `
                        <div class="bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-coffee-50 flex flex-col hover:shadow-xl hover:border-accent-gold/20 transition-all duration-500 group relative overflow-hidden">
                            <div class="absolute -right-12 -top-12 w-24 h-24 bg-coffee-50 rounded-full opacity-0 group-hover:opacity-100 transition duration-700"></div>
                            <div class="flex justify-between items-start mb-6 border-b border-coffee-50 pb-4 relative z-10">
                                <div><span class="font-mono text-[10px] font-black bg-coffee-950 px-3 py-1.5 rounded-xl border border-coffee-900 text-white uppercase tracking-tighter">#ORD-${o.id}</span></div>
                                <div class="text-[10px] font-black text-coffee-300 uppercase tracking-widest">${o.date}</div>
                            </div>
                            <div class="space-y-3 mb-6 flex-grow relative z-10">${itemsHtml}</div>
                            <div class="bg-coffee-50/50 border border-coffee-100 rounded-[2rem] p-6 mb-6 relative z-10">
                                <span class="text-[9px] font-black text-coffee-400 uppercase tracking-widest block mb-1">Total Transaksi</span>
                                <div class="text-2xl font-black text-coffee-950">Rp ${orderTotal.toLocaleString('id-ID')}.000</div>
                            </div>
                            <div class="block mb-6 relative z-10">${awbHtml}</div>
                            <div class="mt-auto border-t border-coffee-50 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                                <div class="w-full text-center md:text-left">${getStatusBadge(o.status, o.warehouse)}</div>
                                <div class="flex gap-2 w-full md:w-auto">
                                    ${o.status === 'Serahkan ke Jasa Kirim' ? `
                                        <button onclick="confirmOrderReceived(${o.id})" class="flex-grow md:flex-none text-[10px] uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 transition transform active:scale-95 flex items-center justify-center gap-2">
                                            Diterima
                                        </button>
                                    ` : ''}
                                    <button onclick="openInvoice(${o.id})" class="w-full md:w-auto text-[10px] uppercase tracking-widest text-coffee-950 hover:text-white bg-coffee-100 hover:bg-coffee-900 px-6 py-3 rounded-2xl font-black transition flex items-center justify-center gap-2 border border-coffee-200">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg> 
                                        Nota
                                    </button>
                                </div>
                            </div>
                        </div>`;
                }).join('');

                renderPagination(myOrders.length, pg.size, pg.current, 'pagination-cust-orders', 'custOrders');
            }).catch(e => {
                const tbody = document.getElementById('customer-orders-body-new');
                if (tbody) tbody.innerHTML = `<div class="bg-red-50 p-6 text-center rounded-2xl border border-red-200 text-red-600 font-bold text-sm">Terjadi Kesalahan Sinkronisasi.</div>`;
            });
        }

        function confirmOrderReceived(orderId) {
            openConfirmModal(
                "Konfirmasi Diterima",
                "Apakah Anda yakin sudah menerima pesanan #ORD-" + orderId + " dengan lengkap dan baik? Status pesanan akan diubah menjadi Selesai.",
                () => {
                    fetch(`/api/customer/orders/${orderId}/receive`, { method: 'POST' })
                        .then(res => res.json()).then(data => {
                            if (data.success) {
                                renderCustomerDashboard();
                                alert("Terima kasih! Pesanan Anda telah selesai.");
                            } else {
                                alert("Gagal: " + data.message);
                            }
                        });
                }
            );
        }


        function toggleAdminSidebar() { const sidebar = document.getElementById('admin-sidebar'); if (sidebar.classList.contains('w-64')) { sidebar.classList.replace('w-64', 'w-0'); } else { sidebar.classList.replace('w-0', 'w-64'); } }
        function switchAdminTab(tabId) { document.querySelectorAll('.admin-tab-content').forEach(el => { el.classList.remove('active'); el.classList.add('hidden'); }); document.querySelectorAll('.admin-nav-btn').forEach(el => el.classList.remove('active')); const activeEl = document.getElementById(tabId); if(activeEl) { activeEl.classList.add('active'); activeEl.classList.remove('hidden'); } const activeBtn = document.getElementById(`btn-${tabId}`); if(activeBtn) activeBtn.classList.add('active'); if (window.innerWidth < 768) { const sidebar = document.getElementById('admin-sidebar'); if (sidebar && sidebar.classList.contains('w-64')) toggleAdminSidebar(); } if(tabId === 'admin-tab-warehouse') renderAdminWarehouseLayout(); }
        
        // Confirmation Modal Logic
        function openConfirmModal(title, msg, onConfirm) {
            document.getElementById('confirm-modal-title').innerText = title;
            document.getElementById('confirm-modal-message').innerText = msg;
            const btn = document.getElementById('confirm-modal-btn');
            btn.onclick = () => { onConfirm(); closeConfirmModal(); };
            document.getElementById('confirm-modal').classList.add('active');
        }
        function closeConfirmModal() { document.getElementById('confirm-modal').classList.remove('active'); }
        function renderAdminWarehouseLayout() {
            const selectedHub = document.getElementById('admin-layout-hub-select').value;
            if (!globalStocksCache) return;
            const tempUser = currentUser;
            currentUser = { location: selectedHub, role: 'admin' };
            if(!document.getElementById('admin-zone-A-blocks')) {
                document.getElementById('admin-map-injection-target').innerHTML = `
                    <div class="flex min-h-[300px] mb-4 gap-4 items-stretch">
                        <div class="w-1/5 bg-blue-50/80 border-4 border-blue-400 border-dashed rounded-xl p-3 flex flex-col justify-center items-center text-blue-800 relative">
                            <span class="font-black text-sm uppercase tracking-widest text-center leading-tight">Loading Dock<br>(Inbound)</span>
                        </div>
                        <div class="w-1/4 bg-cyan-50 border-2 border-cyan-400 rounded-xl p-3 shadow-md flex flex-col">
                            <div class="text-center mb-3 border-b border-cyan-200 pb-2"><h4 class="font-black text-cyan-900 uppercase text-sm tracking-widest">Zona A (Sejuk)</h4><p class="text-[10px] text-cyan-700 font-bold">Arabika Gayo Specialty</p></div>
                            <div id="admin-zone-A-blocks" class="grid grid-cols-2 gap-2 flex-grow"></div>
                        </div>
                        <div class="w-1/12 bg-green-200/60 border-x-4 border-white flex flex-col items-center justify-center relative"><span class="text-green-700 text-xs -rotate-90 font-black tracking-widest uppercase whitespace-nowrap z-10">Jalur Orang</span></div>
                        <div class="w-1/4 bg-purple-50 border-2 border-purple-400 rounded-xl p-3 shadow-md flex flex-col">
                            <div class="text-center mb-3 border-b border-purple-200 pb-2"><h4 class="font-black text-purple-900 uppercase text-sm tracking-widest">Zona C (Isolasi)</h4><p class="text-[10px] text-purple-700 font-bold">Liberika Jambi Eksotik</p></div>
                            <div id="admin-zone-C-blocks" class="grid grid-cols-2 gap-2 flex-grow"></div>
                        </div>
                        <div class="w-1/5 bg-emerald-50 border-4 border-emerald-400 rounded-xl p-3 flex flex-col justify-center items-center text-emerald-800">
                            <span class="font-black text-sm uppercase tracking-widest text-center leading-tight">Area QC &<br>Packing</span>
                        </div>
                    </div>
                    <div class="h-20 bg-slate-700 rounded flex items-center justify-between px-10 relative border-y-4 border-yellow-400 border-dashed mb-4 shadow-inner">
                        <span class="text-yellow-400 font-black tracking-widest uppercase text-sm flex items-center gap-3">Jalur Forklift</span>
                        <div class="absolute left-[45%] top-0 bottom-0 w-1/12 flex flex-col justify-between py-1 z-10">
                            <div class="w-full h-2 bg-white opacity-80"></div><div class="w-full h-2 bg-white opacity-80"></div><div class="w-full h-2 bg-white opacity-80"></div><div class="w-full h-2 bg-white opacity-80"></div>
                        </div>
                        <span class="text-yellow-400 font-black tracking-widest uppercase text-sm flex items-center gap-3">Outbound</span>
                    </div>
                    <div class="flex min-h-[300px] gap-4 items-stretch">
                        <div class="w-1/5 bg-slate-100 border-4 border-slate-400 rounded-xl p-3 flex flex-col items-center justify-center relative">
                            <span class="font-black text-slate-500 uppercase tracking-widest text-xs text-center">SPV Gudang</span>
                        </div>
                        <div class="w-1/4 bg-orange-50 border-2 border-orange-400 rounded-xl p-3 shadow-md flex flex-col">
                            <div class="text-center mb-3 border-b border-orange-200 pb-2"><h4 class="font-black text-orange-900 uppercase text-sm tracking-widest">Zona B (Kering)</h4><p class="text-[10px] text-orange-700 font-bold">Robusta Dampit Premium</p></div>
                            <div id="admin-zone-B-blocks" class="grid grid-cols-2 gap-2 flex-grow"></div>
                        </div>
                        <div class="w-1/12 bg-green-200/60 border-x-4 border-white flex flex-col items-center justify-center relative"></div>
                        <div class="w-1/4 bg-rose-50 border-2 border-rose-400 rounded-xl p-3 shadow-md flex flex-col">
                            <div class="text-center mb-3 border-b border-rose-200 pb-2"><h4 class="font-black text-rose-900 uppercase text-sm tracking-widest">Zona D (Blending)</h4><p class="text-[10px] text-rose-700 font-bold">Excelsa House Blend</p></div>
                            <div id="admin-zone-D-blocks" class="grid grid-cols-2 gap-2 flex-grow"></div>
                        </div>
                        <div class="w-1/5 bg-amber-100/50 border-4 border-amber-400 border-dotted rounded-xl p-3 flex flex-col justify-center items-center text-amber-800">
                            <span class="font-black text-xs uppercase tracking-widest text-center leading-tight">Pallet Kosong</span>
                        </div>
                    </div>`;
            }
            renderWarehouseLayout(globalStocksCache, 'admin-');
            currentUser = tempUser;
        }

        function renderAdminDashboard(target = 'all', fromPagination = false) {
            if (!fromPagination) {
                if (target === 'all') {
                    globalPagination.adminOrders.current = 1;
                    globalPagination.adminCustomers.current = 1;
                    globalPagination.adminSdm.current = 1;
                } else if (target === 'orders') globalPagination.adminOrders.current = 1;
                else if (target === 'customers') globalPagination.adminCustomers.current = 1;
            }
            const mOrders = document.getElementById('admin-orders-month');
            const mCust = document.getElementById('admin-customers-month');
            const mAn = document.getElementById('admin-analytics-month');
            
            let mVal = '';
            if (target === 'orders' && mOrders) mVal = mOrders.value;
            else if (target === 'customers' && mCust) mVal = mCust.value;
            else if (target === 'analytics' && mAn) mVal = mAn.value;
            else if (target === 'all') mVal = (mOrders && mOrders.value) ? mOrders.value : '';
            
            const query = mVal ? '?month=' + mVal : '';
            
            fetch('/api/admin/data' + query).then(res => res.json()).then(data => {
                if (data.error) return;
                
                // 1. DATA MASTER & TAB ORDER
                if (target === 'all' || target === 'orders') {
                    globalOrdersCache = data.orders; globalStocksCache = data.stocks;
                    
                    const alertsContainer = document.getElementById('admin-alerts-container'); 
                    let alertsHTML = '';
                    
                    Object.keys(data.stocks).forEach(loc => { 
                        Object.keys(data.stocks[loc]).forEach(prod => { 
                            const stockVal = Math.round(data.stocks[loc][prod].stock);
                            const demandVal = Math.round(data.stocks[loc][prod].last_month_demand || data.stocks[loc][prod].demand || 0);
                            
                            // Trigger alert if stock is less than 50% of demand
                            if (stockVal < (demandVal * 0.5)) { 
                                alertsHTML += `
                                <div class="bg-red-50 border-2 border-red-200 p-4 rounded-3xl mb-3 animate-pulse">
                                    <div class="flex items-center gap-4">
                                        <div class="bg-red-500 text-white p-2 rounded-xl">⚠️</div>
                                        <div>
                                            <p class="font-black text-xs uppercase tracking-tight text-red-800">Stok Kritis: ${prod}</p>
                                            <p class="text-[10px] font-bold text-red-600 opacity-80 uppercase tracking-widest">Hub ${loc} &bull; Sisa ${stockVal}kg (Target Min: ${demandVal}kg)</p>
                                        </div>
                                    </div>
                                </div>`;
                            }
                        }); 
                    });
                    if (alertsContainer) alertsContainer.innerHTML = alertsHTML;

                    const approvalOrders = data.orders.filter(o => o.status === 'Minta Persetujuan/Approval Pengiriman');
                    const unassignedOrders = data.orders.filter(o => o.status === 'Menunggu Alokasi' || o.warehouse === null);

                    const approvalList = document.getElementById('admin-approval-list');
                    if (approvalList) {
                        if (approvalOrders.length === 0) approvalList.innerHTML = `<div class="p-10 text-center text-coffee-300 font-black uppercase tracking-widest text-xs">Tidak ada permintaan persetujuan.</div>`;
                        else approvalList.innerHTML = approvalOrders.map(o => {
                            const itemsList = o.items.map(i => `<div class="font-black text-coffee-900 text-sm">${i.product} <span class="text-accent-gold bg-coffee-950 px-2 py-0.5 rounded-lg text-[10px] ml-1">${Math.round(i.qty)} Kg</span></div>`).join('');
                            return `<div class="bg-coffee-50 p-5 rounded-[2rem] border border-coffee-100 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:shadow-md transition"><div><div class="font-mono text-[10px] font-black text-coffee-400 mb-2 uppercase tracking-widest border-b border-coffee-100 pb-1 inline-block">#ORD-${o.id} &bull; Hub ${o.warehouse}</div><div class="space-y-1">${itemsList}</div></div><button onclick="openAwbModal([${o.id}], false)" class="bg-coffee-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg transition transform hover:-translate-y-0.5 w-full md:w-auto">Setujui & Input Resi</button></div>`
                        }).join('');
                    }

                    const unassignedList = document.getElementById('admin-unassigned-list');
                    if (unassignedList) {
                        if (unassignedOrders.length === 0) unassignedList.innerHTML = `<div class="p-10 text-center text-coffee-300 font-black uppercase tracking-widest text-xs">Semua pesanan baru sudah dialokasikan.</div>`;
                        else unassignedList.innerHTML = unassignedOrders.map(o => {
                            const isBekasiOk = o.items.every(i => data.stocks['Bekasi'][i.product].stock >= i.qty); const isJakutOk = o.items.every(i => data.stocks['Jakarta Utara'][i.product].stock >= i.qty); const isCikarangOk = o.items.every(i => data.stocks['Cikarang'][i.product].stock >= i.qty);
                            const isAnyAvailable = isBekasiOk || isJakutOk || isCikarangOk;
                            const itemsList = o.items.map(i => `<div class="font-black text-coffee-900 text-sm">${i.product} <span class="text-white bg-coffee-400 px-2 py-0.5 rounded-lg text-[10px] ml-1">${Math.round(i.qty)} Kg</span></div>`).join('');
                            return `<div class="bg-white p-5 rounded-[2rem] border border-coffee-100 flex flex-col lg:flex-row justify-between lg:items-center gap-4 hover:border-accent-gold/30 transition shadow-sm"><div class="flex flex-col"><div class="flex items-center gap-2 mb-2 border-b border-coffee-50 pb-2"><span class="font-mono text-[10px] font-black bg-coffee-50 border border-coffee-100 text-coffee-600 px-2 py-1 rounded-lg">#ORD-${o.id}</span><span class="text-[11px] text-coffee-400 font-black uppercase tracking-tight">${o.customer_name}</span></div><div class="text-[10px] text-coffee-300 font-bold mb-2 uppercase tracking-wide">📍 ${o.customer_address || '-'}</div><div class="space-y-1.5">${itemsList}</div></div><div class="w-full lg:w-auto flex flex-col sm:flex-row gap-2 items-center mt-2 lg:mt-0 pt-2 lg:pt-0">${isAnyAvailable ? `<select id="assign-wh-${o.id}" class="border-2 border-coffee-100 p-3 rounded-2xl text-[11px] font-black uppercase tracking-wider focus:outline-none focus:border-accent-gold w-full sm:w-64 bg-coffee-50/50"><option value="" disabled selected>-- Hub Stok --</option><option value="Bekasi" ${!isBekasiOk ? 'disabled' : ''}>Bekasi ${!isBekasiOk ? '❌' : '✅'}</option><option value="Jakarta Utara" ${!isJakutOk ? 'disabled' : ''}>Jakut ${!isJakutOk ? '❌' : '✅'}</option><option value="Cikarang" ${!isCikarangOk ? 'disabled' : ''}>Cikarang ${!isCikarangOk ? '❌' : '✅'}</option></select><button onclick="assignWarehouse(${o.id})" class="bg-accent-gold text-coffee-950 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-xl transition transform hover:-translate-y-1 shadow-lg shadow-accent-gold/10 w-full sm:w-auto">Alokasikan</button>` : `<div class="text-red-600 font-black text-[10px] uppercase tracking-widest bg-red-50 px-6 py-4 rounded-2xl border border-red-100 w-full text-center">Stok Tidak Cukup!</div>`}</div></div>`
                        }).join('');
                    }

                    const stockGrid = document.getElementById('admin-stock-grid');
                    if (stockGrid) stockGrid.innerHTML = PRODUCT_LIST.map(prod => {
                        const bVal = Math.round(data.stocks['Bekasi'][prod].stock || 0); const jVal = Math.round(data.stocks['Jakarta Utara'][prod].stock || 0); const cVal = Math.round(data.stocks['Cikarang'][prod].stock || 0);
                        const drawBar = (val) => `<div class="w-full bg-coffee-100 rounded-full h-2 mt-2 overflow-hidden shadow-inner"><div class="${val < 50 ? 'bg-red-500' : 'bg-coffee-600'} h-full rounded-full transition-all duration-1000 ease-out" style="width:${Math.min(100, (val / 1600) * 100)}%"></div></div>`;
                        return `<div class="bg-white p-6 rounded-[2rem] shadow-sm border border-coffee-100 hover:shadow-md transition"><h4 class="font-black text-coffee-950 text-sm mb-4 line-clamp-1 border-b border-coffee-50 pb-2 uppercase tracking-tight">${prod}</h4><div class="space-y-4"><div><div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span class="text-coffee-300">Bekasi</span><span class="${bVal < 50 ? 'text-red-600 font-black' : 'text-coffee-900'}">${bVal} Kg</span></div>${drawBar(bVal)}</div><div><div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span class="text-coffee-300">Jakut</span><span class="${jVal < 50 ? 'text-red-600 font-black' : 'text-coffee-900'}">${jVal} Kg</span></div>${drawBar(jVal)}</div><div><div class="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span class="text-coffee-300">Cikarang</span><span class="${cVal < 50 ? 'text-red-600 font-black' : 'text-coffee-900'}">${cVal} Kg</span></div>${drawBar(cVal)}</div></div></div>`
                    }).join('');

                    const allOrdersGrid = document.getElementById('admin-all-orders-grid');
                    if (allOrdersGrid) {
                        const pg = globalPagination.adminOrders;
                        const start = (pg.current - 1) * pg.size;
                        const end = start + pg.size;
                        const paginatedOrders = data.orders.slice(start, end);

                        allOrdersGrid.innerHTML = paginatedOrders.map(o => {
                            const itemsList = o.items.map(i => `<div class="font-black text-coffee-900 line-clamp-1 text-[11px] uppercase tracking-tight">${i.product} <span class="text-coffee-400 text-[10px] ml-1">(${Math.round(i.qty)} Kg)</span></div>`).join('');
                            return `<div class="bg-white p-6 rounded-[2.5rem] shadow-sm border border-coffee-100 hover:shadow-xl transition-all duration-300 flex flex-col border-b-4 border-b-coffee-200"><div class="flex justify-between items-center mb-4"><span class="font-mono text-[10px] font-black bg-coffee-50 px-2 py-1 rounded-lg border border-coffee-100 text-coffee-600">#ORD-${o.id}</span><span class="text-[10px] font-black text-coffee-300 uppercase tracking-widest">${o.date}</span></div><div class="mb-3"><span class="text-[9px] font-black text-coffee-400 uppercase tracking-[0.2em] mb-1 block">Pelanggan</span><p class="font-black text-coffee-950 text-sm tracking-tight leading-none">${o.customer_name}</p></div><div class="space-y-1.5 mb-4 border-b border-coffee-50 pb-4 flex-grow">${itemsList}</div><div class="mt-auto"><div class="text-[10px] font-black text-coffee-400 mb-3 uppercase tracking-widest">Hub: <b class="text-coffee-900">${o.warehouse || 'N/A'}</b></div><div class="pt-2 w-full text-right block">${getStatusBadge(o.status, o.warehouse)}</div></div></div>`
                        }).join('');

                        renderPagination(data.orders.length, pg.size, pg.current, 'pagination-admin-orders', 'adminOrders');
                    }
                }

                // 2. TAB DATABASE PELANGGAN
                if (target === 'all' || target === 'customers') {
                    if (data.customers) {
                        const custBody = document.getElementById('admin-customers-body');
                        if (custBody) {
                            const pg = globalPagination.adminCustomers;
                            const start = (pg.current - 1) * pg.size;
                            const end = start + pg.size;
                            const paginatedCust = data.customers.slice(start, end);

                            custBody.innerHTML = paginatedCust.map(c => {
                                const ordersCount = data.orders.filter(o => o.customer_name === c.name || o.customer_name === c.username).length;
                                return `<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="p-4 font-bold text-slate-800 flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center font-bold text-slate-600">${c.name.charAt(0).toUpperCase()}</div>${c.name}</td><td class="p-4"><p class="text-sm font-bold text-slate-700">${c.username}</p><p class="text-xs text-slate-500">${c.phone || '-'}</p></td><td class="p-4 text-xs text-slate-500 line-clamp-1">${c.address || '-'}</td><td class="p-4 font-bold text-purple-600 bg-purple-50/50 text-right">${ordersCount} Pembelian</td></tr>`;
                            }).join('') || `<tr><td colspan="4" class="p-6 text-center text-slate-400">Tidak ada data pelanggan untuk periode ini.</td></tr>`;

                            renderPagination(data.customers.length, pg.size, pg.current, 'pagination-admin-customers', 'adminCustomers');
                        }
                    }
                }

                // 3. TAB ANALYTICS & GLOBAL SDM
                if (target === 'all' || target === 'analytics') {
                    if (data.employees) sdmDataArray = data.employees;
                    
                    let totalIncome = 0; let itemsSold = {};
                    PRODUCT_LIST.forEach(p => itemsSold[p] = 0);
                    data.orders.forEach(o => { o.items.forEach(i => { let price = PRODUCT_PRICES[i.product] || 0; totalIncome += price * i.qty; if(itemsSold[i.product] !== undefined) itemsSold[i.product] += i.qty; }); });

                    const totalCustCount = data.customers ? data.customers.length : 0;
                    const anSummary = document.getElementById('admin-analytics-summary');
                    if (anSummary) anSummary.innerHTML = `
                        <div class="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-center gap-4"><div class="bg-blue-500 text-white p-3 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Revenue</p><p class="text-xl font-black text-slate-800">Rp ${totalIncome.toLocaleString('id-ID')}.000</p></div></div>
                        <div class="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center gap-4"><div class="bg-emerald-500 text-white p-3 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg></div><div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Order</p><p class="text-xl font-black text-slate-800">${data.orders.length} Batch</p></div></div>
                        <div class="bg-purple-50 border border-purple-200 p-5 rounded-2xl flex items-center gap-4"><div class="bg-purple-500 text-white p-3 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></div><div><p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Jumlah Pelanggan</p><p class="text-xl font-black text-slate-800">${totalCustCount} Orang</p></div></div>`;

                    const ctxTrend = document.getElementById('admin-trend-chart');
                    const ctxComp = document.getElementById('admin-composition-chart');
                    if (ctxTrend && ctxComp) {
                        if (adminTrendChart) adminTrendChart.destroy();
                        if (adminCompositionChart) adminCompositionChart.destroy();
                        const compData = PRODUCT_LIST.map(p => itemsSold[p]);
                        adminCompositionChart = new Chart(ctxComp, { type: 'doughnut', data: { labels: PRODUCT_LIST, datasets: [{ data: compData, backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: "sans-serif", size: 10, weight: 'bold' }, padding: 15 } } }, cutout: '70%' } });
                        const weeks = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4/5']; let weeklyTrendData = [0, 0, 0, 0];
                        data.orders.forEach(o => { const d = new Date(o.date); if (!isNaN(d)) { const day = d.getDate(); const orderQty = o.items.reduce((sum, item) => sum + item.qty, 0); if (day <= 7) weeklyTrendData[0] += orderQty; else if (day <= 14) weeklyTrendData[1] += orderQty; else if (day <= 21) weeklyTrendData[2] += orderQty; else weeklyTrendData[3] += orderQty; } });
                        adminTrendChart = new Chart(ctxTrend, { type: 'line', data: { labels: weeks, datasets: [{ label: 'Volume (Kg)', data: weeklyTrendData, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#8b5cf6', pointBorderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.y + ' Kg' } } }, scales: { y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' } }, x: { grid: { display: false } } } } });
                    }
                }
                
                // DATA SDM GLOBAL (SLIP IN HERE)
                if (target === 'all') {
                    const pg = globalPagination.adminSdm;
                    const start = (pg.current - 1) * pg.size;
                    const end = start + pg.size;
                    const paginatedSdm = data.employees.slice(start, end);

                    const empHtml = paginatedSdm.map(e => {
                        const statusH = e.status === 'Aktif' ? '<span class="text-emerald-600 font-bold text-xs"><span class="w-2 h-2 inline-block rounded-full bg-emerald-500 animate-pulse mr-1"></span>Aktif</span>' : '<span class="text-slate-400 font-bold text-xs">Off-Shift</span>';
                        return `<tr class="border-b border-slate-100"><td class="p-4 font-bold text-slate-800 flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-slate-200 flex justify-center items-center font-bold text-slate-600">${e.name.charAt(0).toUpperCase()}</div>${e.name}</td><td class="p-4 text-sm font-bold text-slate-700">${e.warehouse_location}</td><td class="p-4 text-xs font-bold text-purple-600">${e.role}</td><td class="p-4">${statusH}</td><td class="p-4 text-xs font-bold text-slate-500">${e.phone || '-'}</td><td class="p-4 text-center"><button onclick="openSdmModal(${e.id})" class="text-blue-600 font-bold text-xs mr-3">Edit</button></td></tr>`;
                    }).join('');
                    const sdmBody = document.getElementById('admin-global-sdm-body');
                    if (sdmBody) {
                        sdmBody.innerHTML = empHtml || `<tr><td colspan="6" class="p-6 text-center text-slate-400">Belum ada data sdm.</td></tr>`;
                        renderPagination(data.employees.length, pg.size, pg.current, 'pagination-admin-sdm', 'adminSdm');
                    }
                }
            });
        }

        function assignWarehouse(orderId) {
            const wh = document.getElementById(`assign-wh-${orderId}`).value;
            if (!wh) return;
            fetch('/api/admin/assign', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, warehouse: wh })
            }).then(res => res.json()).then(data => {
                if (data.success) renderAdminDashboard();
            });
        }

        // ==============================
        // WAREHOUSE LOGIC (WMS)
        // ==============================
        function loadSdmDataAndWarehouse() {
            // Ambil SDM dulu agar kita tahu dia Operator Inbound atau Packing
            fetch('/api/warehouse/sdm').then(res => res.json()).then(data => {
                if (!data.error) {
                    sdmDataArray = data;
                    if (currentUser.role === 'wh_supervisor') renderSdmTable();
                }
                applyRoleAccess(); // Eksekusi setelah SDM terisi!
                loadWarehouseData();
            }).catch(e => {
                applyRoleAccess();
                loadWarehouseData();
            });
        }

        function loadWarehouseData(target = 'all', fromPagination = false) {
            const mInbound = document.getElementById('wh-inbound-month');
            const mPicking = document.getElementById('wh-picking-month');
            
            // Inisialisasi mVal berdasarkan target yang ingin diupdate
            let mVal = '';
            if (target === 'picking' && mPicking) {
                mVal = mPicking.value;
                if (!fromPagination) globalPagination.whOrders.current = 1;
            } else if (target === 'inbound' && mInbound) {
                mVal = mInbound.value;
                if (!fromPagination) globalPagination.whInbound.current = 1;
            } else if (target === 'all') {
                mVal = (mPicking && mPicking.value) ? mPicking.value : '';
            }
            
            const query = mVal ? '?month=' + mVal : '';
            
            fetch('/api/admin/data' + query).then(res => res.json()).then(data => {
                if (data.error) return;
                
                // Update Cache dan UI secara selektif jika ada target
                if (target === 'all' || target === 'stocks') {
                    globalStocksCache = data.stocks;
                    renderWarehouseLayout(data.stocks); 
                    renderWarehouseStock(data.stocks);
                    if (currentUser.role === 'wh_supervisor') renderStockOpname(data.stocks);
                }
                
                if (target === 'all' || target === 'picking') {
                    globalOrdersCache = data.orders;
                    renderWarehousePickingList(data.orders);
                }
                
                if (target === 'all' || target === 'inbound') {
                    if (data.inbound_tasks) {
                        globalInboundTasksCache = data.inbound_tasks;
                        renderInboundTasks();
                    }
                }
            });
        }

        function toggleAllOrders(checkbox) { document.querySelectorAll('.order-batch-cb').forEach(cb => cb.checked = checkbox.checked); }

        function executeBatchUpdate() {
            const checkboxes = document.querySelectorAll('.order-batch-cb:checked');
            if (checkboxes.length === 0) return alert("Pilih minimal 1 pesanan!");
            const newStatus = document.getElementById('batch-status-select').value;
            if (!newStatus) return alert("Pilih status tujuan!");
            const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

            if (newStatus === 'Serahkan ke Jasa Kirim') openAwbModal(selectedIds, true);
            else {
                fetch('/api/warehouse/batch_update', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_ids: selectedIds, status: newStatus })
                }).then(res => res.json()).then(data => {
                    if (data.success) { document.getElementById('check-all-orders').checked = false; document.getElementById('batch-status-select').value = ""; loadWarehouseData(); }
                });
            }
        }

        function renderWarehousePickingList(allOrdersData) {
            const grid = document.getElementById('warehouse-orders-grid');
            const empty = document.getElementById('empty-warehouse-state');
            if (!grid || !empty) return;

            let myOrders = allOrdersData.filter(o => o.warehouse === currentUser.location && o.status !== 'Menunggu Alokasi');

            // OPERATOR: Sembunyikan orderan orang lain!
            if (currentUser.role === 'wh_operator') {
                myOrders = myOrders.filter(o => o.assigned_operator === currentUser.name);
            }

            if (myOrders.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }

            empty.classList.add('hidden');
            grid.innerHTML = "";
            let pg = globalPagination.whOrders;
            const start = (pg.current - 1) * pg.size;
            const end = start + pg.size;
            const paginatedOrders = myOrders.slice(start, end);

            grid.innerHTML = paginatedOrders.map(o => {
                const isError = o.status === 'Perbaiki Kemasan'; 
                const isDone = o.status === 'Serahkan ke Jasa Kirim'; 
                const isWait = o.status === 'Minta Persetujuan/Approval Pengiriman'; 
                const isAppr = o.status === 'Disetujui Admin (Siap Kirim)';

                const itemsList = o.items.map(i => {
                    const stockData = globalStocksCache ? globalStocksCache[currentUser.location][i.product] : null;
                    const prefix = stockData ? stockData.rack : '-';
                    
                    // FIFO Instruction: Show oldest batch date
                    let fifoInfo = '';
                    if (stockData && stockData.batches && stockData.batches.length > 0) {
                        const oldestBatch = stockData.batches[0];
                        fifoInfo = `
                        <div class="mt-3 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2 animate-pulse">
                            <div class="bg-amber-500 text-white p-1 rounded-lg"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                            <span class="text-[9px] font-black text-amber-700 uppercase tracking-widest">FIFO: Batch ${oldestBatch.date}</span>
                        </div>`;
                    }

                    const requiredBlocks = Math.ceil(i.qty / WMS_CONFIG.CAPACITY_PER_BLOCK);
                    let blockNames = []; for (let b = 1; b <= requiredBlocks; b++) blockNames.push(`${prefix}-${b}`);
                    
                    return `
                    <div class="bg-coffee-50/50 border border-coffee-100/50 p-5 rounded-[2rem] mb-4 last:mb-0">
                        <div class="flex justify-between items-center mb-3">
                            <div>
                                <p class="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1">Produk</p>
                                <p class="font-black text-coffee-950 text-sm">${i.product}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1">Kuantitas</p>
                                <p class="font-black text-xl text-coffee-950">${Math.round(i.qty)} <span class="text-[10px] text-coffee-300">KG</span></p>
                            </div>
                        </div>
                        <div class="bg-white border border-coffee-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
                            <span class="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Peta Rak:</span>
                            <span class="font-mono text-xs font-black text-coffee-900 bg-coffee-100/50 px-2 py-1 rounded-lg">Blok ${blockNames.join(', ')}</span>
                        </div>
                        ${fifoInfo}
                    </div>`;
                }).join('');

                let cardStyle = "bg-white border-coffee-100 shadow-sm hover:shadow-2xl hover:border-accent-gold/20";
                if (isError) cardStyle = "bg-red-50 border-red-200 shadow-lg animate-bounce-subtle"; 
                else if (isDone) cardStyle = "bg-coffee-50/30 border-coffee-100 opacity-60";

                let assignHTML = ''; let act = '';

                if (currentUser.role === 'wh_supervisor') {
                    let opOptions = `<option value="">-- Belum Ditugaskan --</option>`;
                    let operators = sdmDataArray.filter(s => s.role === 'Operator Picking' || s.role === 'Operator Packing');
                    operators.forEach(op => {
                        let sel = (o.assigned_operator === op.name) ? 'selected' : '';
                        opOptions += `<option value="${op.name}" ${sel}>${op.name}</option>`;
                    });

                    if (!isDone) assignHTML = `
                    <div class="mb-5 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                        <label class="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-2">Tugaskan Operator</label>
                        <select onchange="assignTaskWh(${o.id}, this)" class="w-full border-2 border-blue-200 text-blue-800 bg-white p-3 rounded-xl text-xs font-black outline-none focus:border-blue-500 shadow-sm">${opOptions}</select>
                    </div>`;

                    let statusText = o.status;
                    if (isError) statusText = "⚠️ Gagal QC"; else if (isWait) statusText = "⏳ Menunggu Admin"; else if (isAppr) statusText = "✅ Siap Kirim"; else if (isDone) statusText = "🎉 Selesai";
                    act = `<div class="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-1.5 px-1">Status Operasional</div><div class="bg-coffee-50 border border-coffee-100 p-3 rounded-xl text-xs font-black text-coffee-700 text-center cursor-not-allowed opacity-80 uppercase tracking-widest">${statusText}</div>`;

                } else if (currentUser.role === 'wh_operator') {
                    let opName = o.assigned_operator || "Belum ada tugas";
                    assignHTML = `
                    <div class="mb-5 bg-coffee-50 p-4 rounded-2xl border border-coffee-100">
                        <span class="text-[9px] font-black text-coffee-300 uppercase tracking-widest block mb-1">Ditugaskan Kepada</span>
                        <span class="font-black text-sm text-coffee-950 uppercase tracking-tight">${opName}</span>
                    </div>`;

                    if (o.assigned_operator === currentUser.name) {
                        if (isWait) act = `<div class="bg-amber-50 text-amber-700 p-4 rounded-2xl text-[10px] font-black text-center animate-pulse border border-amber-100 uppercase tracking-widest">⏳ Tunggu Konfirmasi Admin</div>`;
                        else if (isAppr) act = `
                            <div class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 px-1">Update Status</div>
                            <button onclick="updateOrderStatusWh(${o.id}, {value: 'Serahkan ke Jasa Kirim'})" class="w-full bg-emerald-600 text-white p-4 rounded-2xl text-[10px] font-black hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 uppercase tracking-[0.2em]">🚀 Serahkan Kurir</button>`;
                        else if (isDone) act = `<div class="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-[10px] font-black text-center border border-emerald-100 uppercase tracking-widest">📦 Selesai & Terkirim</div>`;
                        else act = `
                            <div class="text-[10px] font-black text-coffee-400 uppercase tracking-widest mb-2 px-1">Update Progres</div>
                            <select onchange="updateOrderStatusWh(${o.id}, this)" class="w-full border-2 ${isError ? 'border-red-400 text-red-700 bg-red-50' : 'border-coffee-200 text-coffee-950 bg-white'} p-3 rounded-2xl text-[10px] font-black outline-none shadow-sm uppercase tracking-wider">
                                <option value="Menunggu Diproses" ${o.status === 'Menunggu Diproses' ? 'selected' : ''}>📋 Antre Picking</option>
                                <option value="Ambil Barang" ${o.status === 'Ambil Barang' ? 'selected' : ''}>🏃‍♂️ Ambil Barang</option>
                                <option value="Packing" ${o.status === 'Packing' ? 'selected' : ''}>📦 Packing</option>
                                <option value="QC" ${o.status === 'QC' ? 'selected' : ''}>🔍 QC</option>
                                <option value="Perbaiki Kemasan" ${isError ? 'selected' : ''}>⚠️ Gagal QC</option>
                                <option value="Minta Persetujuan/Approval Pengiriman">✅ Minta Approval</option>
                            </select>`;
                    } else {
                        act = `<div class="bg-red-50 text-red-600 text-[10px] p-4 rounded-2xl text-center font-black border border-red-100 uppercase tracking-widest">❌ Bukan Tugas Anda</div>`;
                    }
                }

                let checkboxHTML = (isDone || currentUser.role !== 'wh_supervisor') ? '' : `<input type="checkbox" class="order-batch-cb w-6 h-6 rounded-lg cursor-pointer border-coffee-200 text-coffee-900 focus:ring-coffee-900" value="${o.id}">`;
                let printBtn = '';
                if (o.status === 'Packing' || o.status === 'QC' || isAppr || isDone) {
                    printBtn = `<button onclick="openShippingLabel(${o.id})" class="text-[10px] font-black bg-coffee-950 text-white px-4 py-2 rounded-xl hover:bg-black transition flex items-center gap-2 shadow-lg shadow-coffee-200 uppercase tracking-widest"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Label</button>`;
                }

                return `
                <div class="rounded-[3rem] border-2 transition-all duration-500 overflow-hidden flex flex-col ${cardStyle}">
                    <div class="p-8 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-6">
                            <div class="flex items-center gap-4">
                                ${checkboxHTML}
                                <div>
                                    <span class="font-mono text-sm font-black text-coffee-950 bg-coffee-50 px-3 py-1 rounded-xl border border-coffee-100 uppercase">#ORD-${o.id}</span>
                                    <p class="text-[10px] font-black text-coffee-300 mt-1.5 uppercase tracking-widest">${o.date}</p>
                                </div>
                            </div>
                            ${printBtn}
                        </div>
                        ${assignHTML}
                        <div class="space-y-4 mb-8 flex-grow">
                            <div class="text-[10px] font-black text-coffee-300 uppercase tracking-[0.2em] mb-4 border-b border-coffee-50 pb-2">Daftar Picking (WMS)</div>
                            ${itemsList}
                        </div>
                        <div class="mb-8">${getProgressTrackerHTML(o.status)}</div>
                        <div class="mt-auto">${act}</div>
                    </div>
                </div>`;
            }).join('');

            renderPagination(myOrders.length, pg.size, pg.current, 'pagination-wh-orders', 'whOrders');
        }

        function assignTaskWh(orderId, selectEl) {
            const opName = selectEl.value;
            fetch('/api/warehouse/assign_task', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, operator_name: opName })
            }).then(res => res.json()).then(data => {
                if (!data.success) alert("Gagal menugaskan operator.");
            });
        }

        function updateOrderStatusWh(orderId, selectEl) {
            fetch('/api/warehouse/update_status', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, status: selectEl.value })
            }).then(res => res.json()).then(data => { if (data.success) loadWarehouseData(); });
        }

        function renderStockOpname(dbStocks) {
            const tbody = document.getElementById('opname-table-body');
            if (!tbody || !currentUser || currentUser.role !== 'wh_supervisor') return;
            tbody.innerHTML = PRODUCT_LIST.map(prod => {
                const stockVal = Math.round(dbStocks[currentUser.location][prod].stock); 
                const rackPrefix = dbStocks[currentUser.location][prod].rack; 
                const safeId = prod.replace(/\s+/g, '-');
                return `
                <tr class="border-b border-coffee-50 hover:bg-coffee-50/50 transition-colors group">
                    <td class="p-6">
                        <div class="font-black text-coffee-950 uppercase tracking-tight">${prod}</div>
                        <div class="text-[10px] text-accent-gold font-black mt-2 border border-coffee-100 bg-coffee-50 inline-block px-3 py-1 rounded-xl uppercase tracking-widest">ZONA ${rackPrefix}</div>
                    </td>
                    <td class="p-6">
                        <div class="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">Stok Sistem</div>
                        <div class="font-black text-xl text-coffee-950">${stockVal} <span class="text-xs text-coffee-300">Kg</span></div>
                    </td>
                    <td class="p-6">
                        <div class="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">Fisik Aktual</div>
                        <input type="number" id="opname-actual-${safeId}" class="w-28 border-2 border-coffee-100 p-3 rounded-2xl focus:ring-4 focus:ring-coffee-100 focus:border-coffee-300 font-black text-coffee-950 outline-none transition" placeholder="${stockVal}">
                    </td>
                    <td class="p-6">
                        <div class="text-[10px] font-black text-coffee-300 uppercase tracking-widest mb-1">Keterangan</div>
                        <input type="text" id="opname-reason-${safeId}" class="w-full border-2 border-coffee-100 p-3 rounded-2xl focus:ring-4 focus:ring-coffee-100 focus:border-coffee-300 text-sm font-bold text-coffee-950 outline-none transition" placeholder="Contoh: Selisih Timbangan">
                    </td>
                    <td class="p-6 text-center">
                        <button onclick="submitOpname('${prod}')" class="bg-coffee-950 text-white px-6 py-3 rounded-2xl text-[10px] font-black hover:bg-black shadow-lg shadow-coffee-100 transition active:scale-95 uppercase tracking-widest">Update</button>
                    </td>
                </tr>`;
            }).join('');
        }

        function submitOpname(product) {
            const safeId = product.replace(/\s+/g, '-');
            const actualQty = document.getElementById(`opname-actual-${safeId}`).value;
            const reason = document.getElementById(`opname-reason-${safeId}`).value;
            if (!actualQty || actualQty < 0) return alert("Masukkan fisik stok aktual!");
            if (!reason) return alert("Alasan penyesuaian wajib diisi!");
            if (confirm(`Yakin mengubah stok ${product} menjadi ${actualQty} Kg?`)) {
                fetch('/api/warehouse/opname', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product: product, actual_qty: actualQty, reason: reason })
                }).then(res => res.json()).then(data => { if (data.success) { alert("Berhasil!"); loadWarehouseData(); } });
            }
        }

        // FITUR BARU: MENGGAMBAR PETA 2D SECARA EKSPLISIT (ANTI-BLANK)
        function renderWarehouseLayout(dbStocks, prefix = '') {
            if (!currentUser) return; 

            const colorMap = {
                'A': { empty: 'border-coffee-100 text-coffee-300 bg-coffee-50/20', fill: 'border-coffee-200 text-coffee-950 bg-white', full: 'bg-coffee-900 border-coffee-950 text-white shadow-2xl', bar: 'bg-coffee-100 opacity-30' },
                'B': { empty: 'border-amber-100 text-amber-300 bg-amber-50/20', fill: 'border-amber-200 text-amber-950 bg-white', full: 'bg-amber-800 border-amber-900 text-white shadow-2xl', bar: 'bg-amber-100 opacity-30' },
                'C': { empty: 'border-stone-100 text-stone-300 bg-stone-50/20', fill: 'border-stone-200 text-stone-950 bg-white', full: 'bg-stone-800 border-stone-900 text-white shadow-2xl', bar: 'bg-stone-100 opacity-30' },
                'D': { empty: 'border-orange-100 text-orange-300 bg-orange-50/20', fill: 'border-orange-200 text-orange-950 bg-white', full: 'bg-orange-800 border-orange-900 text-white shadow-2xl', bar: 'bg-orange-100 opacity-30' }
            };

            const mapConfig = {
                'Arabika Gayo Specialty': { id: prefix + 'zone-A-blocks', rack: 'A' },
                'Robusta Dampit Premium': { id: prefix + 'zone-B-blocks', rack: 'B' },
                'Liberika Jambi Eksotik': { id: prefix + 'zone-C-blocks', rack: 'C' },
                'Excelsa House Blend': { id: prefix + 'zone-D-blocks', rack: 'D' }
            };

            PRODUCT_LIST.forEach(prod => {
                const config = mapConfig[prod]; if (!config) return;
                const targetContainer = document.getElementById(config.id); if (!targetContainer) return;

                const stockData = dbStocks[currentUser.location]?.[prod];
                const stockVal = stockData ? stockData.stock : 0;
                let blocksHTML = '';

                for (let i = 1; i <= WMS_CONFIG.BLOCKS_PER_ZONE; i++) {
                    const blockName = `${config.rack}-${i}`;
                    let stockInThisBlock = stockVal - ((i - 1) * WMS_CONFIG.CAPACITY_PER_BLOCK);
                    if (stockInThisBlock < 0) stockInThisBlock = 0;
                    if (stockInThisBlock > WMS_CONFIG.CAPACITY_PER_BLOCK) stockInThisBlock = WMS_CONFIG.CAPACITY_PER_BLOCK;

                    const isFilled = stockInThisBlock > 0;
                    const isFull = stockInThisBlock === WMS_CONFIG.CAPACITY_PER_BLOCK;
                    const currentStacks = Math.ceil(stockInThisBlock / 50);

                    let baseClass = 'border-2 border-dashed flex flex-col items-center justify-center rounded-[1.5rem] overflow-hidden relative transition-all duration-500 hover:scale-105 p-3 group';
                    let fillClass = colorMap[config.rack].empty;

                    if (isFull) { fillClass = colorMap[config.rack].full; baseClass = baseClass.replace('border-dashed', 'border-solid'); }
                    else if (isFilled) { fillClass = colorMap[config.rack].fill; baseClass = baseClass.replace('border-dashed', 'border-solid'); }

                    const fillPercentage = (stockInThisBlock / WMS_CONFIG.CAPACITY_PER_BLOCK) * 100;
                    const barHTML = (isFilled && !isFull) ? `<div class="absolute bottom-0 left-0 w-full ${colorMap[config.rack].bar} transition-all duration-1000" style="height: ${fillPercentage}%"></div>` : '';

                    let stacksObj = '';
                    for (let s = 1; s <= 8; s++) {
                        let op = s <= currentStacks ? 'opacity-100 bg-accent-gold shadow-[0_0_10px_rgba(212,163,115,0.3)]' : 'opacity-10 bg-coffee-200';
                        stacksObj += `<div class="w-full h-1 ${op} rounded-full mt-1 flex-shrink-0 transition-all duration-500 delay-${s*100}"></div>`;
                    }

                    blocksHTML += `
                    <div class="${baseClass} ${fillClass} min-h-[110px] relative">
                        ${barHTML}
                        <div class="z-10 w-full flex flex-col justify-between h-full text-center">
                            <div>
                                <span class="text-[10px] font-black uppercase tracking-widest opacity-80">${blockName}</span>
                                <div class="text-[9px] font-bold mt-1 opacity-60">${Math.round(stockInThisBlock)} Kg</div>
                            </div>
                            <div class="w-2/3 mx-auto mt-3 flex flex-col-reverse justify-end pb-1 h-14">
                                ${stacksObj}
                            </div>
                        </div>
                    </div>`;
                }
                targetContainer.innerHTML = blocksHTML;
            });
        }

        function renderWarehouseStock(dbStocks) {
            const container = document.getElementById('warehouse-stock-management-grid');
            if (!container || !currentUser || !currentUser.role.includes('wh_')) return;
            
            let accentColor = "text-accent-gold";
            let btnClass = "bg-coffee-950 hover:bg-black text-white";
            
            const canInbound = currentUser.role === 'wh_supervisor' || (currentUser.job_role && currentUser.job_role.includes('Inbound'));

            container.innerHTML = PRODUCT_LIST.map(prod => {
                const stockData = dbStocks[currentUser.location][prod]; 
                const stockVal = Math.round(stockData ? stockData.stock : 0); 
                const safeId = prod.replace(/\s+/g, '-');
                
                // Render FIFO Batches List
                let batchHtml = '';
                if (stockData && stockData.batches && stockData.batches.length > 0) {
                    batchHtml = `
                    <div class="mt-6 border-t border-coffee-50 pt-5">
                        <span class="text-[9px] font-black text-coffee-300 uppercase tracking-[0.2em] block mb-3">Antrean FIFO (Per Batch)</span>
                        <div class="space-y-2">
                            ${stockData.batches.map(b => `
                                <div class="flex justify-between items-center bg-coffee-50/50 px-4 py-2.5 rounded-xl border border-coffee-100/50">
                                    <span class="text-[10px] font-black text-coffee-600 uppercase tracking-tight">📅 ${b.date}</span>
                                    <span class="text-[10px] font-black text-coffee-950">${Math.round(b.qty)} KG</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
                }

                const inputArea = canInbound ? 
                    `<div class="flex gap-3 mt-6">
                        <input type="number" id="add-stock-${safeId}" placeholder="+ Qty" class="w-full bg-white border-2 border-coffee-100 px-4 py-3 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-coffee-50 focus:border-coffee-300 text-coffee-950 text-center transition">
                        <button onclick="addStockWh('${prod}')" class="${btnClass} px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-coffee-100 active:scale-95">Inbound</button>
                    </div>` : 
                    `<div class="bg-coffee-50/50 p-4 rounded-2xl border border-dashed border-coffee-200 text-center mt-6">
                        <span class="text-[9px] font-black text-coffee-300 uppercase tracking-widest">Wewenang Operator Inbound</span>
                    </div>`;

                return `
                <div class="bg-white rounded-[2.5rem] shadow-sm border border-coffee-50 p-8 flex flex-col justify-between hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    <div class="absolute -right-8 -top-8 w-20 h-20 bg-coffee-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div class="relative z-10">
                        <h4 class="text-[10px] font-black text-coffee-400 uppercase tracking-[0.2em] mb-2 line-clamp-1">${prod}</h4>
                        <div class="flex items-baseline gap-2 mb-4 mt-2">
                            <span class="text-5xl font-black ${stockVal < 100 ? 'text-red-600' : 'text-coffee-950'} tracking-tighter leading-none">${stockVal}</span>
                            <span class="text-xs font-black text-coffee-200 uppercase tracking-widest">/ 1.6k Kg</span>
                        </div>
                        ${batchHtml}
                    </div>
                    <div class="relative z-10">
                        ${inputArea}
                    </div>
                </div>`;
            }).join('');
        }

        function addStockWh(product) {
            const inputId = `add-stock-${product.replace(/\s+/g, '-')}`; const inputEl = document.getElementById(inputId); const addQty = parseFloat(inputEl.value);
            if (isNaN(addQty) || addQty <= 0) return alert("Masukkan jumlah stok valid!");
            const currentStock = globalStocksCache[currentUser.location][product].stock;
            if ((currentStock + addQty) > (WMS_CONFIG.BLOCKS_PER_ZONE * WMS_CONFIG.CAPACITY_PER_BLOCK)) return alert(`GAGAL INBOUND!\nKapasitas maksimal 1 Zona per produk adalah 1.6 Ton (1600 Kg).`);
            fetch('/api/warehouse/inbound', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product: product, qty: addQty })
            }).then(res => res.json()).then(data => { if (data.success) { inputEl.value = ''; loadWarehouseData(); } });
        }

        function updateInboundTaskStatus(taskId, selectEl) {
            const status = selectEl.value;
            fetch('/api/warehouse/update_inbound_status', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId, status: status })
            }).then(res => res.json()).then(data => { if (data.success) loadWarehouseData(); });
        }

        function renderInboundTasks() {
            const grid = document.getElementById('inbound-tasks-grid');
            const empty = document.getElementById('empty-inbound-state');
            if (!grid || !empty) return;

            let myTasks = globalInboundTasksCache.filter(t => t.warehouse_location === currentUser.location);
            if (myTasks.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
            
            empty.classList.add('hidden');
            
            const pg = globalPagination.whInbound;
            const start = (pg.current - 1) * pg.size;
            const end = start + pg.size;
            const paginatedTasks = myTasks.slice(start, end);

            grid.innerHTML = paginatedTasks.map(t => {
                const isDone = t.status === 'Selesai Inbound';
                let cardStyle = isDone ? "bg-coffee-50/50 border-coffee-100 opacity-60" : "bg-white border-coffee-100 shadow-sm";
                const canProcess = currentUser.job_role && currentUser.job_role.includes('Inbound');
                
                if (canProcess && !isDone) {
                    act = `<div class="text-[9px] font-black text-coffee-300 uppercase tracking-widest mb-2 px-1">Update Proses</div><select onchange="updateInboundTaskStatus(${t.id}, this)" class="w-full border-2 border-coffee-100 text-coffee-950 p-3 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-coffee-50 transition bg-white"><option value="Menunggu Bongkar Muat" ${t.status === 'Menunggu Bongkar Muat' ? 'selected' : ''}>🚚 Antrean</option><option value="QC Inbound" ${t.status === 'QC Inbound' ? 'selected' : ''}>🔍 QC Inbound</option><option value="Penempatan ke Rak" ${t.status === 'Penempatan ke Rak' ? 'selected' : ''}>📦 Penempatan</option><option value="Selesai Inbound">✅ Selesai</option></select>`;
                } else if (isDone) {
                    act = `<div class="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest border border-emerald-100">✅ Selesai Inbound</div>`;
                } else {
                    act = `<div class="text-[9px] font-black text-coffee-300 uppercase tracking-widest mb-2 px-1">Status Saat Ini</div><div class="bg-coffee-50 border border-coffee-100 p-3 rounded-2xl text-sm font-black text-coffee-900 text-center uppercase tracking-tight">${t.status}</div>`;
                }
                
                return `
                <div class="rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden flex flex-col hover:shadow-xl ${cardStyle}">
                    <div class="p-8 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-6">
                            <div>
                                <span class="font-mono text-sm font-black text-coffee-950 bg-coffee-50 px-3 py-1 rounded-xl border border-coffee-100">#INB-${t.id}</span>
                                <p class="text-[10px] font-black text-coffee-300 mt-2 uppercase tracking-widest">${t.created_at}</p>
                            </div>
                            <div class="bg-blue-50 text-blue-600 p-2.5 rounded-2xl shadow-sm">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                            </div>
                        </div>
                        <div class="mb-6 bg-coffee-50/50 p-4 rounded-2xl border border-coffee-100/50">
                            <span class="text-[9px] font-black text-coffee-300 uppercase tracking-widest block mb-1">Penanggung Jawab:</span>
                            <span class="font-black text-sm text-coffee-950 uppercase tracking-tight">${t.operator_name}</span>
                        </div>
                        <div class="space-y-4 mb-8 flex-grow">
                             <div class="text-[10px] font-black text-coffee-300 uppercase tracking-[0.2em] mb-2 border-b border-coffee-50 pb-2">Detail Barang</div>
                             <div class="flex justify-between items-center">
                                 <span class="font-black text-coffee-950 text-base uppercase tracking-tight">${t.product_name}</span>
                                 <span class="font-black text-xl text-coffee-950">${Math.round(t.qty_kg)} <span class="text-xs text-coffee-300">KG</span></span>
                             </div>
                        </div>
                        <div class="mt-auto">${act}</div>
                    </div>
                </div>`
            }).join('');

            renderPagination(myTasks.length, pg.size, pg.current, 'pagination-wh-inbound', 'whInbound');
        }


        function loadSdmData() {
            fetch('/api/warehouse/sdm').then(res => { if (res.status === 401) throw new Error('Unauthorized'); return res.json(); }).then(data => {
                if (!data.error) { sdmDataArray = data; renderSdmTable(); }
            }).catch(e => console.log("SDM Akses Ditolak."));
        }

        function renderSdmTable() {
            const tbody = document.getElementById('sdm-table-body');
            if (!tbody) return;
            if (sdmDataArray.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-coffee-300 font-black uppercase tracking-widest text-sm">Belum ada data karyawan.</td></tr>`; return; }
            tbody.innerHTML = sdmDataArray.map(sdm => {
                const initial = sdm.name.charAt(0).toUpperCase(); 
                let roleClass = "bg-coffee-50 text-coffee-600 border-coffee-100";
                if (sdm.role.includes("Supervisor")) roleClass = "bg-coffee-950 text-white border-coffee-900"; 
                else if (sdm.role.includes("Inbound")) roleClass = "bg-emerald-50 text-emerald-700 border-emerald-100"; 
                else if (sdm.role.includes("QC")) roleClass = "bg-amber-50 text-amber-700 border-amber-100"; 
                else if (sdm.role.includes("Packing")) roleClass = "bg-blue-50 text-blue-700 border-blue-100";
                
                let statusHtml = sdm.status === 'Aktif' ? 
                    `<span class="text-emerald-600 font-black text-[10px] flex items-center gap-2 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktif</span>` : 
                    `<span class="text-coffee-300 font-black text-[10px] uppercase tracking-widest bg-coffee-50 px-3 py-1.5 rounded-xl border border-coffee-100">Off-Shift</span>`;
                
                return `
                <tr class="border-b border-coffee-50 hover:bg-coffee-50/50 transition-colors group">
                    <td class="p-6">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-coffee-100 flex justify-center items-center font-black text-coffee-600 shadow-sm group-hover:scale-110 transition-transform">${initial}</div>
                            <div class="font-black text-coffee-950 uppercase tracking-tight">${sdm.name}</div>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="${roleClass} px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest shadow-sm">${sdm.role}</span>
                    </td>
                    <td class="p-6">${statusHtml}</td>
                    <td class="p-6 font-bold text-coffee-400 text-xs tracking-widest">${sdm.phone}</td>
                    <td class="p-6 text-center">
                        <div class="flex justify-center gap-2">
                            <button onclick="openSdmModal(${sdm.id})" class="p-2 bg-coffee-50 text-coffee-600 rounded-xl hover:bg-coffee-950 hover:text-white transition shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                            <button onclick="deleteSdm(${sdm.id})" class="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
        }

        function openSdmModal(id) {
            const modal = document.getElementById('sdm-modal');
            const locContainer = document.getElementById('sdm-loc-container');
            if (currentUser && currentUser.role === 'admin') { locContainer.style.display = 'block'; } else { locContainer.style.display = 'none'; }
            
            if (id) {
                const sdm = sdmDataArray.find(s => s.id === id); document.getElementById('sdm-modal-title').innerText = "Edit Karyawan"; document.getElementById('sdm-id').value = sdm.id; document.getElementById('sdm-name').value = sdm.name; document.getElementById('sdm-role').value = sdm.role; document.getElementById('sdm-status').value = sdm.status; document.getElementById('sdm-phone').value = sdm.phone;
                if (currentUser && currentUser.role === 'admin') document.getElementById('sdm-location').value = sdm.warehouse_location || sdm.location || "Bekasi";
            } else {
                document.getElementById('sdm-modal-title').innerText = "Tambah Karyawan"; document.getElementById('sdm-id').value = ""; document.getElementById('sdm-name').value = ""; document.getElementById('sdm-role').value = "Kepala Gudang (Supervisor)"; document.getElementById('sdm-status').value = "Aktif"; document.getElementById('sdm-phone').value = "";
                if (currentUser && currentUser.role === 'admin') document.getElementById('sdm-location').value = "Bekasi";
            }
            modal.classList.add('active');
        }
        function closeSdmModal() { document.getElementById('sdm-modal').classList.remove('active'); }

        function saveSdm() {
            const payload = { id: document.getElementById('sdm-id').value ? parseInt(document.getElementById('sdm-id').value) : null, name: document.getElementById('sdm-name').value.trim(), role: document.getElementById('sdm-role').value, status: document.getElementById('sdm-status').value, phone: document.getElementById('sdm-phone').value.trim() };
            if (currentUser && currentUser.role === 'admin') payload.location = document.getElementById('sdm-location').value;
            if (!payload.name || !payload.phone) return alert("Nama dan Kontak wajib diisi!");
            fetch('/api/warehouse/sdm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(res => res.json()).then(data => { 
                if (data.success) { 
                    closeSdmModal(); 
                    if (currentUser && currentUser.role === 'admin') renderAdminDashboard();
                    else loadSdmDataAndWarehouse(); 
                } 
            });
        }
        function deleteSdm(id) {
            if (confirm("Hapus karyawan ini?")) { 
                fetch(`/api/warehouse/sdm/${id}`, { method: 'DELETE' }).then(res => res.json()).then(d => { 
                    if (d.success) {
                        if (currentUser && currentUser.role === 'admin') renderAdminDashboard();
                        else loadSdmDataAndWarehouse(); 
                    }
                }); 
            }
        }

        function openShippingLabel(orderId) {
            const order = globalOrdersCache.find(o => o.id === orderId); if (!order) return;
            document.getElementById('label-customer').innerText = order.customer_name; document.getElementById('label-address').innerText = order.customer_address; document.getElementById('label-phone').innerText = "Telp: " + (order.customer_phone || "-");
            document.getElementById('label-expedition').innerText = order.expedition || "STANDARD";
            let itemsTxt = ""; order.items.forEach(i => { itemsTxt += `- ${i.qty} Kg : ${i.product}\n`; }); document.getElementById('label-items').innerText = itemsTxt;
            JsBarcode("#barcode-svg", "ORD-" + order.id, { format: "CODE128", lineColor: "#0f172a", width: 2, height: 40, displayValue: true, fontSize: 14 });
            document.getElementById('label-modal').classList.add('active');
        }
        function closeLabel() { document.getElementById('label-modal').classList.remove('active'); }

        function openAwbModal(orderIdsArray, isBatch) {
            document.getElementById('awb-order-id').value = JSON.stringify(orderIdsArray); document.getElementById('awb-is-batch').value = isBatch; document.getElementById('awb-number').value = ""; document.getElementById('awb-modal').classList.add('active');
        }
        function closeAwbModal() { document.getElementById('awb-modal').classList.remove('active'); }

        function submitAwb() {
            const orderIds = JSON.parse(document.getElementById('awb-order-id').value); const isBatch = document.getElementById('awb-is-batch').value === "true"; const exp = document.getElementById('awb-expedition').value; const awb = document.getElementById('awb-number').value.trim();
            if (!awb) return alert("Nomor Resi harus diisi!");

            fetch('/api/warehouse/batch_update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_ids: orderIds, status: 'Disetujui Admin (Siap Kirim)', expedition: exp, awb_number: awb })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    closeAwbModal(); alert("Berhasil! Resi disematkan. Menunggu operator gudang menyerahkan ke kurir.");
                    if (isBatch) { document.getElementById('check-all-orders').checked = false; document.getElementById('batch-status-select').value = ""; }
                    if (currentUser.role === 'admin') renderAdminDashboard(); else loadWarehouseData();
                }
            });
        }

        function getProgressTrackerHTML(currentStatus) {
            const mainSteps = ['Menunggu Diproses', 'Ambil Barang', 'Packing', 'QC', 'Minta Persetujuan/Approval Pengiriman', 'Serahkan ke Jasa Kirim', 'Selesai'];
            let currentIndex = mainSteps.indexOf(currentStatus); let isError = currentStatus === 'Perbaiki Kemasan'; let isAdminApproved = currentStatus === 'Disetujui Admin (Siap Kirim)';
            if (isError) currentIndex = 3; if (isAdminApproved) currentIndex = 4;
            let html = `<div class="flex justify-between items-center mb-1 relative"><div class="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-coffee-100 rounded-full z-0"></div>`;
            let fillWidth = currentIndex > -1 ? (currentIndex / (mainSteps.length - 1)) * 100 : 0;
            let fillColor = isError ? 'bg-red-500' : 'bg-accent-gold'; if (isAdminApproved || currentStatus === 'Serahkan ke Jasa Kirim' || currentStatus === 'Selesai') fillColor = 'bg-emerald-500';
            html += `<div class="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 ${fillColor} rounded-full z-0 transition-all duration-500 shadow-sm" style="width: ${fillWidth}%"></div>`;
            mainSteps.forEach((step, i) => {
                let dotClass = "bg-coffee-200 w-3 h-3"; if (i < currentIndex) dotClass = "bg-accent-gold w-3 h-3 shadow-sm"; if (isAdminApproved && i <= currentIndex) dotClass = "bg-emerald-500 w-3 h-3 shadow-sm";
                if (i === currentIndex) { if (isError) dotClass = "bg-red-500 w-4 h-4 ring-4 ring-red-100"; else if (isAdminApproved || currentStatus === 'Selesai') dotClass = "bg-emerald-500 w-4 h-4 ring-4 ring-emerald-100"; else dotClass = "bg-accent-gold w-4 h-4 ring-4 ring-accent-gold/20 animate-pulse"; }
                html += `<div class="rounded-full ${dotClass} z-10 relative border-2 border-white"></div>`;
            });
            html += `</div>`;
            let statusText = currentStatus; let textClass = "text-coffee-600";
            if (isError) { statusText = "Gagal QC (Perbaiki)"; textClass = "text-red-600 font-black"; }
            if (currentStatus === 'Minta Persetujuan/Approval Pengiriman') { statusText = "Validasi Admin..."; textClass = "text-accent-gold font-black animate-pulse"; }
            if (isAdminApproved) { statusText = "Disetujui Admin!"; textClass = "text-emerald-600 font-black"; }
            if (currentStatus === 'Serahkan ke Jasa Kirim') { statusText = "Dalam Pengiriman 🚚"; textClass = "text-emerald-700 font-black"; }
            if (currentStatus === 'Selesai') { statusText = "Pesanan Selesai 🎉"; textClass = "text-coffee-900 font-black"; }
            html += `<div class="text-[9px] text-center ${textClass} font-black uppercase tracking-[0.1em] mt-3">${statusText}</div>`; return html;
        }

        function getStatusBadge(status, warehouse) {
            const base = "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border shadow-sm flex items-center gap-2 inline-flex transition-all duration-300";
            if (status === 'Menunggu Alokasi') return `<span class="${base} bg-rose-50 text-rose-700 border-rose-100">⏱️ Alokasi</span>`;
            if (status === 'Minta Persetujuan/Approval Pengiriman') return `<span class="${base} bg-accent-gold/10 text-accent-gold border-accent-gold/20 animate-pulse shadow-accent-gold/10">✨ Validasi Admin</span>`;
            if (status === 'Disetujui Admin (Siap Kirim)') return `<span class="${base} bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50">✅ Siap Kirim</span>`;
            if (status === 'Serahkan ke Jasa Kirim') return `<span class="${base} bg-sky-50 text-sky-700 border-sky-100 shadow-sky-50">🚚 On Transit</span>`;
            if (status === 'Selesai') return `<span class="${base} bg-coffee-950 text-white border-coffee-900 shadow-coffee-200">🏁 Selesai</span>`;
            if (status === 'Perbaiki Kemasan') return `<span class="${base} bg-red-50 text-red-700 border-red-100 shadow-red-50">⚠️ Gagal QC</span>`;
            if (status === 'QC') return `<span class="${base} bg-coffee-50 text-coffee-700 border-coffee-200 uppercase">🔍 QC Hub ${warehouse}</span>`;
            if (status === 'Packing') return `<span class="${base} bg-coffee-50 text-coffee-600 border-coffee-100 uppercase">📦 Packing Hub ${warehouse}</span>`;
            if (status === 'Ambil Barang') return `<span class="${base} bg-coffee-50 text-coffee-500 border-coffee-100 uppercase">🏃 Pickup Hub ${warehouse}</span>`;
            if (status === 'Menunggu Diproses') return `<span class="${base} bg-coffee-50/50 text-coffee-400 border-coffee-100 uppercase tracking-widest">📋 Antrean Hub ${warehouse}</span>`;
              function openInvoice(orderId) {
            const order = globalOrdersCache.find(o => o.id === orderId); if (!order) return;
            let finalTotal = 0; const itemsTableRows = order.items.map(i => {
                const price = PRODUCT_PRICES[i.product] || 0; const subtotal = price * i.qty; finalTotal += subtotal;
                return `
                <div class="flex justify-between items-center border-b border-coffee-50 py-4 last:border-0">
                    <div>
                        <p class="font-black text-sm text-coffee-950 uppercase tracking-tight">${i.product}</p>
                        <p class="text-[10px] text-coffee-400 font-bold uppercase tracking-widest mt-1">${Math.round(i.qty)} Kg x Rp ${price}K</p>
                    </div>
                    <p class="font-black text-lg text-coffee-900">${subtotal.toLocaleString('id-ID')} <span class="text-[10px] text-coffee-300 font-bold">K</span></p>
                </div>`;
            }).join('');

            let resiHTML = ''; if (order.awb_number) {
                resiHTML = `<div class="bg-emerald-50/50 border-2 border-emerald-100 p-6 rounded-[2rem] mb-8 text-center relative overflow-hidden group"><div class="absolute -right-4 -top-4 w-12 h-12 bg-emerald-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div><p class="text-[9px] uppercase font-black text-emerald-600 mb-2 tracking-[0.2em] relative z-10">Nomor Resi Pengiriman (${order.expedition})</p><p class="font-mono font-black text-2xl tracking-[0.3em] text-coffee-950 relative z-10">${order.awb_number}</p></div>`;
            }

            let stampHTML = '<div class="inline-block border-2 border-amber-500 text-amber-600 px-6 py-2 font-black transform -rotate-12 opacity-80 rounded-xl uppercase tracking-widest text-xs scale-110 shadow-lg">Processing</div>';
            if (order.status === 'Selesai') {
                stampHTML = '<div class="inline-block border-4 border-emerald-600 text-emerald-600 px-6 py-2 font-black transform -rotate-12 opacity-80 rounded-xl uppercase tracking-[0.3em] text-sm scale-110 shadow-2xl bg-white/50 backdrop-blur-sm">Delivered ✅</div>';
            } else if (order.status === 'Serahkan ke Jasa Kirim' || order.status === 'Disetujui Admin (Siap Kirim)') {
                stampHTML = '<div class="inline-block border-4 border-coffee-900 text-coffee-900 px-6 py-2 font-black transform -rotate-12 opacity-80 rounded-xl uppercase tracking-[0.3em] text-sm scale-110 shadow-2xl bg-white/50 backdrop-blur-sm">Paid & Shipped</div>';
            }

            document.getElementById('invoice-content').innerHTML = `
                <div class="text-center mb-10">
                    <div class="inline-block bg-coffee-950 text-white px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] mb-4">Official Invoice</div>
                    <h2 class="text-4xl font-black text-coffee-950 tracking-tighter font-display uppercase">Sebiji Kopi</h2>
                    <p class="text-[9px] text-coffee-300 uppercase tracking-[0.2em] font-black mt-2">Premium Warehouse Management System</p>
                </div>
                ${resiHTML}
                <div class="grid grid-cols-2 gap-8 border-t border-b border-coffee-100 py-8 mb-8">
                    <div>
                        <p class="text-[9px] text-coffee-300 font-black uppercase tracking-widest mb-2">Order Reference</p>
                        <p class="font-mono font-black text-sm text-coffee-950">#ORD-${order.id}</p>
                        <p class="text-[10px] font-black text-coffee-400 mt-1 uppercase tracking-tight">${order.date}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] text-coffee-300 font-black uppercase tracking-widest mb-2">Customer Destination</p>
                        <p class="font-black text-sm text-coffee-950 uppercase tracking-tight">${order.customer_name}</p>
                        <p class="text-[10px] text-coffee-400 font-bold leading-relaxed mt-1 uppercase">${order.customer_address || '-'}</p>
                        <p class="text-[9px] font-black text-coffee-300 mt-2 uppercase tracking-widest">Telp: ${order.customer_phone || '-'}</p>
                    </div>
                </div>
                <div class="bg-coffee-50/30 p-8 rounded-[2.5rem] border border-coffee-50 mb-8 relative">
                    <p class="text-[9px] text-coffee-300 font-black uppercase tracking-widest mb-4">Item Details</p>
                    ${itemsTableRows}
                    <div class="flex justify-between items-center pt-6 mt-6 border-t border-coffee-100">
                        <span class="text-[10px] font-black text-coffee-400 uppercase tracking-widest">Grand Total Payment</span>
                        <span class="font-black text-2xl text-coffee-950 tracking-tighter">Rp ${finalTotal.toLocaleString('id-ID')}.000</span>
                    </div>
                </div>
                <div class="text-center mt-6 relative py-4">
                    ${stampHTML}
                </div>`;
            document.getElementById('invoice-modal').classList.add('active');
        }

        function closeInvoice() { document.getElementById('invoice-modal').classList.remove('active'); }
        document.addEventListener('keydown', function (e) { if (e.key === "Escape") { closeInvoice(); closeLabel(); closeAwbModal(); closeSdmModal(); } });
    