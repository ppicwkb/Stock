// Configuration - GANTI DENGAN DATA GOOGLE SHEETS ANDA
        const CONFIG = {
            FILE_URL: 'https://cdn.jsdelivr.net/gh/PPICWG/Stock/WKB.xlsx', // Gunakan jsDelivr agar bisa diakses langsung
            SHEET_NAME: 'WKB',
            TARGET_DATE_CELL: 'J1'
        };

        async function fetchTargetDate() {
            try {
                const response = await fetch(CONFIG.FILE_URL);
                const arrayBuffer = await response.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                const worksheet = workbook.Sheets[CONFIG.SHEET_NAME];
                const targetDate = worksheet[CONFIG.TARGET_DATE_CELL]?.v || "Tidak ditemukan";

                document.getElementById("tanggalTarget").innerText = targetDate;
            } catch (error) {
                console.error("Gagal memuat data:", error);
                document.getElementById("tanggalTarget").innerText = "Gagal memuat";
            }
        }

        fetchTargetDate();
        // User credentials
        const USERS = {
            'admin': { password: 'admin123', role: 'admin', name: 'Administrator' },
            'manager': { password: 'manager123', role: 'manager', name: 'Manager Gudang' },
            'staff': { password: 'staff123', role: 'staff', name: 'Staff Gudang' }
        };

        // Global variables
        let currentUser = null;
        let stockData = [];
        let filteredData = [];
        let currentPage = 1;
        let sortColumn = -1;
        let sortDirection = 'asc';
        let isLoading = false;
        let showAllPOs = false;
        let targetDate = null;
        let brandChart = null;
        let trendChart = null;

        // Authentication functions
        function initAuth() {
            const savedUser = localStorage.getItem('dashboardUser');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    showDashboard();
                } catch (e) {
                    localStorage.removeItem('dashboardUser');
                    showLogin();
                }
            } else {
                showLogin();
            }

            // Setup login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        }

        function showLogin() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
        }

        function hideLogin() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = 'auto';
            }
        }

        function showDashboard() {
            hideLogin();
            updateUserInfo();
            initCharts();
            fetchData();
            setCurrentDate();
            
            // Auto refresh every 5 minutes
            setInterval(fetchData, CONFIG.REFRESH_INTERVAL);
        }

        async function handleLogin(e) {
            e.preventDefault();
            
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errorDiv = document.getElementById('loginError');
            const buttonText = document.getElementById('loginButtonText');
            const spinner = document.getElementById('loginSpinner');
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            
            buttonText.classList.add('hidden');
            spinner.classList.remove('hidden');
            errorDiv.classList.add('hidden');
            
            // Simulate loading
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (USERS[username] && USERS[username].password === password) {
                currentUser = {
                    username: username,
                    name: USERS[username].name,
                    role: USERS[username].role,
                    loginTime: new Date().toISOString()
                };
                
                localStorage.setItem('dashboardUser', JSON.stringify(currentUser));
                
                buttonText.innerHTML = '<i class="fas fa-check mr-2"></i>Login Berhasil!';
                buttonText.classList.remove('hidden');
                spinner.classList.add('hidden');
                
                setTimeout(() => {
                    showDashboard();
                }, 500);
                
            } else {
                buttonText.classList.remove('hidden');
                spinner.classList.add('hidden');
                errorDiv.classList.remove('hidden');
                passwordInput.value = '';
            }
        }

        function updateUserInfo() {
            if (!currentUser) return;
            
            const userInfo = document.getElementById('userInfo');
            const userName = document.getElementById('userName');
            const userRole = document.getElementById('userRole');
            
            if (userInfo && userName && userRole) {
                userInfo.classList.remove('hidden');
                userName.textContent = currentUser.name;
                userRole.textContent = currentUser.role;
            }
        }

        function logout() {
            if (confirm('Yakin ingin keluar dari dashboard?')) {
                localStorage.removeItem('dashboardUser');
                currentUser = null;
                location.reload();
            }
        }

        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.getElementById('passwordToggle');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }

        // Data fetching functions
        
                
                // Fetch main data
                const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.SHEET_NAME}?key=${CONFIG.API_KEY}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.values && data.values.length > 1) {
                    // Process data (skip header row)
                    stockData = data.values.slice(1).map(row => {
                        const processedRow = [];
                        for (let i = 0; i < 9; i++) {
                            processedRow[i] = row[i] || '-';
                        }
                        return processedRow;
                    });
                    
                    filteredData = [...stockData];
                    updateUI();
                    setConnectionStatus(true, 'Terhubung');
                    
                    console.log(`✅ Data berhasil dimuat: ${stockData.length} baris`);
                } else {
                    throw new Error('No data found in sheet');
                }
            } catch (error) {
                console.error('❌ Error fetching data:', error);
                setConnectionStatus(false, 'Terputus');
                showError(error.message);
                
                // Load sample data as fallback
                loadSampleData();
            } finally {
                isLoading = false;
                hideLoading();
            }
        }

        function loadSampleData() {
            console.log('📝 Loading sample data...');
            
            if (!targetDate) {
                targetDate = new Date().toISOString().split('T')[0];
            }
            
            stockData = [
                ['2024-01-15', 'Beras Premium', '25kg', 'Brand A', 'BP001', 'PO-2024-001', '20', '500', 'Gudang A'],
                ['2024-01-15', 'Gula Pasir', '1kg', 'Brand B', 'GP002', 'PO-2024-001', '100', '100', 'Gudang B'],
                ['2024-01-16', 'Minyak Goreng', '2L', 'Brand C', 'MG003', 'PO-2024-002', '50', '100', 'Gudang A'],
                ['2024-01-16', 'Tepung Terigu', '1kg', 'Brand A', 'TT004', 'PO-2024-002', '75', '75', 'Gudang C'],
                ['2024-01-17', 'Beras Premium', '25kg', 'Brand B', 'BP005', 'PO-2024-003', '15', '375', 'Gudang B'],
                ['2024-01-17', 'Gula Pasir', '1kg', 'Brand A', 'GP006', 'PO-2024-003', '80', '80', 'Gudang A'],
                ['2024-01-18', 'Minyak Goreng', '2L', 'Brand B', 'MG007', 'PO-2024-004', '30', '60', 'Gudang C'],
                ['2024-01-18', 'Tepung Terigu', '1kg', 'Brand C', 'TT008', 'PO-2024-004', '60', '60', 'Gudang B']
            ];
            filteredData = [...stockData];
            updateUI();
        }

        // UI functions
        function showLoading() {
            const tbody = document.getElementById('stockTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="9" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center">
                            <div class="loading-spinner w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                            <p class="text-gray-600">Memuat data dari Google Sheets...</p>
                        </div>
                    </td></tr>
                `;
            }
        }

        function hideLoading() {
            // Loading will be replaced by actual data
        }

        function showError(message) {
            const tbody = document.getElementById('stockTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="9" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-4"></i>
                            <p class="text-gray-600 mb-2">Gagal memuat data dari Google Sheets</p>
                            <p class="text-sm text-gray-500 mb-4">${message}</p>
                            <button onclick="refreshData()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-refresh mr-2"></i>Coba Lagi
                            </button>
                        </div>
                    </td></tr>
                `;
            }
        }

        function setConnectionStatus(connected, text) {
            const status = document.getElementById('connectionStatus');
            const statusText = document.getElementById('connectionText');
            
            if (status && statusText) {
                if (connected) {
                    status.className = 'w-2 h-2 bg-green-500 rounded-full mr-2';
                    statusText.textContent = text || 'Terhubung';
                } else {
                    status.className = 'w-2 h-2 bg-red-500 rounded-full mr-2';
                    statusText.textContent = text || 'Terputus';
                }
            }
        }

        function toggleSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        }

        function closeSidebar() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        function showSection(sectionName) {
            document.querySelectorAll('.section').forEach(section => {
                section.classList.add('hidden');
            });
            
            const targetSection = document.getElementById(sectionName + '-section');
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
            
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'text-white');
                item.classList.add('text-gray-700');
            });
            
            if (event && event.target) {
                const sidebarItem = event.target.closest('.sidebar-item');
                if (sidebarItem) {
                    sidebarItem.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'text-white');
                    sidebarItem.classList.remove('text-gray-700');
                }
            }
            
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
            
            // Update section-specific data when switching sections
            updateSectionData(sectionName);
        }

        function updateSectionData(sectionName) {
            switch(sectionName) {
                case 'rekap-po':
                    updatePOSummary();
                    break;
                case 'rekap-brand':
                    updateBrandSummary();
                    break;
                case 'rekap-lokasi':
                    updateLocationSummary();
                    break;
                case 'rekap-kode':
                    updateCodeSummary();
                    break;
                case 'kode-per-size-brand':
                    updateSizePackingBrandSummary();
                    break;
                case 'stok-hari-ini':
                    updateTargetDateData();
                    break;
                case 'grafik':
                    updateCharts();
                    break;
            }
        }

        function updateUI() {
            populateFilters();
            populateTable();
            updateStats();
            updateAllSummaries();
            updateCharts();
            updateCurrentDate();
        }

        function updateAllSummaries() {
            updatePOSummary();
            updateBrandSummary();
            updateLocationSummary();
            updateCodeSummary();
            updateSizePackingBrandSummary();
            updateTargetDateData();
        }

        function populateFilters() {
            const products = [...new Set(stockData.map(row => row[1]).filter(item => item && item !== '-'))];
            const brands = [...new Set(stockData.map(row => row[3]).filter(item => item && item !== '-'))];
            const kodes = [...new Set(stockData.map(row => row[4]).filter(item => item && item !== '-'))];
            const locations = [...new Set(stockData.map(row => row[8]).filter(item => item && item !== '-'))];
            
            const productFilter = document.getElementById('productFilter');
            const brandFilter = document.getElementById('brandFilter');
            const kodeFilter = document.getElementById('kodeFilter');
            const locationFilter = document.getElementById('locationFilter');
            
            if (productFilter) {
                productFilter.innerHTML = '<option value="">Semua Produk</option>' + 
                    products.map(p => `<option value="${p}">${p}</option>`).join('');
            }
            
            if (brandFilter) {
                brandFilter.innerHTML = '<option value="">Semua Brand</option>' + 
                    brands.map(b => `<option value="${b}">${b}</option>`).join('');
            }
            
            if (kodeFilter) {
                kodeFilter.innerHTML = '<option value="">Semua Kode</option>' + 
                    kodes.map(k => `<option value="${k}">${k}</option>`).join('');
            }
            
            if (locationFilter) {
                locationFilter.innerHTML = '<option value="">Semua Lokasi</option>' + 
                    locations.map(l => `<option value="${l}">${l}</option>`).join('');
            }
        }

        function populateTable() {
            const tbody = document.getElementById('stockTableBody');
            if (!tbody) return;
            
            const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
            const end = Math.min(start + CONFIG.ITEMS_PER_PAGE, filteredData.length);
            
            tbody.innerHTML = filteredData.slice(start, end).map(row => `
                <tr class="table-row">
                    <td class="px-4 py-3 text-sm text-gray-900">${row[0]}</td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${row[1]}</td>
                    <td class="px-4 py-3 text-sm text-gray-900">${row[2]}</td>
                    <td class="px-4 py-3 text-sm">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">${row[3]}</span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[4]}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[5]}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right">${row[6]}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 text-right font-medium">${row[7]} kg</td>
                    <td class="px-4 py-3 text-sm text-gray-900">
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">${row[8] || '-'}</span>
                    </td>
                </tr>
            `).join('');
            
            updatePagination();
        }

        function updatePagination() {
            const total = filteredData.length;
            const start = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
            const end = Math.min(currentPage * CONFIG.ITEMS_PER_PAGE, total);
            const maxPages = Math.ceil(total / CONFIG.ITEMS_PER_PAGE);
            
            const showingStart = document.getElementById('showingStart');
            const showingEnd = document.getElementById('showingEnd');
            const totalRecords = document.getElementById('totalRecords');
            const pageInfo = document.getElementById('pageInfo');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            if (showingStart) showingStart.textContent = total > 0 ? start : 0;
            if (showingEnd) showingEnd.textContent = end;
            if (totalRecords) totalRecords.textContent = total;
            if (pageInfo) pageInfo.textContent = `${currentPage} / ${maxPages}`;
            
            if (prevBtn) prevBtn.disabled = currentPage <= 1;
            if (nextBtn) nextBtn.disabled = currentPage >= maxPages;
        }

        function updateStats() {
            const totalItems = filteredData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
            const totalKg = filteredData.reduce((sum, row) => sum + (parseInt(row[7]) || 0), 0);
            const uniqueProducts = new Set(filteredData.map(row => row[1])).size;
            const uniqueBrands = new Set(filteredData.map(row => row[3])).size;
            
            const totalItemsEl = document.getElementById('totalItems');
            const totalKgEl = document.getElementById('totalKg');
            const uniqueProductsEl = document.getElementById('uniqueProducts');
            const uniqueBrandsEl = document.getElementById('uniqueBrands');
            
            if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString();
            if (totalKgEl) totalKgEl.textContent = totalKg.toLocaleString();
            if (uniqueProductsEl) uniqueProductsEl.textContent = uniqueProducts;
            if (uniqueBrandsEl) uniqueBrandsEl.textContent = uniqueBrands;
        }

        let allPOSummaryData = [];

        function updatePOSummary() {
            // PO Summary
            const poSummary = {};
            filteredData.forEach(row => {
                const po = row[5];
                const product = row[1];
                const mc = parseInt(row[6]) || 0;
                const kg = parseInt(row[7]) || 0;
                
                if (!poSummary[po]) {
                    poSummary[po] = { 
                        items: 0, 
                        kg: 0, 
                        products: new Set(),
                        productDetails: new Map()
                    };
                }
                
                poSummary[po].items += mc;
                poSummary[po].kg += kg;
                poSummary[po].products.add(product);
                
                // Track product details for top products
                if (!poSummary[po].productDetails.has(product)) {
                    poSummary[po].productDetails.set(product, { mc: 0, kg: 0 });
                }
                const productData = poSummary[po].productDetails.get(product);
                productData.mc += mc;
                productData.kg += kg;
            });
            
            allPOSummaryData = Object.entries(poSummary).sort((a, b) => b[1].kg - a[1].kg);
            
            const totalPOs = allPOSummaryData.length;
            const totalPOItems = allPOSummaryData.reduce((sum, [po, data]) => sum + data.items, 0);
            const totalPOKg = allPOSummaryData.reduce((sum, [po, data]) => sum + data.kg, 0);
            const avgItemsPerPO = totalPOs > 0 ? Math.round(totalPOItems / totalPOs) : 0;
            
            // Update PO stats
            const totalPOCountEl = document.getElementById('totalPOCount');
            const totalPOItemsEl = document.getElementById('totalPOItems');
            const totalPOKgEl = document.getElementById('totalPOKg');
            const avgItemsPerPOEl = document.getElementById('avgItemsPerPO');
            
            if (totalPOCountEl) totalPOCountEl.textContent = totalPOs;
            if (totalPOItemsEl) totalPOItemsEl.textContent = totalPOItems.toLocaleString();
            if (totalPOKgEl) totalPOKgEl.textContent = totalPOKg.toLocaleString();
            if (avgItemsPerPOEl) avgItemsPerPOEl.textContent = avgItemsPerPO;
            
            renderPOSummary(allPOSummaryData);
        }

        function renderPOSummary(dataToRender) {
            const totalPOs = allPOSummaryData.length;
            const displayLimit = showAllPOs ? dataToRender.length : Math.min(6, dataToRender.length);
            const displayedPOs = dataToRender.slice(0, displayLimit);
            
            const displayedPOCountEl = document.getElementById('displayedPOCount');
            const showAllBtn = document.getElementById('showAllPOsBtn');
            const displayInfo = document.getElementById('poDisplayInfo');
            
            if (displayedPOCountEl) displayedPOCountEl.textContent = displayedPOs.length;
            
            if (showAllBtn && displayInfo) {
                if (showAllPOs) {
                    showAllBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Tampilkan 6 Teratas';
                    displayInfo.textContent = `Menampilkan semua ${dataToRender.length} PO`;
                } else {
                    showAllBtn.innerHTML = '<i class="fas fa-eye mr-2"></i>Tampilkan Semua PO';
                    displayInfo.textContent = `Menampilkan ${Math.min(6, dataToRender.length)} dari ${totalPOs} PO`;
                }
            }
            
            const poSummaryEl = document.getElementById('poSummary');
            if (poSummaryEl) {
                poSummaryEl.innerHTML = displayedPOs
                    .map(([po, data], index) => {
                        // Get top 4 products for this PO
                        const topProducts = Array.from(data.productDetails.entries())
                            .sort((a, b) => b[1].kg - a[1].kg)
                            .slice(0, 4);
                        
                        return `
                        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-lg font-semibold text-gray-800">${po}</h3>
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                            </div>
                            <div class="space-y-3 mb-4">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total MC:</span>
                                    <span class="font-medium text-blue-600">${data.items}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total Kg:</span>
                                    <span class="font-medium text-green-600">${data.kg.toLocaleString()} kg</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Jenis Produk:</span>
                                    <span class="font-medium text-purple-600">${data.products.size}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rata-rata/Item:</span>
                                    <span class="font-medium text-orange-600">${Math.round(data.kg / data.items)} kg</span>
                                </div>
                            </div>
                            
                            <!-- Top 4 Products -->
                            <div class="border-t pt-4 mb-3">
                                <p class="text-sm font-medium text-gray-700 mb-3">🏆 Top 4 Produk:</p>
                                <div class="space-y-2">
                                    ${topProducts.map(([product, productData], idx) => `
                                        <div class="flex justify-between items-center text-sm">
                                            <div class="flex items-center">
                                                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center mr-2">${idx + 1}</span>
                                                <span class="text-gray-700 truncate" title="${product}">${product.length > 20 ? product.substring(0, 20) + '...' : product}</span>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-medium text-green-600">${productData.kg} kg</div>
                                                <div class="text-xs text-gray-500">${productData.mc} MC</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="pt-2 border-t">
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aktif</span>
                            </div>
                        </div>
                        `;
                    }).join('');
            }
        }

        function filterPOSummary() {
            const searchTerm = document.getElementById('poSearchInput')?.value?.toLowerCase() || '';
            
            if (!searchTerm) {
                renderPOSummary(allPOSummaryData);
                return;
            }
            
            const filteredPOs = allPOSummaryData.filter(([po, data]) => 
                po.toLowerCase().includes(searchTerm)
            );
            
            renderPOSummary(filteredPOs);
        }

        function updateBrandSummary() {
            const brandSummary = {};
            filteredData.forEach(row => {
                const brand = row[3];
                const product = row[1];
                const mc = parseInt(row[6]) || 0;
                const kg = parseInt(row[7]) || 0;
                
                if (!brandSummary[brand]) {
                    brandSummary[brand] = { 
                        items: 0, 
                        kg: 0, 
                        products: new Set(),
                        productDetails: new Map()
                    };
                }
                
                brandSummary[brand].items += mc;
                brandSummary[brand].kg += kg;
                brandSummary[brand].products.add(product);
                
                // Track product details for top products
                if (!brandSummary[brand].productDetails.has(product)) {
                    brandSummary[brand].productDetails.set(product, { mc: 0, kg: 0 });
                }
                const productData = brandSummary[brand].productDetails.get(product);
                productData.mc += mc;
                productData.kg += kg;
            });
            
            const sortedBrands = Object.entries(brandSummary).sort((a, b) => b[1].kg - a[1].kg);
            
            const totalBrandItems = sortedBrands.reduce((sum, [brand, data]) => sum + data.items, 0);
            const totalBrandKg = sortedBrands.reduce((sum, [brand, data]) => sum + data.kg, 0);
            const totalBrandCount = sortedBrands.length;
            const avgKgPerBrand = totalBrandCount > 0 ? Math.round(totalBrandKg / totalBrandCount) : 0;
            
            // Update brand stats
            const totalBrandItemsEl = document.getElementById('totalBrandItems');
            const totalBrandKgEl = document.getElementById('totalBrandKg');
            const totalBrandCountEl = document.getElementById('totalBrandCount');
            const avgKgPerBrandEl = document.getElementById('avgKgPerBrand');
            
            if (totalBrandItemsEl) totalBrandItemsEl.textContent = totalBrandItems.toLocaleString();
            if (totalBrandKgEl) totalBrandKgEl.textContent = totalBrandKg.toLocaleString();
            if (totalBrandCountEl) totalBrandCountEl.textContent = totalBrandCount;
            if (avgKgPerBrandEl) avgKgPerBrandEl.textContent = avgKgPerBrand;
            
            const brandSummaryEl = document.getElementById('brandSummary');
            if (brandSummaryEl) {
                brandSummaryEl.innerHTML = sortedBrands
                    .map(([brand, data], index) => {
                        // Get top 4 products for this brand
                        const topProducts = Array.from(data.productDetails.entries())
                            .sort((a, b) => b[1].kg - a[1].kg)
                            .slice(0, 4);
                        
                        return `
                        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-lg font-semibold text-gray-800">${brand}</h3>
                                <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                            </div>
                            <div class="space-y-3 mb-4">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total MC:</span>
                                    <span class="font-medium text-blue-600">${data.items}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total Kg:</span>
                                    <span class="font-medium text-green-600">${data.kg.toLocaleString()} kg</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Jenis Produk:</span>
                                    <span class="font-medium text-purple-600">${data.products.size}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rata-rata/Item:</span>
                                    <span class="font-medium text-orange-600">${Math.round(data.kg / data.items)} kg</span>
                                </div>
                            </div>
                            
                            <!-- Top 4 Products -->
                            <div class="border-t pt-4">
                                <p class="text-sm font-medium text-gray-700 mb-3">🏆 Top 4 Produk:</p>
                                <div class="space-y-2">
                                    ${topProducts.map(([product, productData], idx) => `
                                        <div class="flex justify-between items-center text-sm">
                                            <div class="flex items-center">
                                                <span class="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center mr-2">${idx + 1}</span>
                                                <span class="text-gray-700 truncate" title="${product}">${product.length > 20 ? product.substring(0, 20) + '...' : product}</span>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-medium text-green-600">${productData.kg} kg</div>
                                                <div class="text-xs text-gray-500">${productData.mc} MC</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
            }
        }

        function updateLocationSummary() {
            const locationSummary = {};
            filteredData.forEach(row => {
                const location = row[8] || 'Tidak Diketahui';
                const product = row[1];
                const mc = parseInt(row[6]) || 0;
                const kg = parseInt(row[7]) || 0;
                
                if (!locationSummary[location]) {
                    locationSummary[location] = { 
                        items: 0, 
                        kg: 0, 
                        products: new Set(),
                        productDetails: new Map()
                    };
                }
                
                locationSummary[location].items += mc;
                locationSummary[location].kg += kg;
                locationSummary[location].products.add(product);
                
                // Track product details for top products
                if (!locationSummary[location].productDetails.has(product)) {
                    locationSummary[location].productDetails.set(product, { mc: 0, kg: 0 });
                }
                const productData = locationSummary[location].productDetails.get(product);
                productData.mc += mc;
                productData.kg += kg;
            });
            
            const sortedLocations = Object.entries(locationSummary).sort((a, b) => b[1].kg - a[1].kg);
            
            const totalLocationItems = sortedLocations.reduce((sum, [location, data]) => sum + data.items, 0);
            const totalLocationKg = sortedLocations.reduce((sum, [location, data]) => sum + data.kg, 0);
            const totalLocationCount = sortedLocations.length;
            const avgKgPerLocation = totalLocationCount > 0 ? Math.round(totalLocationKg / totalLocationCount) : 0;
            
            // Update location stats
            const totalLocationItemsEl = document.getElementById('totalLocationItems');
            const totalLocationKgEl = document.getElementById('totalLocationKg');
            const totalLocationCountEl = document.getElementById('totalLocationCount');
            const avgKgPerLocationEl = document.getElementById('avgKgPerLocation');
            
            if (totalLocationItemsEl) totalLocationItemsEl.textContent = totalLocationItems.toLocaleString();
            if (totalLocationKgEl) totalLocationKgEl.textContent = totalLocationKg.toLocaleString();
            if (totalLocationCountEl) totalLocationCountEl.textContent = totalLocationCount;
            if (avgKgPerLocationEl) avgKgPerLocationEl.textContent = avgKgPerLocation;
            
            const locationSummaryEl = document.getElementById('locationSummary');
            if (locationSummaryEl) {
                locationSummaryEl.innerHTML = sortedLocations
                    .map(([location, data], index) => {
                        // Get top 4 products for this location
                        const topProducts = Array.from(data.productDetails.entries())
                            .sort((a, b) => b[1].kg - a[1].kg)
                            .slice(0, 4);
                        
                        return `
                        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-lg font-semibold text-gray-800">${location}</h3>
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                            </div>
                            <div class="space-y-3 mb-4">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total MC:</span>
                                    <span class="font-medium text-blue-600">${data.items}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total Kg:</span>
                                    <span class="font-medium text-green-600">${data.kg.toLocaleString()} kg</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Jenis Produk:</span>
                                    <span class="font-medium text-purple-600">${data.products.size}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rata-rata/Item:</span>
                                    <span class="font-medium text-orange-600">${Math.round(data.kg / data.items)} kg</span>
                                </div>
                            </div>
                            
                            <!-- Top 4 Products -->
                            <div class="border-t pt-4">
                                <p class="text-sm font-medium text-gray-700 mb-3">🏆 Top 4 Produk:</p>
                                <div class="space-y-2">
                                    ${topProducts.map(([product, productData], idx) => `
                                        <div class="flex justify-between items-center text-sm">
                                            <div class="flex items-center">
                                                <span class="w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs flex items-center justify-center mr-2">${idx + 1}</span>
                                                <span class="text-gray-700 truncate" title="${product}">${product.length > 20 ? product.substring(0, 20) + '...' : product}</span>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-medium text-green-600">${productData.kg} kg</div>
                                                <div class="text-xs text-gray-500">${productData.mc} MC</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
            }
        }

        let allCodeSummaryData = [];
        let allSizePackingSummaryData = [];

        function updateCodeSummary() {
            const codeSummary = {};
            filteredData.forEach(row => {
                const code = row[4];
                const product = row[1];
                const mc = parseInt(row[6]) || 0;
                const kg = parseInt(row[7]) || 0;
                
                if (!codeSummary[code]) {
                    codeSummary[code] = { 
                        items: 0, 
                        kg: 0, 
                        products: new Set(), 
                        brands: new Set(),
                        productDetails: new Map()
                    };
                }
                
                codeSummary[code].items += mc;
                codeSummary[code].kg += kg;
                codeSummary[code].products.add(product);
                codeSummary[code].brands.add(row[3]);
                
                // Track product details for top products
                if (!codeSummary[code].productDetails.has(product)) {
                    codeSummary[code].productDetails.set(product, { mc: 0, kg: 0 });
                }
                const productData = codeSummary[code].productDetails.get(product);
                productData.mc += mc;
                productData.kg += kg;
            });
            
            allCodeSummaryData = Object.entries(codeSummary).sort((a, b) => b[1].kg - a[1].kg);
            
            const totalCodeItems = allCodeSummaryData.reduce((sum, [code, data]) => sum + data.items, 0);
            const totalCodeKg = allCodeSummaryData.reduce((sum, [code, data]) => sum + data.kg, 0);
            const totalCodeCount = allCodeSummaryData.length;
            
            // Update code stats
            const totalCodeItemsEl = document.getElementById('totalCodeItems');
            const totalCodeKgEl = document.getElementById('totalCodeKg');
            const totalCodeCountEl = document.getElementById('totalCodeCount');
            
            if (totalCodeItemsEl) totalCodeItemsEl.textContent = totalCodeItems.toLocaleString();
            if (totalCodeKgEl) totalCodeKgEl.textContent = totalCodeKg.toLocaleString();
            if (totalCodeCountEl) totalCodeCountEl.textContent = totalCodeCount;
            
            renderCodeSummary(allCodeSummaryData);
        }

        function renderCodeSummary(dataToRender) {
            const codeSummaryEl = document.getElementById('codeSummary');
            if (codeSummaryEl) {
                codeSummaryEl.innerHTML = dataToRender
                    .map(([code, data], index) => {
                        // Get top 4 products for this code
                        const topProducts = Array.from(data.productDetails.entries())
                            .sort((a, b) => b[1].kg - a[1].kg)
                            .slice(0, 4);
                        
                        return `
                        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-lg font-semibold text-gray-800 font-mono">${code}</h3>
                                <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">#${index + 1}</span>
                            </div>
                            <div class="space-y-3 mb-4">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total MC:</span>
                                    <span class="font-medium text-blue-600">${data.items}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total Kg:</span>
                                    <span class="font-medium text-green-600">${data.kg.toLocaleString()} kg</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Jenis Produk:</span>
                                    <span class="font-medium text-purple-600">${data.products.size}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Brand:</span>
                                    <span class="font-medium text-indigo-600">${data.brands.size}</span>
                                </div>
                            </div>
                            
                            <!-- Top 4 Products -->
                            <div class="border-t pt-4">
                                <p class="text-sm font-medium text-gray-700 mb-3">🏆 Top 4 Produk:</p>
                                <div class="space-y-2">
                                    ${topProducts.map(([product, productData], idx) => `
                                        <div class="flex justify-between items-center text-sm">
                                            <div class="flex items-center">
                                                <span class="w-5 h-5 bg-orange-100 text-orange-600 rounded-full text-xs flex items-center justify-center mr-2">${idx + 1}</span>
                                                <span class="text-gray-700 truncate" title="${product}">${product.length > 20 ? product.substring(0, 20) + '...' : product}</span>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-medium text-green-600">${productData.kg} kg</div>
                                                <div class="text-xs text-gray-500">${productData.mc} MC</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
            }
        }

        function filterCodeSummary() {
            const searchTerm = document.getElementById('codeSearchInput')?.value?.toLowerCase() || '';
            
            if (!searchTerm) {
                renderCodeSummary(allCodeSummaryData);
                return;
            }
            
            const filteredCodes = allCodeSummaryData.filter(([code, data]) => 
                code.toLowerCase().includes(searchTerm)
            );
            
            renderCodeSummary(filteredCodes);
        }

        function updateSizePackingBrandSummary() {
            const sizePackingBrandSummary = {};
            
            filteredData.forEach(row => {
                const packing = row[2];
                const brand = row[3];
                const code = row[4];
                const mc = parseInt(row[6]) || 0;
                const kg = parseInt(row[7]) || 0;
                const key = `${packing} - ${brand}`;
                
                if (!sizePackingBrandSummary[key]) {
                    sizePackingBrandSummary[key] = { 
                        codes: new Map(), // Changed to Map to store MC breakdown
                        items: 0, 
                        kg: 0, 
                        packing: packing, 
                        brand: brand 
                    };
                }
                
                // Store MC breakdown per code
                if (!sizePackingBrandSummary[key].codes.has(code)) {
                    sizePackingBrandSummary[key].codes.set(code, { mc: 0, kg: 0 });
                }
                
                const codeData = sizePackingBrandSummary[key].codes.get(code);
                codeData.mc += mc;
                codeData.kg += kg;
                
                sizePackingBrandSummary[key].items += mc;
                sizePackingBrandSummary[key].kg += kg;
            });
            
            allSizePackingSummaryData = Object.entries(sizePackingBrandSummary)
                .sort((a, b) => b[1].codes.size - a[1].codes.size);
            
            // Update statistics
            const totalSizePackingItems = allSizePackingSummaryData.reduce((sum, [key, data]) => sum + data.items, 0);
            const totalSizePackingKg = allSizePackingSummaryData.reduce((sum, [key, data]) => sum + data.kg, 0);
            const totalSizePackingCount = allSizePackingSummaryData.length;
            
            const totalSizePackingItemsEl = document.getElementById('totalSizePackingItems');
            const totalSizePackingKgEl = document.getElementById('totalSizePackingKg');
            const totalSizePackingCountEl = document.getElementById('totalSizePackingCount');
            
            if (totalSizePackingItemsEl) totalSizePackingItemsEl.textContent = totalSizePackingItems.toLocaleString();
            if (totalSizePackingKgEl) totalSizePackingKgEl.textContent = totalSizePackingKg.toLocaleString();
            if (totalSizePackingCountEl) totalSizePackingCountEl.textContent = totalSizePackingCount;
            
            renderSizePackingSummary(allSizePackingSummaryData);
        }

        function renderSizePackingSummary(dataToRender) {
            const sizePackingBrandSummaryEl = document.getElementById('sizePackingBrandSummary');
            const displayInfo = document.getElementById('sizePackingDisplayInfo');
            
            if (displayInfo) {
                displayInfo.textContent = `Menampilkan ${dataToRender.length} dari ${allSizePackingSummaryData.length} kombinasi`;
            }
            
            if (sizePackingBrandSummaryEl) {
                sizePackingBrandSummaryEl.innerHTML = dataToRender
                    .map(([key, data], index) => {
                        // Sort codes by MC quantity (descending)
                        const sortedCodes = Array.from(data.codes.entries())
                            .sort((a, b) => b[1].mc - a[1].mc);
                        
                        return `
                        <div class="bg-white p-6 rounded-lg shadow">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-800">${data.packing}</h3>
                                    <p class="text-sm text-gray-600">Brand: ${data.brand}</p>
                                </div>
                                <span class="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                                    ${data.codes.size} Kode
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-4 mb-4">
                                <div class="text-center">
                                    <div class="text-xl font-bold text-blue-600">${data.items}</div>
                                    <div class="text-xs text-gray-600">Total MC</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-xl font-bold text-green-600">${data.kg}</div>
                                    <div class="text-xs text-gray-600">Total Kg</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-xl font-bold text-purple-600">${data.codes.size}</div>
                                    <div class="text-xs text-gray-600">Kode</div>
                                </div>
                            </div>
                            
                            <!-- MC Breakdown Table -->
                            <div class="border-t pt-4">
                                <div class="flex justify-between items-center mb-3">
                                    <p class="text-sm font-medium text-gray-700">📊 Breakdown MC per Kode:</p>
                                    <span class="text-xs text-gray-500">Diurutkan berdasarkan jumlah MC</span>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-sm">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
                                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">MC</th>
                                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kg</th>
                                                <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">% dari Total</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200">
                                            ${sortedCodes.map(([code, codeData]) => {
                                                const percentage = data.items > 0 ? ((codeData.mc / data.items) * 100).toFixed(1) : 0;
                                                return `
                                                <tr class="hover:bg-gray-50">
                                                    <td class="px-3 py-2 font-mono text-gray-900">${code}</td>
                                                    <td class="px-3 py-2 text-right font-medium text-blue-600">${codeData.mc}</td>
                                                    <td class="px-3 py-2 text-right text-gray-900">${codeData.kg}</td>
                                                    <td class="px-3 py-2 text-right">
                                                        <div class="flex items-center justify-end">
                                                            <div class="w-12 bg-gray-200 rounded-full h-2 mr-2">
                                                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                                                            </div>
                                                            <span class="text-xs text-gray-600">${percentage}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                        <tfoot class="bg-gray-50">
                                            <tr class="font-medium">
                                                <td class="px-3 py-2 text-gray-900">Total</td>
                                                <td class="px-3 py-2 text-right text-blue-600">${data.items}</td>
                                                <td class="px-3 py-2 text-right text-gray-900">${data.kg}</td>
                                                <td class="px-3 py-2 text-right text-gray-600">100%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                            
                            <!-- Quick Stats -->
                            <div class="mt-4 pt-3 border-t bg-gray-50 rounded-lg p-3">
                                <div class="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span class="text-gray-600">Rata-rata MC/Kode:</span>
                                        <span class="font-medium text-gray-900 ml-1">${Math.round(data.items / data.codes.size)}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600">Rata-rata Kg/MC:</span>
                                        <span class="font-medium text-gray-900 ml-1">${(data.kg / data.items).toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
            }
        }

        function filterSizePackingSummary() {
            const searchTerm = document.getElementById('sizePackingSearchInput')?.value?.toLowerCase() || '';
            
            if (!searchTerm) {
                renderSizePackingSummary(allSizePackingSummaryData);
                return;
            }
            
            const filteredSizePacking = allSizePackingSummaryData.filter(([key, data]) => 
                data.packing.toLowerCase().includes(searchTerm) ||
                data.brand.toLowerCase().includes(searchTerm) ||
                key.toLowerCase().includes(searchTerm)
            );
            
            renderSizePackingSummary(filteredSizePacking);
        }

        function exportSizePackingToPDF() {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Add title
                doc.setFontSize(16);
                doc.text('Rekap Kode per Size Packing Brand', 20, 20);
                
                // Add date and summary
                doc.setFontSize(10);
                doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 20, 30);
                doc.text(`Total Kombinasi: ${allSizePackingSummaryData.length}`, 20, 35);
                
                let yPosition = 45;
                
                // Process each size packing brand combination
                allSizePackingSummaryData.forEach(([key, data], index) => {
                    // Check if we need a new page
                    if (yPosition > 250) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    // Add combination header
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${index + 1}. ${data.packing} - ${data.brand}`, 20, yPosition);
                    yPosition += 8;
                    
                    // Add summary stats
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Total MC: ${data.items} | Total Kg: ${data.kg} | Jumlah Kode: ${data.codes.size}`, 25, yPosition);
                    yPosition += 10;
                    
                    // Prepare code breakdown data
                    const sortedCodes = Array.from(data.codes.entries())
                        .sort((a, b) => b[1].mc - a[1].mc);
                    
                    const codeTableData = sortedCodes.map(([code, codeData]) => {
                        const percentage = data.items > 0 ? ((codeData.mc / data.items) * 100).toFixed(1) : 0;
                        return [code, codeData.mc.toString(), codeData.kg.toString(), percentage + '%'];
                    });
                    
                    // Add code breakdown table
                    doc.autoTable({
                        head: [['Kode', 'MC', 'Kg', '% dari Total']],
                        body: codeTableData,
                        startY: yPosition,
                        styles: { fontSize: 8 },
                        headStyles: { fillColor: [99, 102, 241] },
                        margin: { left: 25, right: 20 },
                        tableWidth: 'auto',
                        columnStyles: {
                            0: { cellWidth: 40 },
                            1: { cellWidth: 25, halign: 'right' },
                            2: { cellWidth: 25, halign: 'right' },
                            3: { cellWidth: 30, halign: 'right' }
                        }
                    });
                    
                    yPosition = doc.lastAutoTable.finalY + 15;
                });
                
                // Save the PDF
                doc.save('rekap-kode-per-size-packing-brand.pdf');
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Gagal membuat PDF. Silakan coba lagi.');
            }
        }

        function updateTargetDateData() {
            const targetDateData = getTargetDateData();
            const targetItemsMc = targetDateData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
            const targetKg = targetDateData.reduce((sum, row) => sum + (parseInt(row[7]) || 0), 0);
            
            const todayItemsEl = document.getElementById('todayItems');
            const todayKgEl = document.getElementById('todayKg');
            const todayProductsEl = document.getElementById('todayProducts');
            const todayBrandsEl = document.getElementById('todayBrands');
            const currentTargetDateEl = document.getElementById('currentTargetDate');
            
            if (todayItemsEl) todayItemsEl.textContent = targetItemsMc.toLocaleString();
            if (todayKgEl) todayKgEl.textContent = targetKg.toLocaleString();
            if (todayProductsEl) todayProductsEl.textContent = new Set(targetDateData.map(row => row[1])).size;
            if (todayBrandsEl) todayBrandsEl.textContent = new Set(targetDateData.map(row => row[3])).size;
            if (currentTargetDateEl) currentTargetDateEl.textContent = targetDate || 'Tidak diketahui';
            
            // Update target date table
            const targetDateTableBody = document.getElementById('targetDateTableBody');
            if (targetDateTableBody) {
                if (targetDateData.length > 0) {
                    targetDateTableBody.innerHTML = targetDateData.map(row => `
                        <tr class="table-row">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">${row[1]}</td>
                            <td class="px-4 py-3 text-sm">
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">${row[3]}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-900 font-mono">${row[4]}</td>
                            <td class="px-4 py-3 text-sm text-gray-900 text-right">${row[6]}</td>
                            <td class="px-4 py-3 text-sm text-gray-900 text-right font-medium">${row[7]} kg</td>
                            <td class="px-4 py-3 text-sm text-gray-900">
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">${row[8] || '-'}</span>
                            </td>
                        </tr>
                    `).join('');
                } else {
                    targetDateTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                <i class="fas fa-calendar-times text-3xl mb-4"></i>
                                <p>Tidak ada data untuk tanggal target: ${targetDate || 'Tidak diketahui'}</p>
                            </td>
                        </tr>
                    `;
                }
            }
        }

        function getTargetDateData() {
            if (!targetDate) return [];
            
            const normalizedTargetDate = normalizeDate(targetDate);
            
            return filteredData.filter(row => {
                const rowDate = normalizeDate(row[0]);
                return rowDate === normalizedTargetDate;
            });
        }

        function normalizeDate(dateString) {
            if (!dateString || dateString === '-') return '';
            
            const date = parseDate(dateString);
            if (isNaN(date.getTime())) return '';
            
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }

        function parseDate(dateString) {
            if (!dateString || dateString === '-') return new Date(0);
            
            let date;
            
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = new Date(dateString);
            }
            else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const parts = dateString.split('/');
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            }
            else if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
                const parts = dateString.split('-');
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            }
            else if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                date = new Date(dateString);
            }
            else {
                date = new Date(dateString);
            }
            
            return isNaN(date.getTime()) ? new Date(0) : date;
        }

        function setCurrentDate() {
            const currentDateEl = document.getElementById('currentDate');
            if (currentDateEl) {
                const today = new Date();
                currentDateEl.textContent = today.toLocaleDateString('id-ID');
            }
        }

        function updateCurrentDate() {
            setCurrentDate();
        }

        // Chart functions
        function initCharts() {
            initBrandChart();
            initTrendChart();
        }

        function initBrandChart() {
            const ctx = document.getElementById('brandChart');
            if (!ctx) return;
            
            brandChart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }

        function initTrendChart() {
            const ctx = document.getElementById('trendChart');
            if (!ctx) return;
            
            trendChart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Total Stok (kg)',
                        data: [],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString() + ' kg';
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} kg`;
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }

        function updateCharts() {
            if (!brandChart || !filteredData.length) return;
            
            const brandData = {};
            filteredData.forEach(row => {
                const brand = row[3];
                const kg = parseInt(row[7]) || 0;
                brandData[brand] = (brandData[brand] || 0) + kg;
            });
            
            const brands = Object.keys(brandData).slice(0, 5);
            const values = brands.map(brand => brandData[brand]);
            
            brandChart.data.labels = brands;
            brandChart.data.datasets[0].data = values;
            brandChart.update();
            
            updateTrendChart();
        }

        function updateTrendChart() {
            if (!trendChart || !filteredData.length) return;
            
            const dailyData = {};
            filteredData.forEach(row => {
                const date = row[0];
                const kg = parseInt(row[7]) || 0;
                
                if (date && date !== '-') {
                    if (!dailyData[date]) dailyData[date] = 0;
                    dailyData[date] += kg;
                }
            });
            
            const sortedDates = Object.keys(dailyData).sort();
            const last7Days = sortedDates.slice(-7);
            
            const labels = [];
            const data = [];
            
            if (last7Days.length > 0) {
                last7Days.forEach(date => {
                    const dateObj = parseDate(date);
                    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                    labels.push(formattedDate);
                    data.push(dailyData[date]);
                });
            } else {
                // Fallback data
                labels.push('Hari ini');
                data.push(0);
            }
            
            trendChart.data.labels = labels;
            trendChart.data.datasets[0].data = data;
            trendChart.update();
        }

        // Filter and action functions
        function applyFilters() {
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            const product = document.getElementById('productFilter')?.value;
            const brand = document.getElementById('brandFilter')?.value;
            const kode = document.getElementById('kodeFilter')?.value;
            const location = document.getElementById('locationFilter')?.value;
            const searchTerm = document.getElementById('searchProduct')?.value?.toLowerCase() || '';
            
            filteredData = stockData.filter(row => {
                let matchesDate = true;
                
                if (startDate || endDate) {
                    const rowDate = parseDate(row[0]);
                    const filterStartDate = startDate ? new Date(startDate) : null;
                    const filterEndDate = endDate ? new Date(endDate) : null;
                    
                    if (filterStartDate && rowDate < filterStartDate) {
                        matchesDate = false;
                    }
                    if (filterEndDate && rowDate > filterEndDate) {
                        matchesDate = false;
                    }
                }
                
                const matchesProduct = !product || row[1] === product;
                const matchesBrand = !brand || row[3] === brand;
                const matchesKode = !kode || row[4] === kode;
                const matchesLocation = !location || row[8] === location;
                
                const matchesSearch = !searchTerm || 
                    row[1].toLowerCase().includes(searchTerm) ||
                    row[3].toLowerCase().includes(searchTerm);
                
                return matchesDate && matchesProduct && matchesBrand && matchesKode && matchesLocation && matchesSearch;
            });
            
            currentPage = 1;
            updateUI();
        }

        function resetFilters() {
            const startDateEl = document.getElementById('startDate');
            const endDateEl = document.getElementById('endDate');
            const productFilterEl = document.getElementById('productFilter');
            const brandFilterEl = document.getElementById('brandFilter');
            const kodeFilterEl = document.getElementById('kodeFilter');
            const locationFilterEl = document.getElementById('locationFilter');
            const searchProductEl = document.getElementById('searchProduct');
            
            if (startDateEl) startDateEl.value = '';
            if (endDateEl) endDateEl.value = '';
            if (productFilterEl) productFilterEl.value = '';
            if (brandFilterEl) brandFilterEl.value = '';
            if (kodeFilterEl) kodeFilterEl.value = '';
            if (locationFilterEl) locationFilterEl.value = '';
            if (searchProductEl) searchProductEl.value = '';
            
            filteredData = [...stockData];
            currentPage = 1;
            updateUI();
        }

        function sortTable(columnIndex) {
            if (sortColumn === columnIndex) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = columnIndex;
                sortDirection = 'asc';
            }
            
            filteredData.sort((a, b) => {
                let aVal = a[columnIndex];
                let bVal = b[columnIndex];
                
                if (columnIndex === 6 || columnIndex === 7) {
                    aVal = parseInt(aVal) || 0;
                    bVal = parseInt(bVal) || 0;
                }
                
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            
            populateTable();
        }

        function previousPage() {
            if (currentPage > 1) {
                currentPage--;
                populateTable();
            }
        }

        function nextPage() {
            const maxPages = Math.ceil(filteredData.length / CONFIG.ITEMS_PER_PAGE);
            if (currentPage < maxPages) {
                currentPage++;
                populateTable();
            }
        }

        function refreshData() {
            fetchData();
        }

        function toggleShowAllPOs() {
            showAllPOs = !showAllPOs;
            updatePOSummary();
        }

        function exportToPDF() {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Add title
                doc.setFontSize(16);
                doc.text('Dashboard Stok Produk', 20, 20);
                
                // Add date
                doc.setFontSize(10);
                doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 20, 30);
                doc.text(`Total Data: ${filteredData.length} baris`, 20, 35);
                
                // Prepare table data
                const tableData = filteredData.map(row => [
                    row[0], // Tanggal
                    row[1], // Produk
                    row[2], // Packing
                    row[3], // Brand
                    row[4], // Kode
                    row[5], // No. PO
                    row[6], // Jumlah MC
                    row[7] + ' kg', // Jumlah Kg
                    row[8] // Lokasi
                ]);
                
                // Add table
                doc.autoTable({
                    head: [['Tanggal', 'Produk', 'Packing', 'Brand', 'Kode', 'No. PO', 'MC', 'Kg', 'Lokasi']],
                    body: tableData,
                    startY: 45,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [59, 130, 246] }
                });
                
                // Save the PDF
                doc.save('dashboard-stok-produk.pdf');
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Gagal membuat PDF. Silakan coba lagi.');
            }
        }

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Initializing Dashboard...');
            initAuth();
        });
