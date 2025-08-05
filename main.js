    // ===== ENHANCED CONFIGURATION =====
        const CONFIG = {
    VERSION: '49.0.0',
    
    JSON_URL: 'data.json', // Tambahkan ini sebagai pengganti Google Sheets
    ITEMS_PER_PAGE: window.innerWidth <= 768 ? 5 : 10,
    MAX_ITEMS_PER_PAGE: 100,
    AUTO_REFRESH_INTERVAL: 600000, // 5 minutes
    ANIMATION_DURATION: 300,
    TARGET_DATE_CELL: 'targetDate',

            USERS: {
                'ppic': { password: '4', role: 'ppic', name: 'Planning Production', permissions: ['all'] },
                'qc': { password: '2', role: 'qc', name: 'Quality Control', permissions: ['read', 'export', 'analytics'] },
                'admin': { password: '1', role: 'admin', name: 'Administrasi', permissions: ['read'] }
            },
            
            FEATURES: {
                REAL_TIME_UPDATES: true,
                ADVANCED_ANALYTICS: true,
                EXPORT_CAPABILITIES: true,
                SMART_SEARCH: true,
                AUTO_BACKUP: true
            }
        };

        // ===== ENHANCED GLOBAL STATE =====
        const State = {
            version: CONFIG.VERSION,
            currentUser: null,
            stockData: [],
            filteredData: [],
            currentPage: 1,
            itemsPerPage: CONFIG.ITEMS_PER_PAGE,
            sortColumn: -1,
            sortDirection: 'asc',
            isLoading: false,
            targetDate: '29/01/2024',
            lastUpdate: null,
            autoRefreshTimer: null,
            searchCache: new Map(),
            charts: {
                brand: null,
                trend: null,
                analytics: {}
            },
            performance: {
                loadTime: 0,
                renderTime: 0,
                dataSize: 0
            },
            filters: {
                startDate: '',
                endDate: '',
                brand: '',
                location: '',
                search: ''
            }
        };

        // ===== ENHANCED AUTHENTICATION MODULE =====
        const Auth = {
            init() {
                console.log(`🚀 Initializing Dashboard v${CONFIG.VERSION}...`);
                const savedUser = localStorage.getItem('dashboardUser_v49');
                if (savedUser) {
                    try {
                        State.currentUser = JSON.parse(savedUser);
                        if (this.validateSession()) {
                            this.showDashboard();
                        } else {
                            this.logout();
                        }
                    } catch (e) {
                        console.warn('Invalid session data:', e);
                        localStorage.removeItem('dashboardUser_v49');
                        this.showLogin();
                    }
                } else {
                    this.showLogin();
                }

                this.bindEvents();
            },

            bindEvents() {
                const loginForm = document.getElementById('loginForm');
                if (loginForm) {
                    loginForm.addEventListener('submit', this.handleLogin.bind(this));
                }

                // Auto-logout on tab visibility change for security
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden && State.currentUser) {
                        console.log('🔒 Tab hidden - pausing auto-refresh');
                        if (State.autoRefreshTimer) {
                            clearInterval(State.autoRefreshTimer);
                        }
                    } else if (!document.hidden && State.currentUser) {
                        console.log('👁️ Tab visible - resuming auto-refresh');
                        this.startAutoRefresh();
                    }
                });
            },

            validateSession() {
                if (!State.currentUser || !State.currentUser.loginTime) return false;
                
                const loginTime = new Date(State.currentUser.loginTime);
                const now = new Date();
                const sessionDuration = now - loginTime;
                const maxSessionDuration = 8 * 60 * 60 * 1000; // 8 hours
                
                return sessionDuration < maxSessionDuration;
            },

            showLogin() {
                const modal = document.getElementById('loginModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    document.body.style.overflow = 'hidden';
                    
                    // Focus on username field
                    setTimeout(() => {
                        const usernameField = document.getElementById('username');
                        if (usernameField) usernameField.focus();
                    }, 300);
                }
            },

            hideLogin() {
                const modal = document.getElementById('loginModal');
                if (modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = 'auto';
                }
            },

            showDashboard() {
                this.hideLogin();
                this.updateUserInfo();
                this.startAutoRefresh();
                DataLoader.init();
                Charts.init();
                Utils.setCurrentTime();
                Performance.startTracking();
            },

            async handleLogin(e) {
                e.preventDefault();
                
                const elements = {
                    username: document.getElementById('username'),
                    password: document.getElementById('password'),
                    error: document.getElementById('loginError'),
                    buttonText: document.getElementById('loginButtonText'),
                    spinner: document.getElementById('loginSpinner')
                };
                
                const username = elements.username.value.trim();
                const password = elements.password.value;
                
                // Show loading state
                elements.buttonText.classList.add('hidden');
                elements.spinner.classList.remove('hidden');
                elements.error.classList.add('hidden');
                
                // Simulate authentication delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (CONFIG.USERS[username] && CONFIG.USERS[username].password === password) {
                    State.currentUser = {
                        username: username,
                        name: CONFIG.USERS[username].name,
                        role: CONFIG.USERS[username].role,
                        permissions: CONFIG.USERS[username].permissions,
                        loginTime: new Date().toISOString(),
                        sessionId: Utils.generateSessionId()
                    };
                    
                    localStorage.setItem('dashboardUser_v49', JSON.stringify(State.currentUser));
                    
                    elements.buttonText.innerHTML = '<i class="fas fa-check mr-3"></i>Access Granted!';
                    elements.buttonText.classList.remove('hidden');
                    elements.spinner.classList.add('hidden');
                    
                    setTimeout(() => {
                        this.showDashboard();
                        Utils.showNotification('success', `🎉 Welcome back, ${State.currentUser.name}!`);
                    }, 800);
                    
                } else {
                    elements.buttonText.classList.remove('hidden');
                    elements.spinner.classList.add('hidden');
                    elements.error.classList.remove('hidden');
                    elements.password.value = '';
                    elements.password.focus();
                }
            },

            updateUserInfo() {
                if (!State.currentUser) return;
                
                const elements = {
                    userInfo: document.getElementById('userInfo'),
                    userName: document.getElementById('userName'),
                    userRole: document.getElementById('userRole')
                };
                
                if (elements.userInfo && elements.userName && elements.userRole) {
                    elements.userInfo.classList.remove('hidden');
                    elements.userName.textContent = State.currentUser.name;
                    elements.userRole.textContent = State.currentUser.role.toUpperCase();
                }
            },

            startAutoRefresh() {
    if (State.autoRefreshTimer) {
        clearInterval(State.autoRefreshTimer);
    }

    if (CONFIG.FEATURES.REAL_TIME_UPDATES) {
        State.autoRefreshTimer = setInterval(() => {
            if (!document.hidden) {
                console.log('🔄 Auto-refreshing data...');
                DataLoader.loadFromJSON(true); // Ganti dari loadFromGoogleSheets
            }
        }, CONFIG.AUTO_REFRESH_INTERVAL);
    }
},

            logout() {
                if (confirm('Are you sure you want to logout?')) {
                    if (State.autoRefreshTimer) {
                        clearInterval(State.autoRefreshTimer);
                    }
                    
                    localStorage.removeItem('dashboardUser_v49');
                    State.currentUser = null;
                    
                    Utils.showNotification('info', '👋 Logged out successfully');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }
            }
        };

        // ===== ENHANCED DATA LOADER MODULE =====
        const DataLoader = {
    init() {
        console.log('📊 Initializing JSON data loading system...');
        this.loadFromJSON();
    },

    async loadFromJSON(isAutoRefresh = false) {
        const startTime = performance.now();
        console.log('🔄 Loading data from JSON file...', isAutoRefresh ? '(Auto-refresh)' : '(Manual)');

        const elements = {
            dataStatus: document.getElementById('dataStatus'),
            loadProgress: document.getElementById('loadProgress'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            refreshBtn: document.getElementById('refreshBtn')
        };

        if (!isAutoRefresh) {
            this.updateLoadingUI(elements, 'loading');
        }

        try {
            if (!isAutoRefresh) {
                this.updateProgress(elements, 20, 'Connecting to local JSON...');
            }

            const response = await fetch(CONFIG.JSON_URL);

            if (!response.ok) {
                throw new Error(`JSON file error: ${response.status} ${response.statusText}`);
            }

            const jsonData = await response.json();

            if (!jsonData || !jsonData.values || jsonData.values.length === 0) {
                throw new Error('No data found in JSON file');
            }

            if (!isAutoRefresh) {
                this.updateProgress(elements, 70, 'Processing JSON data...');
            }

            // Optional: ambil target date dari JSON jika tersedia
           let targetDate = null;

// Cek apakah ada key 'targetdate' (huruf kecil semua)
if (jsonData.targetdate) {
    targetDate = jsonData.targetdate;
}
// Fallback: kalau targetdate nggak ada, coba ambil dari baris pertama data.values
else if (jsonData.values && jsonData.values.length > 1 && jsonData.values[1][0]) {
    targetDate = jsonData.values[1][0];
}

if (targetDate) {
    State.targetDate = targetDate;
    console.log('📅 Target date from JSON:', targetDate);
}

            

            if (!isAutoRefresh) {
                this.updateProgress(elements, 90, 'Formatting data...');
            }

            const processedData = this.processSheetData(jsonData.values);

            if (processedData.length === 0) {
                throw new Error('No valid data found in JSON');
            }

            // Update performance metrics
            const loadTime = performance.now() - startTime;
            State.performance.loadTime = loadTime;
            State.performance.dataSize = JSON.stringify(jsonData.values).length;

            console.log(`✅ Successfully loaded ${processedData.length} records from JSON`);
            this.completeLoading(processedData, elements, isAutoRefresh);

        } catch (error) {
            console.error('❌ Error loading data from JSON:', error);
            if (!isAutoRefresh) {
                this.loadSampleData(elements);
            } else {
                Utils.showNotification('error', '⚠️ Auto-refresh failed - using cached data');
            }
        }
    },

            processSheetData(sheetValues) {
                const processedData = [];
                let validRows = 0;
                let skippedRows = 0;
                
                // Skip header row (index 0)
                for (let i = 1; i < sheetValues.length; i++) {
                    const row = sheetValues[i];
                    
                    // Ensure we have at least 9 columns, pad with empty strings if needed
                    while (row.length < 9) {
                        row.push('');
                    }
                    
                    // Check if required fields exist
                    const hasDate = row[0] && String(row[0]).trim() !== '';
                    const hasProduct = row[1] && String(row[1]).trim() !== '';
                    const hasMC = row[6] && !isNaN(parseFloat(row[6])) && parseFloat(row[6]) > 0;
                    
                    if (hasDate && hasProduct && hasMC) {
                        const formattedRow = [
                            Utils.formatDate(row[0]), // tanggal
                            String(row[1] || '').trim(), // produk
                            String(row[2] || '').trim(), // kemasan
                            String(row[3] || '').trim(), // brand
                            String(row[4] || '').trim(), // kode
                            String(row[5] || '').trim(), // po
                            parseFloat(row[6]) || 0, // mc
                            parseFloat(row[7]) || 0, // kg
                            String(row[8] || '').trim() // lokasi
                        ];
                        processedData.push(formattedRow);
                        validRows++;
                    } else {
                        skippedRows++;
                    }
                }
                
                console.log("Sheet processing complete: ${validRows} valid rows, ${skippedRows} skipped");
                return processedData;
            },

                
                loadSampleData(elements) {
                console.log('📝 Loading sample data...');
                
                
                
                State.targetDate = '29/01/2024';
                this.completeLoading(sampleData, elements, false);
            },

            completeLoading(data, elements, isAutoRefresh) {
                const previousDataLength = State.stockData.length;
                State.stockData = [...data];
                State.filteredData = [...State.stockData];
                State.lastUpdate = new Date();
                
                if (!isAutoRefresh) {
                    this.updateProgress(elements, 100, 'Complete!');
                    
                    setTimeout(() => {
                        this.updateLoadingUI(elements, 'complete');
                        UI.updateAll();
                        
                        const message = previousDataLength === 0 
                            ? `✅ Successfully loaded ${State.stockData.length} records!`
                            : `🔄 Data refreshed: ${State.stockData.length} records`;
                        
                        Utils.showNotification('success', message);
                    }, 1000);
                } else {
                    UI.updateAll();
                    
                    if (previousDataLength !== data.length) {
                        Utils.showNotification('info', `🔄 Auto-refresh: ${data.length} records updated`);
                    }
                }
                
                // Update last update time
                Utils.updateLastUpdateTime();
            },

            updateLoadingUI(elements, state) {
                switch (state) {
                    case 'loading':
                        if (elements.dataStatus) {
                            elements.dataStatus.textContent = 'Loading data...';
                            elements.dataStatus.className = 'text-lg font-bold text-blue-600 mb-2';
                        }
                        if (elements.loadProgress) elements.loadProgress.classList.remove('hidden');
                        if (elements.refreshBtn) elements.refreshBtn.disabled = true;
                        if (elements.progressBar) elements.progressBar.style.width = '0%';
                        if (elements.progressText) elements.progressText.textContent = 'Connecting to CDN...';
                        break;
                        
                    case 'complete':
                        if (elements.loadProgress) elements.loadProgress.classList.add('hidden');
                        if (elements.refreshBtn) elements.refreshBtn.disabled = false;
                        if (elements.dataStatus) {
                            elements.dataStatus.textContent = 'System Ready';
                            elements.dataStatus.className = 'text-lg font-bold text-green-600 mb-2';
                        }
                        
                        const dataInfo = document.getElementById('dataInfo');
                        const connectionStatus = document.getElementById('connectionStatus');
                        const connectionText = document.getElementById('connectionText');
                        
                        if (dataInfo) dataInfo.textContent = `${State.stockData.length} records available`;
                        if (connectionStatus) connectionStatus.className = 'w-3 h-3 bg-green-500 rounded-full shadow-sm animate-pulse';
                        if (connectionText) connectionText.textContent = 'Online';
                        break;
                }
            },

            updateProgress(elements, percentage, text) {
                if (elements.progressBar) elements.progressBar.style.width = `${percentage}%`;
                if (elements.progressText) elements.progressText.textContent = text;
            }
        };

        // ===== ENHANCED UI MODULE =====
        const UI = {
            toggleSidebar() {
                const sidebar = document.querySelector('.advanced-sidebar');
                const overlay = document.querySelector('.mobile-overlay');
                
                if (sidebar) sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('hidden');
            },

            closeSidebar() {
                const sidebar = document.querySelector('.advanced-sidebar');
                const overlay = document.querySelector('.mobile-overlay');
                
                if (sidebar) sidebar.classList.remove('open');
                if (overlay) overlay.classList.add('hidden');
            },

            updateAll() {
                if (State.stockData.length === 0) return;
                
                const startTime = performance.now();
                
                this.populateFilters();
                Table.populate();
                this.updateStats();
                Charts.updateAll();
                
                const renderTime = performance.now() - startTime;
                State.performance.renderTime = renderTime;
                
                console.log(`🎨 UI updated in ${renderTime.toFixed(2)}ms`);
            },

            populateFilters() {
                const brands = [...new Set(State.stockData.map(row => row[3]).filter(item => item && item !== '-'))].sort();
                const locations = [...new Set(State.stockData.map(row => row[8]).filter(item => item && item !== '-'))].sort();
                
                const brandFilter = document.getElementById('brandFilter');
                const locationFilter = document.getElementById('locationFilter');
                
                if (brandFilter) {
                    brandFilter.innerHTML = '<option value="">All Brands</option>' + 
                        brands.map(b => `<option value="${b}">${b}</option>`).join('');
                }
                
                if (locationFilter) {
                    locationFilter.innerHTML = '<option value="">All Locations</option>' + 
                        locations.map(l => `<option value="${l}">${l}</option>`).join('');
                }
            },

            updateStats() {
                const totalItems = State.filteredData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
                const totalKg = State.filteredData.reduce((sum, row) => sum + (parseFloat(row[7]) || 0), 0);
                const uniqueProducts = new Set(State.filteredData.map(row => row[1])).size;
                const uniqueBrands = new Set(State.filteredData.map(row => row[3])).size;
                
                const elements = {
                    totalItems: document.getElementById('totalItems'),
                    totalKg: document.getElementById('totalKg'),
                    uniqueProducts: document.getElementById('uniqueProducts'),
                    uniqueBrands: document.getElementById('uniqueBrands')
                };
                
                // Animate number changes
                if (elements.totalItems) this.animateNumber(elements.totalItems, totalItems);
                if (elements.totalKg) this.animateNumber(elements.totalKg, totalKg, 'kg');
                if (elements.uniqueProducts) this.animateNumber(elements.uniqueProducts, uniqueProducts);
                if (elements.uniqueBrands) this.animateNumber(elements.uniqueBrands, uniqueBrands);
            },

            animateNumber(element, targetValue, suffix = '') {
                const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
                const increment = (targetValue - currentValue) / 20;
                let current = currentValue;
                
                const timer = setInterval(() => {
                    current += increment;
                    if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
                        current = targetValue;
                        clearInterval(timer);
                    }
                    
                    const displayValue = Math.round(current).toLocaleString();
                    element.textContent = suffix ? `${displayValue} ${suffix}` : displayValue;
                }, 50);
            },

            showQuickActions() {
                // Implementation for floating action button
                const actions = [
                    { icon: 'fas fa-file-pdf', text: 'Export PDF', action: () => Export.toPDF() },
                    { icon: 'fas fa-chart-bar', text: 'Analytics', action: () => Navigation.showSection('analytics') },
                    { icon: 'fas fa-calendar-alt', text: 'Data Summary', action: () => Navigation.showSection('data-entry-summary') }
                ];
                
                // Show quick actions menu (implementation would create a popup menu)
                console.log('Quick actions:', actions);
            }
        };

        // ===== ENHANCED TABLE MODULE =====
        const Table = {
            populate() {
                const tbody = document.getElementById('stockTableBody');
                const mobileTable = document.getElementById('mobileStockTable');
                
                const start = (State.currentPage - 1) * State.itemsPerPage;
                const end = Math.min(start + State.itemsPerPage, State.filteredData.length);
                const pageData = State.filteredData.slice(start, end);
                
                // Desktop table
                if (tbody) {
                    tbody.innerHTML = pageData.map((row, index) => `
                        <tr class="table-row animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                            <td class="px-8 py-6 text-sm font-bold text-gray-900">${row[0]}</td>
                            <td class="px-8 py-6 text-sm font-black text-gray-900">${row[1]}</td>
                            <td class="px-8 py-6 text-sm text-gray-700 font-semibold">${row[2]}</td>
                            <td class="px-8 py-6 text-sm">
                                <span class="badge-advanced badge-primary">${row[3]}</span>
                            </td>
                            <td class="px-8 py-6 text-sm text-gray-900 font-mono font-bold">${row[4]}</td>
                            <td class="px-8 py-6 text-sm text-gray-900 font-mono font-bold">${row[5]}</td>
                            <td class="px-8 py-6 text-sm text-blue-600 text-right font-black text-lg">${row[6].toLocaleString()}</td>
                            <td class="px-8 py-6 text-sm text-green-600 text-right font-black text-lg">${row[7].toLocaleString()} kg</td>
                            <td class="px-8 py-6 text-sm text-gray-900">
                                <span class="badge-advanced badge-success">${row[8] || '-'}</span>
                            </td>
                        </tr>
                    `).join('');
                }
                
                // Mobile table
                if (mobileTable) {
                    mobileTable.innerHTML = pageData.map((row, index) => `
                        <div class="mobile-table-card animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                            <div class="mobile-table-header">${row[1]}</div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Date</span>
                                <span class="mobile-table-value">${row[0]}</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Brand</span>
                                <span class="mobile-table-value">
                                    <span class="badge-advanced badge-primary text-xs">${row[3]}</span>
                                </span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Packaging</span>
                                <span class="mobile-table-value">${row[2]}</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Code</span>
                                <span class="mobile-table-value font-mono">${row[4]}</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">PO Number</span>
                                <span class="mobile-table-value font-mono">${row[5]}</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">MC Qty</span>
                                <span class="mobile-table-value text-blue-600 font-black">${row[6].toLocaleString()}</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Weight</span>
                                <span class="mobile-table-value text-green-600 font-black">${row[7].toLocaleString()} kg</span>
                            </div>
                            <div class="mobile-table-row">
                                <span class="mobile-table-label">Location</span>
                                <span class="mobile-table-value">
                                    <span class="badge-advanced badge-success text-xs">${row[8] || '-'}</span>
                                </span>
                            </div>
                        </div>
                    `).join('');
                }
                
                this.updatePagination();
            },

            updatePagination() {
                const total = State.filteredData.length;
                const start = (State.currentPage - 1) * State.itemsPerPage + 1;
                const end = Math.min(State.currentPage * State.itemsPerPage, total);
                const maxPages = Math.ceil(total / State.itemsPerPage);
                
                // Desktop pagination elements
                const elements = {
                    showingStart: document.getElementById('showingStart'),
                    showingEnd: document.getElementById('showingEnd'),
                    totalRecords: document.getElementById('totalRecords'),
                    pageInfo: document.getElementById('pageInfo'),
                    firstBtn: document.getElementById('firstBtn'),
                    prevBtn: document.getElementById('prevBtn'),
                    nextBtn: document.getElementById('nextBtn'),
                    lastBtn: document.getElementById('lastBtn')
                };
                
                // Mobile pagination elements
                const mobileElements = {
                    showingStart: document.getElementById('showingStartMobile'),
                    showingEnd: document.getElementById('showingEndMobile'),
                    totalRecords: document.getElementById('totalRecordsMobile'),
                    pageInfo: document.getElementById('pageInfoMobile'),
                    firstBtn: document.getElementById('firstBtnMobile'),
                    prevBtn: document.getElementById('prevBtnMobile'),
                    nextBtn: document.getElementById('nextBtnMobile'),
                    lastBtn: document.getElementById('lastBtnMobile')
                };
                
                // Update both desktop and mobile pagination
                [elements, mobileElements].forEach(elemSet => {
                    if (elemSet.showingStart) elemSet.showingStart.textContent = total > 0 ? start : 0;
                    if (elemSet.showingEnd) elemSet.showingEnd.textContent = end;
                    if (elemSet.totalRecords) elemSet.totalRecords.textContent = total.toLocaleString();
                    if (elemSet.pageInfo) elemSet.pageInfo.textContent = `${State.currentPage} / ${maxPages}`;
                    
                    if (elemSet.firstBtn) elemSet.firstBtn.disabled = State.currentPage <= 1;
                    if (elemSet.prevBtn) elemSet.prevBtn.disabled = State.currentPage <= 1;
                    if (elemSet.nextBtn) elemSet.nextBtn.disabled = State.currentPage >= maxPages;
                    if (elemSet.lastBtn) elemSet.lastBtn.disabled = State.currentPage >= maxPages;
                });
            },

            sort(columnIndex) {
                if (State.sortColumn === columnIndex) {
                    State.sortDirection = State.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    State.sortColumn = columnIndex;
                    State.sortDirection = 'asc';
                }
                
                State.filteredData.sort((a, b) => {
                    let aVal = a[columnIndex];
                    let bVal = b[columnIndex];
                    
                    // Handle numeric columns
                    if (columnIndex === 6 || columnIndex === 7) {
                        aVal = parseFloat(aVal) || 0;
                        bVal = parseFloat(bVal) || 0;
                    }
                    
                    // Handle date columns
                    if (columnIndex === 0) {
                        aVal = Utils.parseDate(aVal);
                        bVal = Utils.parseDate(bVal);
                    }
                    
                    if (aVal < bVal) return State.sortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return State.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
                
                State.currentPage = 1;
                this.populate();
            },

            changeItemsPerPage() {
                const select = document.getElementById('itemsPerPage');
                const mobileSelect = document.getElementById('itemsPerPageMobile');
                
                if (select) {
                    State.itemsPerPage = parseInt(select.value);
                    State.currentPage = 1;
                    this.populate();
                }
                
                if (mobileSelect) {
                    State.itemsPerPage = parseInt(mobileSelect.value);
                    State.currentPage = 1;
                    this.populate();
                }
            },

            firstPage() {
                State.currentPage = 1;
                this.populate();
            },

            previousPage() {
                if (State.currentPage > 1) {
                    State.currentPage--;
                    this.populate();
                }
            },

            nextPage() {
                const maxPages = Math.ceil(State.filteredData.length / State.itemsPerPage);
                if (State.currentPage < maxPages) {
                    State.currentPage++;
                    this.populate();
                }
            },

            lastPage() {
                const maxPages = Math.ceil(State.filteredData.length / State.itemsPerPage);
                State.currentPage = maxPages;
                this.populate();
            }
        };

        // ===== ENHANCED SMART SEARCH MODULE =====
        const SmartSearch = {
            searchCache: new Map(),
            
            performSearch() {
                const searchTerm = document.getElementById('searchProduct')?.value?.toLowerCase() || '';
                const searchResults = document.getElementById('searchResults');
                
                if (searchTerm.length < 2) {
                    if (searchResults) {
                        searchResults.classList.remove('show');
                        searchResults.innerHTML = '';
                    }
                    return;
                }
                
                // Check cache first
                if (this.searchCache.has(searchTerm)) {
                    this.displaySearchResults(this.searchCache.get(searchTerm), searchResults);
                    return;
                }
                
                // Perform search
                const results = State.stockData.filter(row => {
                    return row[1].toLowerCase().includes(searchTerm) || // Product
                           row[3].toLowerCase().includes(searchTerm) || // Brand
                           row[2].toLowerCase().includes(searchTerm) || // Packaging
                           row[4].toLowerCase().includes(searchTerm) || // Code
                           row[5].toLowerCase().includes(searchTerm);   // PO Number
                }).slice(0, 8); // Limit to 8 results
                
                // Cache results
                this.searchCache.set(searchTerm, results);
                
                this.displaySearchResults(results, searchResults);
            },
            
            displaySearchResults(results, container) {
                if (!container) return;
                
                if (results.length === 0) {
                    container.innerHTML = '<div class="search-item text-gray-500">No results found</div>';
                    container.classList.add('show');
                    return;
                }
                
                container.innerHTML = results.map(row => `
                    <div class="search-item" onclick="SmartSearch.selectResult('${row[1]}', '${row[3]}', '${row[5]}')">
                        <div class="font-bold text-gray-800">${row[1]}</div>
                        <div class="text-sm text-gray-600">
                            <span class="badge-advanced badge-primary text-xs mr-2">${row[3]}</span>
                            <span class="badge-advanced badge-success text-xs mr-2">PO: ${row[5]}</span>
                            <span class="text-blue-600 font-bold">${row[6]} MC</span> | 
                            <span class="text-green-600 font-bold">${row[7]} kg</span>
                        </div>
                    </div>
                `).join('');
                
                container.classList.add('show');
            },
            
            selectResult(product, brand, po) {
                const searchInput = document.getElementById('searchProduct');
                const brandFilter = document.getElementById('brandFilter');
                const searchResults = document.getElementById('searchResults');
                
                if (searchInput) searchInput.value = product;
                if (brandFilter) brandFilter.value = brand;
                if (searchResults) searchResults.classList.remove('show');
                
                // Apply the filter
                Filters.apply();
            },
            
            applySorting() {
                const sortBy = document.getElementById('sortBy')?.value;
                if (!sortBy) return;
                
                const [column, direction] = sortBy.split('-');
                
                State.filteredData.sort((a, b) => {
                    let aVal, bVal;
                    
                    switch (column) {
                        case 'date':
                            aVal = Utils.parseDate(a[0]);
                            bVal = Utils.parseDate(b[0]);
                            break;
                        case 'product':
                            aVal = a[1].toLowerCase();
                            bVal = b[1].toLowerCase();
                            break;
                        case 'brand':
                            aVal = a[3].toLowerCase();
                            bVal = b[3].toLowerCase();
                            break;
                        case 'mc':
                            aVal = parseInt(a[6]) || 0;
                            bVal = parseInt(b[6]) || 0;
                            break;
                        case 'kg':
                            aVal = parseFloat(a[7]) || 0;
                            bVal = parseFloat(b[7]) || 0;
                            break;
                        case 'po':
                            aVal = a[5].toLowerCase();
                            bVal = b[5].toLowerCase();
                            break;
                        default:
                            aVal = a[0];
                            bVal = b[0];
                    }
                    
                    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
                
                State.currentPage = 1;
                Table.populate();
                
                Utils.showNotification('success', `📊 Data sorted by ${column} (${direction === 'asc' ? 'ascending' : 'descending'})`);
            },
            

        };

        // ===== ENHANCED FILTERS MODULE =====
        const Filters = {
            apply() {
                const startDate = document.getElementById('startDate')?.value;
                const endDate = document.getElementById('endDate')?.value;
                const brand = document.getElementById('brandFilter')?.value;
                const location = document.getElementById('locationFilter')?.value;
                const searchTerm = document.getElementById('searchProduct')?.value?.toLowerCase() || '';
                
                // Update state
                State.filters = { startDate, endDate, brand, location, search: searchTerm };
                
                State.filteredData = State.stockData.filter(row => {
                    const matchesBrand = !brand || row[3] === brand;
                    const matchesLocation = !location || row[8] === location;
                    const matchesSearch = !searchTerm || 
                        row[1].toLowerCase().includes(searchTerm) ||
                        row[3].toLowerCase().includes(searchTerm) ||
                        row[2].toLowerCase().includes(searchTerm) ||
                        row[4].toLowerCase().includes(searchTerm) ||
                        row[5].toLowerCase().includes(searchTerm); // Added PO search
                    
                    let matchesDateRange = true;
                    if (startDate || endDate) {
                        const rowDate = Utils.parseDate(row[0]);
                        if (startDate) {
                            const start = new Date(startDate);
                            matchesDateRange = matchesDateRange && rowDate >= start;
                        }
                        if (endDate) {
                            const end = new Date(endDate);
                            matchesDateRange = matchesDateRange && rowDate <= end;
                        }
                    }
                    
                    return matchesBrand && matchesLocation && matchesSearch && matchesDateRange;
                });
                
                State.currentPage = 1;
                
                // Apply current sorting
                const sortBy = document.getElementById('sortBy')?.value;
                if (sortBy) {
                    SmartSearch.applySorting();
                } else {
                    UI.updateAll();
                }
                
                Utils.showNotification('success', `🔍 Filter applied: ${State.filteredData.length} records found`);
            },

            reset() {
                const elements = {
                    startDate: document.getElementById('startDate'),
                    endDate: document.getElementById('endDate'),
                    brandFilter: document.getElementById('brandFilter'),
                    locationFilter: document.getElementById('locationFilter'),
                    searchProduct: document.getElementById('searchProduct'),
                    sortBy: document.getElementById('sortBy')
                };
                
                Object.values(elements).forEach(el => {
                    if (el) {
                        if (el.tagName === 'SELECT') {
                            el.selectedIndex = 0;
                        } else {
                            el.value = '';
                        }
                    }
                });
                
                // Clear search results
                const searchResults = document.getElementById('searchResults');
                if (searchResults) {
                    searchResults.classList.remove('show');
                    searchResults.innerHTML = '';
                }
                
                State.filters = { startDate: '', endDate: '', brand: '', location: '', search: '' };
                State.filteredData = [...State.stockData];
                State.currentPage = 1;
                UI.updateAll();
                
                Utils.showNotification('info', '🔄 Filters reset - showing all data');
            }
        };

        // ===== ENHANCED NAVIGATION MODULE =====
        const Navigation = {
            showSection(sectionName) {
                // Hide all sections
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                // Show target section
                const targetSection = document.getElementById(sectionName + '-section');
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                    targetSection.classList.add('animate-fadeIn');
                }
                
                // Update sidebar active state
                document.querySelectorAll('.sidebar-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                if (event && event.target) {
                    const sidebarItem = event.target.closest('.sidebar-item');
                    if (sidebarItem) {
                        sidebarItem.classList.add('active');
                    }
                }
                
                // Close mobile sidebar
                if (window.innerWidth <= 768) {
                    UI.closeSidebar();
                }
                
                // Update section-specific content
                setTimeout(() => {
                    switch (sectionName) {
                        case 'analytics':
                            Charts.updateAll();
                            break;
                        case 'rekap-po':
                            Recap.updatePOSection();
                            break;
                        case 'rekap-brand':
                            Recap.updateBrandSection();
                            break;
                        case 'rekap-lokasi':
                            Recap.updateLocationSection();
                            break;
                        case 'code-breakdown':
                            CodeBreakdown.updateSection();
                            break;
                        case 'data-entry-summary':
                            Charts.updateDateSummaryChart();
                            break;
                        case 'real-time':
                            Recap.updateRealTimeSection();
                            break;
                    }
                }, 300);
            }
        };


// ===== RECAP MODULES =====
        const Recap = {
            updatePOSection() {
                if (!State.stockData.length) return;
                
                // Calculate PO statistics
                const poData = {};
                State.stockData.forEach(row => {
                    const po = row[5];
                    const date = row[0];
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    
                    if (po && po !== '-') {
                        if (!poData[po]) {
                            poData[po] = { date, items: 0, mc: 0, kg: 0 };
                        }
                        poData[po].items++;
                        poData[po].mc += mc;
                        poData[po].kg += kg;
                    }
                });
                
                const totalPOs = Object.keys(poData).length;
                const activePOs = totalPOs; // All POs are considered active
                const totalMC = Object.values(poData).reduce((sum, po) => sum + po.mc, 0);
                const totalKg = Object.values(poData).reduce((sum, po) => sum + po.kg, 0);
                
                // Update stats
                UI.animateNumber(document.getElementById('totalPOs'), totalPOs);
                UI.animateNumber(document.getElementById('activePOs'), activePOs);
                UI.animateNumber(document.getElementById('poTotalMC'), totalMC);
                UI.animateNumber(document.getElementById('poTotalKg'), totalKg, 'kg');
                
                // Update PO table
                const tbody = document.getElementById('poTableBody');
                if (tbody) {
                    tbody.innerHTML = Object.entries(poData)
                        .sort(([,a], [,b]) => b.kg - a.kg)
                        .slice(0, 20)
                        .map(([po, data], index) => `
                            <tr class="table-row animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                                <td class="px-8 py-6 text-sm font-mono font-bold text-blue-600">${po}</td>
                                <td class="px-8 py-6 text-sm font-bold text-gray-900">${data.date}</td>
                                <td class="px-8 py-6 text-sm text-gray-700 text-right font-semibold">${data.items}</td>
                                <td class="px-8 py-6 text-sm text-blue-600 text-right font-black">${data.mc.toLocaleString()}</td>
                                <td class="px-8 py-6 text-sm text-green-600 text-right font-black">${data.kg.toLocaleString()} kg</td>
                                <td class="px-8 py-6 text-sm">
                                    <span class="badge-advanced badge-success">Active</span>
                                </td>
                            </tr>
                        `).join('');
                }
            },

            updateBrandSection() {
                if (!State.stockData.length) return;
                
                // Calculate brand statistics
                const brandData = {};
                State.stockData.forEach(row => {
                    const brand = row[3];
                    const product = row[1];
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    
                    if (brand && brand !== '-') {
                        if (!brandData[brand]) {
                            brandData[brand] = { products: new Set(), mc: 0, kg: 0 };
                        }
                        brandData[brand].products.add(product);
                        brandData[brand].mc += mc;
                        brandData[brand].kg += kg;
                    }
                });
                
                const totalBrands = Object.keys(brandData).length;
                const sortedBrands = Object.entries(brandData).sort(([,a], [,b]) => b.kg - a.kg);
                const topBrand = sortedBrands.length > 0 ? sortedBrands[0][0] : '-';
                const avgMC = totalBrands > 0 ? Math.round(Object.values(brandData).reduce((sum, b) => sum + b.mc, 0) / totalBrands) : 0;
                const avgKg = totalBrands > 0 ? Math.round(Object.values(brandData).reduce((sum, b) => sum + b.kg, 0) / totalBrands) : 0;
                
                // Update stats
                UI.animateNumber(document.getElementById('totalBrands'), totalBrands);
                document.getElementById('topBrand').textContent = topBrand;
                UI.animateNumber(document.getElementById('brandTotalMC'), avgMC);
                UI.animateNumber(document.getElementById('brandTotalKg'), avgKg, 'kg');
                
                // Update top brands list
                const topBrandsList = document.getElementById('topBrandsList');
                if (topBrandsList) {
                    const totalWeight = Object.values(brandData).reduce((sum, b) => sum + b.kg, 0);
                    topBrandsList.innerHTML = sortedBrands.slice(0, 8).map(([brand, data], index) => {
                        const percentage = ((data.kg / totalWeight) * 100).toFixed(1);
                        return `
                            <div class="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl animate-slideInRight" style="animation-delay: ${index * 0.1}s">
                                <div class="flex items-center">
                                    <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 text-white font-bold">
                                        ${index + 1}
                                    </div>
                                    <div>
                                        <div class="font-bold text-gray-800">${brand}</div>
                                        <div class="text-sm text-gray-600">${data.products.size} products</div>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="font-black text-purple-600">${data.kg.toLocaleString()} kg</div>
                                    <div class="text-sm text-gray-500">${percentage}%</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                
                // Update brand table
                const tbody = document.getElementById('brandTableBody');
                if (tbody) {
                    const totalWeight = Object.values(brandData).reduce((sum, b) => sum + b.kg, 0);
                    tbody.innerHTML = sortedBrands.map(([brand, data], index) => {
                        const marketShare = ((data.kg / totalWeight) * 100).toFixed(1);
                        const performance = data.kg > avgKg ? 'High' : data.kg > avgKg * 0.5 ? 'Medium' : 'Low';
                        const performanceClass = performance === 'High' ? 'badge-success' : performance === 'Medium' ? 'badge-warning' : 'badge-danger';
                        
                        return `
                            <tr class="table-row animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                                <td class="px-8 py-6 text-sm font-black text-gray-900">${brand}</td>
                                <td class="px-8 py-6 text-sm text-gray-700 text-right font-semibold">${data.products.size}</td>
                                <td class="px-8 py-6 text-sm text-blue-600 text-right font-black">${data.mc.toLocaleString()}</td>
                                <td class="px-8 py-6 text-sm text-green-600 text-right font-black">${data.kg.toLocaleString()} kg</td>
                                <td class="px-8 py-6 text-sm text-purple-600 text-right font-black">${marketShare}%</td>
                                <td class="px-8 py-6 text-sm">
                                    <span class="badge-advanced ${performanceClass}">${performance}</span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
                
                // Update brand distribution chart
                this.updateBrandChart(brandData);
            },

            updateLocationSection() {
                if (!State.stockData.length) return;
                
                // Calculate location statistics
                const locationData = {};
                State.stockData.forEach(row => {
                    const location = row[8];
                    const product = row[1];
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    
                    if (location && location !== '-') {
                        if (!locationData[location]) {
                            locationData[location] = { products: new Set(), mc: 0, kg: 0 };
                        }
                        locationData[location].products.add(product);
                        locationData[location].mc += mc;
                        locationData[location].kg += kg;
                    }
                });
                
                const totalLocations = Object.keys(locationData).length;
                const sortedLocations = Object.entries(locationData).sort(([,a], [,b]) => b.kg - a.kg);
                const busyLocation = sortedLocations.length > 0 ? sortedLocations[0][0] : '-';
                const avgMC = totalLocations > 0 ? Math.round(Object.values(locationData).reduce((sum, l) => sum + l.mc, 0) / totalLocations) : 0;
                const avgKg = totalLocations > 0 ? Math.round(Object.values(locationData).reduce((sum, l) => sum + l.kg, 0) / totalLocations) : 0;
                
                // Update stats
                UI.animateNumber(document.getElementById('totalLocations'), totalLocations);
                document.getElementById('busyLocation').textContent = busyLocation;
                UI.animateNumber(document.getElementById('locationTotalMC'), avgMC);
                UI.animateNumber(document.getElementById('locationTotalKg'), avgKg, 'kg');
                
                // Update warehouse capacity
                const warehouseCapacity = document.getElementById('warehouseCapacity');
                if (warehouseCapacity) {
                    const maxCapacity = 10000; // Assumed max capacity per warehouse
                    warehouseCapacity.innerHTML = sortedLocations.slice(0, 6).map(([location, data], index) => {
                        const utilization = Math.min((data.kg / maxCapacity) * 100, 100);
                        const utilizationClass = utilization > 80 ? 'bg-red-500' : utilization > 60 ? 'bg-yellow-500' : 'bg-green-500';
                        
                        return `
                            <div class="animate-slideInRight" style="animation-delay: ${index * 0.1}s">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-bold text-gray-800">${location}</span>
                                    <span class="text-sm font-semibold text-gray-600">${utilization.toFixed(1)}%</span>
                                </div>
                                <div class="progress-advanced mb-2">
                                    <div class="progress-bar-advanced ${utilizationClass}" style="width: ${utilization}%"></div>
                                </div>
                                <div class="text-xs text-gray-500 font-medium">${data.kg.toLocaleString()} kg / ${maxCapacity.toLocaleString()} kg</div>
                            </div>
                        `;
                    }).join('');
                }
                
                // Update location table
                const tbody = document.getElementById('locationTableBody');
                if (tbody) {
                    const maxCapacity = 10000;
                    tbody.innerHTML = sortedLocations.map(([location, data], index) => {
                        const utilization = Math.min((data.kg / maxCapacity) * 100, 100);
                        const status = utilization > 80 ? 'High' : utilization > 60 ? 'Medium' : 'Normal';
                        const statusClass = status === 'High' ? 'badge-danger' : status === 'Medium' ? 'badge-warning' : 'badge-success';
                        
                        return `
                            <tr class="table-row animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                                <td class="px-8 py-6 text-sm font-black text-gray-900">${location}</td>
                                <td class="px-8 py-6 text-sm text-gray-700 text-right font-semibold">${data.products.size}</td>
                                <td class="px-8 py-6 text-sm text-blue-600 text-right font-black">${data.mc.toLocaleString()}</td>
                                <td class="px-8 py-6 text-sm text-green-600 text-right font-black">${data.kg.toLocaleString()} kg</td>
                                <td class="px-8 py-6 text-sm text-purple-600 text-right font-black">${utilization.toFixed(1)}%</td>
                                <td class="px-8 py-6 text-sm">
                                    <span class="badge-advanced ${statusClass}">${status}</span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
                
                // Update location chart
                this.updateLocationChart(locationData);
            },

            updateRealTimeSection() {
                // Update real-time metrics
                const dataAge = State.lastUpdate ? Math.floor((new Date() - State.lastUpdate) / 1000) : 0;
                const loadTime = State.performance.loadTime ? `${State.performance.loadTime.toFixed(0)}ms` : '-';
                const memoryUsage = 'memory' in performance ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB` : '-';
                
                document.getElementById('dataFreshness').textContent = dataAge < 60 ? `${dataAge}s` : `${Math.floor(dataAge / 60)}m`;
                document.getElementById('loadTime').textContent = loadTime;
                document.getElementById('memoryUsage').textContent = memoryUsage;
                
                // Update system logs
                this.updateSystemLogs();
                
                // Update performance charts
                this.updatePerformanceCharts();
            },

            updateBrandChart(brandData) {
                const ctx = document.getElementById('brandDistributionChart');
                if (!ctx || !brandData) return;
                
                if (State.charts.brandDistribution) {
                    State.charts.brandDistribution.destroy();
                }
                
                const sortedBrands = Object.entries(brandData).sort(([,a], [,b]) => b.kg - a.kg).slice(0, 8);
                const brands = sortedBrands.map(([brand]) => brand);
                const values = sortedBrands.map(([,data]) => data.kg);
                
                State.charts.brandDistribution = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: brands,
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
                                '#3B82F6', '#EF4444', '#06B6D4', '#84CC16'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    }
                });
            },

            updateLocationChart(locationData) {
                const ctx = document.getElementById('locationChart');
                if (!ctx || !locationData) return;
                
                if (State.charts.locationChart) {
                    State.charts.locationChart.destroy();
                }
                
                const sortedLocations = Object.entries(locationData).sort(([,a], [,b]) => b.kg - a.kg);
                const locations = sortedLocations.map(([location]) => location);
                const values = sortedLocations.map(([,data]) => data.kg);
                
                State.charts.locationChart = new Chart(ctx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: locations,
                        datasets: [{
                            label: 'Weight (kg)',
                            data: values,
                            backgroundColor: '#10B981',
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true }
                        }
                    }
                });
            },

            updateSystemLogs() {
                const logsContainer = document.getElementById('systemLogs');
                if (!logsContainer) return;
                
                const logs = [
                    `[${new Date().toLocaleTimeString()}] INFO: Dashboard v49 running normally`,
                    `[${new Date().toLocaleTimeString()}] DATA: ${State.stockData.length} records loaded`,
                    `[${new Date().toLocaleTimeString()}] PERF: Load time ${State.performance.loadTime?.toFixed(0) || 0}ms`,
                    `[${new Date().toLocaleTimeString()}] USER: ${State.currentUser?.name || 'Unknown'} active`,
                    `[${new Date().toLocaleTimeString()}] CONN: CDN connection stable`,
                    `[${new Date().toLocaleTimeString()}] CACHE: Data cached successfully`,
                    `[${new Date().toLocaleTimeString()}] UI: All components rendered`,
                    `[${new Date().toLocaleTimeString()}] AUTH: Session valid`
                ];
                
                logsContainer.innerHTML = logs.map(log => `
                    <div class="text-green-400 mb-1 animate-fadeIn">${log}</div>
                `).join('');
                
                logsContainer.scrollTop = logsContainer.scrollHeight;
            },

            updatePerformanceCharts() {
                // Performance chart implementation would go here
                // This is a placeholder for the actual chart updates
                console.log('📊 Performance charts updated');
            }
        };

        // ===== ENHANCED CHARTS MODULE =====
        const Charts = {
            init() {
                this.initBrandChart();
                this.initTrendChart();
                this.initDateSummaryChart();
            },

            initBrandChart() {
                const ctx = document.getElementById('brandChart');
                if (!ctx) return;
                
                State.charts.brand = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
                            ],
                            borderWidth: 0,
                            hoverBorderWidth: 3,
                            hoverBorderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    font: { weight: 'bold' }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return `${label}: ${value.toLocaleString()} kg (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        animation: {
                            animateRotate: true,
                            duration: 1000
                        }
                    }
                });
            },

            initTrendChart() {
                const ctx = document.getElementById('trendChart');
                if (!ctx) return;
                
                State.charts.trend = new Chart(ctx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Total Stock (kg)',
                            data: [],
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#3B82F6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 3,
                            pointRadius: 6,
                            pointHoverRadius: 8
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
                                    },
                                    font: { weight: 'bold' }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                ticks: {
                                    font: { weight: 'bold' }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    font: { weight: 'bold' }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y.toLocaleString()} kg`;
                                    }
                                }
                            }
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                        }
                    }
                });
            },

            initDateSummaryChart() {
                const ctx = document.getElementById('dateSummaryChart');
                if (!ctx) return;
                
                State.charts.dateSummary = new Chart(ctx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Total MC',
                            data: [],
                            backgroundColor: '#3B82F6',
                            borderRadius: 8,
                            yAxisID: 'y'
                        }, {
                            label: 'Total Weight (kg)',
                            data: [],
                            backgroundColor: '#10B981',
                            borderRadius: 8,
                            yAxisID: 'y1'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Total MC',
                                    font: { weight: 'bold' }
                                },
                                ticks: {
                                    font: { weight: 'bold' }
                                }
                            },
                            y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {
                                    display: true,
                                    text: 'Total Weight (kg)',
                                    font: { weight: 'bold' }
                                },
                                ticks: {
                                    font: { weight: 'bold' }
                                },
                                grid: {
                                    drawOnChartArea: false,
                                }
                            },
                            x: {
                                ticks: {
                                    font: { weight: 'bold' }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    font: { weight: 'bold' }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.dataset.label;
                                        const value = context.parsed.y;
                                        return `${label}: ${value.toLocaleString()}${label.includes('Weight') ? ' kg' : ''}`;
                                    }
                                }
                            }
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                        }
                    }
                });
            },

            updateAll() {
                this.updateBrandChart();
                this.updateTrendChart();
                this.updateDateSummaryChart();
            },

            updateBrandChart() {
                if (!State.charts.brand || !State.filteredData.length) return;
                
                const brandData = {};
                State.filteredData.forEach(row => {
                    const brand = row[3];
                    const kg = parseFloat(row[7]) || 0;
                    brandData[brand] = (brandData[brand] || 0) + kg;
                });
                
                const sortedBrands = Object.entries(brandData)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8);
                
                const brands = sortedBrands.map(([brand]) => brand);
                const values = sortedBrands.map(([,value]) => value);
                
                State.charts.brand.data.labels = brands;
                State.charts.brand.data.datasets[0].data = values;
                State.charts.brand.update('active');
            },

            updateTrendChart() {
                if (!State.charts.trend || !State.filteredData.length) return;
                
                const dailyData = {};
                State.filteredData.forEach(row => {
                    const date = row[0];
                    const kg = parseFloat(row[7]) || 0;
                    
                    if (date && date !== '-') {
                        if (!dailyData[date]) dailyData[date] = 0;
                        dailyData[date] += kg;
                    }
                });
                
                const sortedDates = Object.keys(dailyData).sort((a, b) => {
                    return Utils.parseDate(a) - Utils.parseDate(b);
                });
                
                const last10Days = sortedDates.slice(-10);
                const labels = last10Days.length > 0 ? last10Days : ['Today'];
                const data = last10Days.length > 0 ? last10Days.map(date => dailyData[date]) : [0];
                
                State.charts.trend.data.labels = labels;
                State.charts.trend.data.datasets[0].data = data;
                State.charts.trend.update('active');
            },

            updateDateSummaryChart() {
                if (!State.charts.dateSummary || !State.filteredData.length) return;
                
                const dailyData = {};
                State.filteredData.forEach(row => {
                    const date = row[0];
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    
                    if (date && date !== '-') {
                        if (!dailyData[date]) {
                            dailyData[date] = { mc: 0, kg: 0, entries: 0 };
                        }
                        dailyData[date].mc += mc;
                        dailyData[date].kg += kg;
                        dailyData[date].entries += 1;
                    }
                });
                
                const sortedDates = Object.keys(dailyData).sort((a, b) => {
                    return Utils.parseDate(a) - Utils.parseDate(b);
                });
                
                const labels = sortedDates;
                const mcData = sortedDates.map(date => dailyData[date].mc);
                const kgData = sortedDates.map(date => dailyData[date].kg);
                
                State.charts.dateSummary.data.labels = labels;
                State.charts.dateSummary.data.datasets[0].data = mcData;
                State.charts.dateSummary.data.datasets[1].data = kgData;
                State.charts.dateSummary.update('active');
                
                // Update date summary list
                this.updateDateSummaryList(dailyData, sortedDates);
            },

            updateDateSummaryList(dailyData, sortedDates) {
                const listContainer = document.getElementById('dateSummaryList');
                if (!listContainer) return;
                
                listContainer.innerHTML = sortedDates.map((date, index) => {
                    const data = dailyData[date];
                    return `
                        <div class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm animate-slideInRight" style="animation-delay: ${index * 0.05}s">
                            <div class="flex items-center">
                                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center mr-4 text-white font-bold text-sm">
                                    ${date.split('/')[0]}
                                </div>
                                <div>
                                    <div class="font-bold text-gray-800">${date}</div>
                                    <div class="text-sm text-gray-600">${data.entries} entries</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-black text-blue-600">${data.mc.toLocaleString()} MC</div>
                                <div class="font-bold text-green-600">${data.kg.toLocaleString()} kg</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        };

        // ===== CODE BREAKDOWN MODULE =====
        const CodeBreakdown = {
            filteredCodes: [],
            currentPage: 1,
            itemsPerPage: 10,
            sortColumn: 'code',
            sortDirection: 'asc',

            updateSection() {
                if (!State.stockData.length) return;
                
                this.processCodeData();
                this.updateStats();
                this.populateFilters();
                this.populateTable();
            },

            processCodeData() {
                // Group data by Brand first
                const brandGroups = {};
                
                State.stockData.forEach(row => {
                    const code = row[4]; // Product code
                    const brand = row[3]; // Brand
                    const product = row[1]; // Product name
                    const packaging = row[2]; // Packaging
                    const po = row[5]; // PO Number
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    const date = row[0]; // Date
                    
                    if (brand && brand !== '-' && code && code !== '-') {
                        if (!brandGroups[brand]) {
                            brandGroups[brand] = {
                                brand: brand,
                                po: po,
                                products: {},
                                totalMC: 0,
                                totalKG: 0,
                                productCount: 0
                            };
                        }
                        
                        // Group products within each Brand
                        if (!brandGroups[brand].products[code]) {
                            brandGroups[brand].products[code] = {
                                code: code,
                                brand: brand,
                                product: product,
                                packaging: packaging,
                                po: po,
                                mc: 0,
                                kg: 0,
                                breakdown: `${brand} : ${product} : ${packaging} : ${code}`
                            };
                            brandGroups[brand].productCount++;
                        }
                        
                        brandGroups[brand].products[code].mc += mc;
                        brandGroups[brand].products[code].kg += kg;
                        brandGroups[brand].totalMC += mc;
                        brandGroups[brand].totalKG += kg;
                    }
                });
                
                // Convert to array format for display
                this.filteredCodes = Object.values(brandGroups);
                this.sortCodes();
            },

            updateStats() {
                const totalBrands = this.filteredCodes.length;
                const totalProducts = this.filteredCodes.reduce((sum, brand) => sum + brand.productCount, 0);
                const totalMC = this.filteredCodes.reduce((sum, brand) => sum + brand.totalMC, 0);
                const totalKg = this.filteredCodes.reduce((sum, brand) => sum + brand.totalKG, 0);
                
                // Get unique products from all brands
                const uniqueProducts = new Set();
                this.filteredCodes.forEach(brand => {
                    Object.values(brand.products).forEach(product => {
                        uniqueProducts.add(product.product);
                    });
                });
                
                UI.animateNumber(document.getElementById('totalCodes'), totalBrands);
                UI.animateNumber(document.getElementById('uniqueCodeBrands'), uniqueProducts.size);
                UI.animateNumber(document.getElementById('codeTotalMC'), totalMC);
                UI.animateNumber(document.getElementById('codeTotalKg'), totalKg, 'kg');
            },

            populateFilters() {
                // Get brands from original stock data
                const brands = [...new Set(State.stockData.map(row => row[3]).filter(b => b && b !== '-'))].sort();
                
                // Get PO numbers from original stock data
                const pos = [...new Set(State.stockData.map(row => row[5]).filter(p => p && p !== '-'))].sort();
                
                const brandFilter = document.getElementById('codeFilterBrand');
                const poFilter = document.getElementById('codeFilterPO');
                
                if (brandFilter) {
                    brandFilter.innerHTML = '<option value="">All Brands</option>' + 
                        brands.map(b => `<option value="${b}">${b}</option>`).join('');
                }
                
                if (poFilter) {
                    poFilter.innerHTML = '<option value="">All PO Numbers</option>' + 
                        pos.map(p => `<option value="${p}">${p}</option>`).join('');
                }
                
                console.log("🔍 Code filters populated: ${brands.length} brands, ${pos.length} PO numbers");
            },

            searchCodes() {
                const searchTerm = document.getElementById('codeSearch')?.value?.toLowerCase() || '';
                const brandFilter = document.getElementById('codeFilterBrand')?.value || '';
                const poFilter = document.getElementById('codeFilterPO')?.value || '';
                
                console.log('🔍 Filtering Brands: search="${searchTerm}", brand="${brandFilter}", po="${poFilter}"');
                
                // Start with fresh data from stock
                let filteredStock = State.stockData;
                
                // Apply brand filter first
                if (brandFilter) {
                    filteredStock = filteredStock.filter(row => row[3] === brandFilter);
                }
                
                // Apply PO filter
                if (poFilter) {
                    filteredStock = filteredStock.filter(row => row[5] === poFilter);
                }
                
                // Group data by Brand
                const brandGroups = {};
                
                filteredStock.forEach(row => {
                    const code = row[4]; // Product code
                    const brand = row[3]; // Brand
                    const product = row[1]; // Product name
                    const packaging = row[2]; // Packaging
                    const po = row[5]; // PO Number
                    const mc = parseInt(row[6]) || 0;
                    const kg = parseFloat(row[7]) || 0;
                    const date = row[0]; // Date
                    
                    if (brand && brand !== '-' && code && code !== '-') {
                        if (!brandGroups[brand]) {
                            brandGroups[brand] = {
                                brand: brand,
                                po: po,
                                products: {},
                                totalMC: 0,
                                totalKG: 0,
                                productCount: 0
                            };
                        }
                        
                        // Group products within each Brand
                        if (!brandGroups[brand].products[code]) {
                            brandGroups[brand].products[code] = {
                                code: code,
                                brand: brand,
                                product: product,
                                packaging: packaging,
                                po: po,
                                mc: 0,
                                kg: 0,
                                breakdown: `${brand} : ${product} : ${packaging} : ${code}`
                            };
                            brandGroups[brand].productCount++;
                        }
                        
                        brandGroups[brand].products[code].mc += mc;
                        brandGroups[brand].products[code].kg += kg;
                        brandGroups[brand].totalMC += mc;
                        brandGroups[brand].totalKG += kg;
                    }
                });
                
                // Convert to array
                this.filteredCodes = Object.values(brandGroups);
                
                // Apply search term filter
                if (searchTerm) {
                    this.filteredCodes = this.filteredCodes.filter(brandGroup => {
                        // Search in brand name
                        if (brandGroup.brand.toLowerCase().includes(searchTerm)) return true;
                        
                        // Search in any product within the brand
                        return Object.values(brandGroup.products).some(product => {
                            return product.code.toLowerCase().includes(searchTerm) ||
                                   product.product.toLowerCase().includes(searchTerm) ||
                                   product.packaging.toLowerCase().includes(searchTerm) ||
                                   product.po.toLowerCase().includes(searchTerm);
                        });
                    });
                }
                
                this.sortCodes();
                this.currentPage = 1;
                this.updateStats();
                this.populateTable();
                
                console.log(`✅ Brand filtering complete: ${this.filteredCodes.length} brands found`);
            },

            filterCodes() {
                this.searchCodes(); // Use same logic as search
            },

            sortCodes() {
                this.filteredCodes.sort((a, b) => {
                    let aVal, bVal;
                    
                    switch (this.sortColumn) {
                        case 'brand':
                            aVal = a.brand;
                            bVal = b.brand;
                            break;
                        case 'po':
                            aVal = a.po;
                            bVal = b.po;
                            break;
                        case 'mc':
                            aVal = a.totalMC;
                            bVal = b.totalMC;
                            break;
                        case 'kg':
                            aVal = a.totalKG;
                            bVal = b.totalKG;
                            break;
                        case 'products':
                            aVal = a.productCount;
                            bVal = b.productCount;
                            break;
                        default:
                            aVal = a.brand;
                            bVal = b.brand;
                    }
                    
                    if (this.sortColumn === 'mc' || this.sortColumn === 'kg' || this.sortColumn === 'products') {
                        aVal = parseFloat(aVal) || 0;
                        bVal = parseFloat(bVal) || 0;
                    } else {
                        aVal = String(aVal).toLowerCase();
                        bVal = String(bVal).toLowerCase();
                    }
                    
                    if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
            },



            sortTable(column) {
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                
                this.filteredCodes.sort((a, b) => {
                    let aVal = a[column];
                    let bVal = b[column];
                    
                    if (column === 'mc' || column === 'kg') {
                        aVal = parseFloat(aVal) || 0;
                        bVal = parseFloat(bVal) || 0;
                    } else {
                        aVal = String(aVal).toLowerCase();
                        bVal = String(bVal).toLowerCase();
                    }
                    
                    if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                });
                
                this.populateTable();
            },

            populateTable() {
                const tbody = document.getElementById('codeTableBody');
                const mobileTable = document.getElementById('mobileCodeTable');
                
                const start = (this.currentPage - 1) * this.itemsPerPage;
                const end = Math.min(start + this.itemsPerPage, this.filteredCodes.length);
                const pageData = this.filteredCodes.slice(start, end);
                
                // Desktop table - now showing Brand groups
                if (tbody) {
                    tbody.innerHTML = pageData.map((brandGroup, index) => {
                        const productDetails = Object.values(brandGroup.products).map(product => 
                            `<div class="mb-2 p-2 bg-white rounded-lg border border-gray-200">
                                <div class="font-mono font-bold text-indigo-600 mb-1">${product.code}</div>
                                <div class="text-xs text-gray-600">
                                    <span class="badge-advanced badge-success text-xs mr-1">${product.po}</span>
                                    ${product.product} | ${product.packaging}
                                </div>
                                <div class="text-xs text-gray-700 mt-1">
                                    <span class="font-bold text-purple-600">${product.mc.toLocaleString()} MC</span> | 
                                    <span class="font-bold text-emerald-600">${product.kg.toLocaleString()} kg</span>
                                </div>
                            </div>`
                        ).join('');
                        
                        return `
                            <tr class="table-row animate-slideInUp" style="animation-delay: ${index * 0.05}s">
                                <td class="px-8 py-6 text-sm font-black text-indigo-600">${brandGroup.brand}</td>
                                <td class="px-8 py-6 text-sm font-mono font-bold text-gray-900">${brandGroup.po}</td>
                                <td class="px-8 py-6 text-sm text-blue-600 text-right font-black text-lg">${brandGroup.productCount}</td>
                                <td class="px-8 py-6 text-sm text-purple-600 text-right font-black text-lg">${brandGroup.totalMC.toLocaleString()}</td>
                                <td class="px-8 py-6 text-sm text-emerald-600 text-right font-black text-lg">${brandGroup.totalKG.toLocaleString()} kg</td>
                                <td class="px-8 py-6 text-sm">
                                    <div class="bg-gradient-to-r from-indigo-50 to-cyan-50 p-3 rounded-xl max-w-md max-h-64 overflow-y-auto">
                                        <div class="text-xs font-bold text-gray-600 mb-2">Products in this Brand:</div>
                                        ${productDetails}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
                
                // Mobile table - now showing Brand groups
                if (mobileTable) {
                    mobileTable.innerHTML = pageData.map((brandGroup, index) => {
                        const productList = Object.values(brandGroup.products).map(product => 
                            `<div class="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm mb-2">
                                <div>
                                    <div class="font-mono font-bold text-indigo-600">${product.code}</div>
                                    <div class="text-xs text-gray-600">
                                        <span class="badge-advanced badge-success text-xs">${product.po}</span>
                                    </div>
                                    <div class="text-xs text-gray-700">${product.product} | ${product.packaging}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-bold text-purple-600">${product.mc.toLocaleString()} MC</div>
                                    <div class="font-bold text-emerald-600">${product.kg.toLocaleString()} kg</div>
                                </div>
                            </div>`
                        ).join('');
                        
                        return `
                            <div class="mobile-table-card animate-slideInUp border-l-4 border-indigo-500" style="animation-delay: ${index * 0.05}s">
                                <!-- Brand Header -->
                                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg mb-4">
                                    <div class="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Brand Summary</div>
                                    <div class="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span class="text-xs text-gray-500 font-semibold">Brand Name:</span>
                                            <div class="font-black text-indigo-600">${brandGroup.brand}</div>
                                        </div>
                                        <div>
                                            <span class="text-xs text-gray-500 font-semibold">PO Number:</span>
                                            <div class="font-mono font-bold text-gray-800">${brandGroup.po}</div>
                                        </div>
                                        <div>
                                            <span class="text-xs text-gray-500 font-semibold">Products:</span>
                                            <div class="font-bold text-blue-600">${brandGroup.productCount} items</div>
                                        </div>
                                        <div>
                                            <span class="text-xs text-gray-500 font-semibold">Total:</span>
                                            <div class="font-bold text-purple-600">${brandGroup.totalMC.toLocaleString()} MC</div>
                                            <div class="font-bold text-emerald-600">${brandGroup.totalKG.toLocaleString()} kg</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Product Details -->
                                <div class="bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg">
                                    <div class="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Product Details</div>
                                    <div class="max-h-64 overflow-y-auto">
                                        ${productList}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                
                this.updatePagination();
            },

            updatePagination() {
                const total = this.filteredCodes.length;
                const start = (this.currentPage - 1) * this.itemsPerPage + 1;
                const end = Math.min(this.currentPage * this.itemsPerPage, total);
                const maxPages = Math.ceil(total / this.itemsPerPage);
                
                const elements = {
                    showingStart: document.getElementById('codeShowingStart'),
                    showingEnd: document.getElementById('codeShowingEnd'),
                    totalRecords: document.getElementById('codeTotalRecords'),
                    pageInfo: document.getElementById('codePageInfo'),
                    firstBtn: document.getElementById('codeFirstBtn'),
                    prevBtn: document.getElementById('codePrevBtn'),
                    nextBtn: document.getElementById('codeNextBtn'),
                    lastBtn: document.getElementById('codeLastBtn')
                };
                
                if (elements.showingStart) elements.showingStart.textContent = total > 0 ? start : 0;
                if (elements.showingEnd) elements.showingEnd.textContent = end;
                if (elements.totalRecords) elements.totalRecords.textContent = total.toLocaleString();
                if (elements.pageInfo) elements.pageInfo.textContent = `${this.currentPage} / ${maxPages}`;
                
                if (elements.firstBtn) elements.firstBtn.disabled = this.currentPage <= 1;
                if (elements.prevBtn) elements.prevBtn.disabled = this.currentPage <= 1;
                if (elements.nextBtn) elements.nextBtn.disabled = this.currentPage >= maxPages;
                if (elements.lastBtn) elements.lastBtn.disabled = this.currentPage >= maxPages;
            },

            resetFilters() {
                const elements = {
                    codeSearch: document.getElementById('codeSearch'),
                    codeFilterBrand: document.getElementById('codeFilterBrand'),
                    codeFilterPO: document.getElementById('codeFilterPO')
                };
                
                Object.values(elements).forEach(el => {
                    if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
                });
                
                this.currentPage = 1;
                this.updateSection();
                
                Utils.showNotification('info', '🔄 Code filters reset');
            },

            exportToPDF() {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF('landscape');
                    
                    // Header
                    doc.setFontSize(20);
                    doc.setFont(undefined, 'bold');
                    doc.text('Brand Breakdown kode', 20, 20);
                    
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 20, 30);
                    doc.text(`Total Brands: ${this.filteredCodes.length}`, 20, 35);
                    doc.text(`User: ${State.currentUser?.name || 'Unknown'}`, 20, 40);
                    
                    // Summary stats
                    const totalMC = this.filteredCodes.reduce((sum, brand) => sum + brand.totalMC, 0);
                    const totalKg = this.filteredCodes.reduce((sum, brand) => sum + brand.totalKG, 0);
                    const totalProducts = this.filteredCodes.reduce((sum, brand) => sum + brand.productCount, 0);
                    
                    doc.text(`Total MC: ${totalMC.toLocaleString()}`, 150, 30);
                    doc.text(`Total Weight: ${totalKg.toLocaleString()} kg`, 150, 35);
                    doc.text(`Total Products: ${totalProducts}`, 150, 40);
                    
                    // Table data - Brand summary
                    const tableData = this.filteredCodes.map(brandGroup => [
                        brandGroup.brand, brandGroup.po, brandGroup.productCount.toString(),
                        brandGroup.totalMC.toLocaleString(), brandGroup.totalKG.toLocaleString() + ' kg'
                    ]);
                    
                    doc.autoTable({
                        head: [['Brand Name', 'PO Number', 'Products', 'Total MC', 'Total Weight']],
                        body: tableData,
                        startY: 50,
                        styles: { 
                            fontSize: 10,
                            cellPadding: 4
                        },
                        headStyles: { 
                            fillColor: [79, 70, 229],
                            textColor: 255,
                            fontStyle: 'bold'
                        },
                        alternateRowStyles: {
                            fillColor: [245, 247, 250]
                        }
                    });
                    
                    // Add detailed breakdown for each Brand
                    let currentY = doc.lastAutoTable.finalY + 20;
                    
                    this.filteredCodes.forEach((brandGroup, index) => {
                        if (currentY > 180) { // Start new page if needed
                            doc.addPage();
                            currentY = 20;
                        }
                        
                        // Brand Header
                        doc.setFontSize(14);
                        doc.setFont(undefined, 'bold');
                        doc.text(`Brand: ${brandGroup.brand} (PO: ${brandGroup.po})`, 20, currentY);
                        currentY += 10;
                        
                        // Product details table
                        const productData = Object.values(brandGroup.products).map(product => [
                            product.code, product.po, product.product, product.packaging,
                            product.mc.toLocaleString(), product.kg.toLocaleString() + ' kg'
                        ]);
                        
                        doc.autoTable({
                            head: [['Code', 'PO Number', 'Product', 'Packaging', 'MC', 'Weight']],
                            body: productData,
                            startY: currentY,
                            styles: { 
                                fontSize: 8,
                                cellPadding: 2
                            },
                            headStyles: { 
                                fillColor: [99, 102, 241],
                                textColor: 255,
                                fontStyle: 'bold'
                            },
                            margin: { left: 30, right: 30 }
                        });
                        
                        currentY = doc.lastAutoTable.finalY + 15;
                    });
                    
                    // Footer
                    const pageCount = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
                        doc.text('Breakdown Kode - PPIC', 20, doc.internal.pageSize.height - 10);
                    }
                    
                    doc.save(`brand-breakdown-${new Date().toISOString().split('T')[0]}.pdf`);
                    Utils.showNotification('success', '✅ Brand breakdown PDF exported successfully!');
                    
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    Utils.showNotification('error', '❌ Failed to generate PDF report');
                }
            },

            changeItemsPerPage() {
                const select = document.getElementById('codeItemsPerPage');
                if (select) {
                    this.itemsPerPage = parseInt(select.value);
                    this.currentPage = 1;
                    this.populateTable();
                }
            },

            firstPage() {
                this.currentPage = 1;
                this.populateTable();
            },

            previousPage() {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.populateTable();
                }
            },

            nextPage() {
                const maxPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
                if (this.currentPage < maxPages) {
                    this.currentPage++;
                    this.populateTable();
                }
            },

            lastPage() {
                const maxPages = Math.ceil(this.filteredCodes.length / this.itemsPerPage);
                this.currentPage = maxPages;
                this.populateTable();
            }
        };

        // ===== ENHANCED EXPORT MODULE =====
        const Export = {
            toPDF() {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF('landscape');
                    
                    // Header
                    doc.setFontSize(20);
                    doc.setFont(undefined, 'bold');
                    doc.text('Dashboard Stok Produk - WKB', 20, 20);
                    
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'normal');
                    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 20, 30);
                    doc.text(`Total Records: ${State.filteredData.length}`, 20, 35);
                    doc.text(`User: ${State.currentUser?.name || 'Unknown'}`, 20, 40);
                    
                    // Summary stats
                    const totalMC = State.filteredData.reduce((sum, row) => sum + (parseInt(row[6]) || 0), 0);
                    const totalKg = State.filteredData.reduce((sum, row) => sum + (parseFloat(row[7]) || 0), 0);
                    
                    doc.text(`Total MC: ${totalMC.toLocaleString()}`, 150, 30);
                    doc.text(`Total Weight: ${totalKg.toLocaleString()} kg`, 150, 35);
                    
                    // Table data
                    const tableData = State.filteredData.map(row => [
                        row[0], row[1], row[2], row[3], row[4], row[5], 
                        row[6].toLocaleString(), row[7].toLocaleString() + ' kg', row[8]
                    ]);
                    
                    doc.autoTable({
                        head: [['Date', 'Product', 'Packaging', 'Brand', 'Code', 'PO Number', 'MC Qty', 'Weight', 'Location']],
                        body: tableData,
                        startY: 50,
                        styles: { 
                            fontSize: 8,
                            cellPadding: 3
                        },
                        headStyles: { 
                            fillColor: [59, 130, 246],
                            textColor: 255,
                            fontStyle: 'bold'
                        },
                        alternateRowStyles: {
                            fillColor: [245, 247, 250]
                        }
                    });
                    
                    // Footer
                    const pageCount = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
                        doc.text('Dashboard wkb - Stock Management', 20, doc.internal.pageSize.height - 10);
                    }
                    
                    doc.save(`dashboard-wkb-report-${new Date().toISOString().split('T')[0]}.pdf`);
                    Utils.showNotification('success', '✅ PDF report generated successfully!');
                    
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    Utils.showNotification('error', '❌ Failed to generate PDF report');
                }
            },

            toExcel() {
                try {
                    const wb = XLSX.utils.book_new();
                    
                    // Main data sheet
                    const wsData = [
                        ['Date', 'Product', 'Packaging', 'Brand', 'Code', 'PO Number', 'MC Qty', 'Weight (kg)', 'Location'],
                        ...State.filteredData
                    ];
                    
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    
                    // Set column widths
                    ws['!cols'] = [
                        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
                        { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }
                    ];
                    
                    XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');
                    
                    
               // Summary sheet
                    const brandSummary = {};
                    State.filteredData.forEach(row => {
                        const brand = row[3];
                        if (!brandSummary[brand]) {
                            brandSummary[brand] = { mc: 0, kg: 0 };
                        }
                        brandSummary[brand].mc += parseInt(row[6]) || 0;
                        brandSummary[brand].kg += parseFloat(row[7]) || 0;
                    });
                    
                    const summaryData = [
                        ['Brand', 'Total MC', 'Total Weight (kg)'],
                        ...Object.entries(brandSummary).map(([brand, data]) => [
                            brand, data.mc, data.kg
                        ])
                    ];
                    
                    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
                    XLSX.utils.book_append_sheet(wb, wsSummary, 'Brand Summary');
                    
                    XLSX.writeFile(wb, `dashboard-v49-export-${new Date().toISOString().split('T')[0]}.xlsx`);
                    Utils.showNotification('success', '✅ Excel file exported successfully!');
                    
                } catch (error) {
                    console.error('Error generating Excel:', error);
                    Utils.showNotification('error', '❌ Failed to generate Excel file');
                }
            }
        };

        // ===== ENHANCED UTILITIES MODULE =====
        const Utils = {
            formatDate(dateValue) {
                if (!dateValue) return '';
                
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                    return dateValue;
                }
                
                if (typeof dateValue === 'number') {
                    const date = XLSX.SSF.parse_date_code(dateValue);
                    if (date) {
                        const day = String(date.d).padStart(2, '0');
                        const month = String(date.m).padStart(2, '0');
                        const year = date.y;
                        return `${day}/${month}/${year}`;
                    }
                }
                
                try {
                    const date = new Date(dateValue);
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                    }
                } catch (e) {
                    console.warn('Date parsing error:', e);
                }
                
                return String(dateValue);
            },

            parseDate(dateString) {
                if (!dateString) return new Date(0);
                
                if (dateString.includes('/')) {
                    const [day, month, year] = dateString.split('/');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
                
                return new Date(dateString);
            },

            showNotification(type, message) {
                // Notifications disabled
                console.log(`${type.toUpperCase()}: ${message}`);
            },

            setCurrentTime() {
                const updateTime = () => {
                    const now = new Date();
                    const timeString = now.toLocaleTimeString('id-ID');
                    
                    const timeElements = document.querySelectorAll('#currentTime');
                    timeElements.forEach(el => {
                        if (el) el.textContent = timeString;
                    });
                };
                
                updateTime();
                setInterval(updateTime, 1000);
            },



            generateSessionId() {
                return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            },

            updateLastUpdateTime() {
    const el = document.getElementById('lastUpdateTime');
    if (!el) return;

    const rawDate = State.targetDate;
    if (!rawDate) {
        el.textContent = 'Belum ada tanggal update';
        return;
    }

    const date = new Date(rawDate);
    if (isNaN(date)) {
        el.textContent = `Update: ${rawDate}`; // fallback
    } else {
        const formatted = date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        el.textContent = `Update: ${formatted}`;
    }
}
        };

        // ===== PERFORMANCE MONITORING MODULE =====
        const Performance = {
            startTracking() {
                console.log('📊 Performance tracking started');
                
                // Monitor memory usage
                if ('memory' in performance) {
                    setInterval(() => {
                        const memory = performance.memory;
                        console.log(`Memory: ${(memory.usedJSHeapSize / 1048576).toFixed(2)}MB used`);
                    }, 60000); // Every minute
                }
                
                // Monitor page load performance
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        console.log(`Page load: ${perfData.loadEventEnd - perfData.fetchStart}ms`);
                    }, 0);
                });
            }
        };

        // ===== GLOBAL FUNCTIONS =====
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

        // ===== INITIALIZATION =====
        document.addEventListener('DOMContentLoaded', function() {
            console.log(`🚀 Initializing Dashboard v${CONFIG.VERSION} - Advanced Stock Management System`);
            console.log('Features enabled:', CONFIG.FEATURES);
            
            Auth.init();
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'e':
                            e.preventDefault();
                            Export.toPDF();
                            break;
                        case 'f':
                            e.preventDefault();
                            const searchInput = document.getElementById('searchProduct');
                            if (searchInput) searchInput.focus();
                            break;
                    }
                }
                
                // Close search results on Escape
                if (e.key === 'Escape') {
                    const searchResults = document.getElementById('searchResults');
                    if (searchResults) {
                        searchResults.classList.remove('show');
                    }
                }
            });
            
            // Close search results when clicking outside
            document.addEventListener('click', (e) => {
                const searchContainer = document.querySelector('.search-container');
                const searchResults = document.getElementById('searchResults');
                
                if (searchResults && !searchContainer?.contains(e.target)) {
                    searchResults.classList.remove('show');
                }
            });
            
            console.log('✅ Dashboard v49 initialization complete');
        });        
        
        