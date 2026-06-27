// script.js

const { createApp } = Vue;

const CITY_MAP = {
    'abay': 'Абай',
    'aktau': 'Актау',
    'aktobe': 'Актобе',
    'almaty': 'Алматы',
    'astana': 'Астана',
    'atyrau': 'Атырау',
    'balkhash': 'Балхаш',
    'karaganda': 'Караганда',
    'kokshetau': 'Кокшетау',
    'kostanay': 'Костанай',
    'kyzylorda': 'Кызылорда',
    'pavlodar': 'Павлодар',
    'saran': 'Сарань',
    'semey': 'Семей',
    'shakhtinsk': 'Шахтинск',
    'shymkent': 'Шымкент',
    'taraz': 'Тараз',
    'temirtau': 'Темиртау',
    'uralsk': 'Уральск',
    'ust-kamenogorsk': 'Усть-Каменогорск'
};

function getLatinCity(cyrillicName) {
    if (!cyrillicName) return '';
    const nameLower = cyrillicName.toLowerCase().trim();
    for (const [latin, cyr] of Object.entries(CITY_MAP)) {
        if (cyr.toLowerCase() === nameLower) {
            return latin;
        }
    }
    return cyrillicName.toLowerCase();
}

createApp({
    data() {
        return {
            searchQuery: '',
            services: [],
            suggestions: typeof MOCK_SUGGESTIONS !== 'undefined' ? MOCK_SUGGESTIONS : [], 
            isLoading: false,
            hasSearched: false, 
            isDarkMode: false,
            
            // Модальное окно контактов и подписки
            isModalOpen: false,
            selectedClinicName: '',
            selectedServiceItem: null, // объект выбранной услуги (для подписки)
            
            // Состояние модального окна "О проекте"
            isAboutModalOpen: false,
            
            // Поля формы подписки
            subscriptionForm: {
                type: 'email',      // 'email' или 'telegram'
                value: '',          // email или @username
                condition: 'drop',  // 'any' (любое изменение) или 'drop' (только снижение)
                agreed: true
            },
            subscriptionSuccess: false,
            
            // Список активных подписок пользователя (сохраняется в localStorage)
            activeSubscriptions: [],
            
            filters: {
                city: 'Караганда',
                category: '',
                minPrice: null,
                maxPrice: null,
                minRating: 0,
                onlineBooking: false
            },
            sortBy: 'price_asc',

            // Геолокация
            userLatitude: null,
            userLongitude: null,
            isLocating: false,

            // Сравнение клиник
            comparisonList: [],
            isCompareModalOpen: false,
            isMobileFiltersOpen: false,
            isCityDropdownOpen: false,
            availableCities: ['Караганда', 'Астана', 'Алматы'],
            
            // Настройки подключения к реальному API бэкенда (Swagger FastAPI)
            apiUrl: localStorage.getItem('med_api_url') || 'http://127.0.0.1:8000',
            isApiConnected: false,
            categoriesList: ['Анализы', 'МРТ/КТ', 'УЗИ', 'Прием врача'],

            // Популярные услуги для быстрого поиска на главной
            popularServices: [
                { name: "Общий анализ крови", icon: "fa-droplet" },
                { name: "МРТ головного мозга", icon: "fa-brain" },
                { name: "УЗИ брюшной полости", icon: "fa-stethoscope" },
                { name: "Прием терапевта", icon: "fa-user-doctor" },
                { name: "УЗИ сердца (ЭхоКГ)", icon: "fa-heart-pulse" }
            ],

            // Режим отображения (список или карта)
            viewMode: 'list',
            map: null,

            // Уведомления
            notification: {
                show: false,
                title: '',
                message: '',
                type: 'warning' // 'warning', 'info', 'success', 'error'
            },
            notificationTimeout: null
        }
    },
    computed: {
        filteredAndSortedServices() {
            let result = this.services.filter(item => {
                if (item.city !== this.filters.city) return false;
                if (this.filters.category && item.category !== this.filters.category) return false;
                if (this.filters.minPrice && item.price < this.filters.minPrice) return false;
                if (this.filters.maxPrice && item.price > this.filters.maxPrice) return false;
                if (item.rating < this.filters.minRating) return false;
                if (this.filters.onlineBooking && !item.has_online_booking) return false;
                
                return true;
            });

            return result.sort((a, b) => {
                switch (this.sortBy) {
                    case 'price_asc': return a.price - b.price;
                    case 'price_desc': return b.price - a.price;
                    case 'rating': return b.rating - a.rating;
                    case 'date': return new Date(b.last_updated) - new Date(a.last_updated);
                    case 'distance': 
                        if (this.userLatitude && this.userLongitude) {
                            const distA = this.getDistance(this.userLatitude, this.userLongitude, a.lat, a.lng) || 99999;
                            const distB = this.getDistance(this.userLatitude, this.userLongitude, b.lat, b.lng) || 99999;
                            return distA - distB;
                        }
                        return a.price - b.price;
                    default: return 0;
                }
            });
        },
        serviceStats() {
            if (!this.filteredAndSortedServices || this.filteredAndSortedServices.length === 0) return null;
            const prices = this.filteredAndSortedServices.map(x => x.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            // Вычисляем медиану цен вместо простого среднего арифметического
            const sortedPrices = [...prices].sort((a, b) => a - b);
            const mid = Math.floor(sortedPrices.length / 2);
            const medianPrice = sortedPrices.length % 2 !== 0 
                ? sortedPrices[mid] 
                : Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2);
            
            // Находим самое выгодное предложение
            const cheapest = this.filteredAndSortedServices.reduce((min, item) => item.price < min.price ? item : min, this.filteredAndSortedServices[0]);
            
            // Экономия (разница между макс и мин)
            const potentialSavings = maxPrice - minPrice;
            
            return {
                minPrice,
                maxPrice,
                medianPrice,
                cheapestClinic: cheapest.clinic,
                cheapestPrice: cheapest.price,
                potentialSavings
            };
        },
        filteredCities() {
            if (!this.filters.city) return this.availableCities;
            const query = this.filters.city.toLowerCase().trim();
            return this.availableCities.filter(city => city.toLowerCase().includes(query));
        }
    },
    watch: {
        filteredAndSortedServices() {
            if (this.viewMode === 'map') {
                this.initMap();
            }
        },
        'filters.city'() {
            if (this.viewMode === 'map') {
                this.initMap();
            }
        },
        searchQuery(val) {
            if (this.searchDebounce) clearTimeout(this.searchDebounce);
            this.searchDebounce = setTimeout(() => {
                this.fetchSuggestions();
            }, 300);
        }
    },
    methods: {
        showNotification(title, message, type = 'warning') {
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
            }
            this.notification.title = title;
            this.notification.message = message;
            this.notification.type = type;
            this.notification.show = true;
            
            this.notificationTimeout = setTimeout(() => {
                this.notification.show = false;
            }, 5000);
        },
        formatPrice(price) {
            return price.toLocaleString('ru-RU');
        },
        formatDate(dateString) {
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            return new Date(dateString).toLocaleDateString('ru-RU', options);
        },
        toggleTheme() {
            this.isDarkMode = !this.isDarkMode;
            localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
            
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        
        goHome() {
            this.hasSearched = false;
            this.searchQuery = '';
            this.services = [];
            this.comparisonList = [];
        },
        selectCity(city) {
            this.filters.city = city;
            this.isCityDropdownOpen = false;
        },
        
        // Расчет расстояния по формуле гаверсинусов (Haversine Formula)
        getDistance(lat1, lon1, lat2, lon2) {
            if (!lat1 || !lon1 || !lat2 || !lon2) return null;
            const R = 6371; // Радиус Земли в км
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c; 
            return Math.round(d * 10) / 10; // Округление до 1 знака после запятой
        },

        // Запрос геопозиции пользователя
        requestLocation() {
            if (!navigator.geolocation) {
                this.showNotification("Ошибка геопозиции", "Геолокация не поддерживается вашим браузером", "error");
                return;
            }
            this.isLocating = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLatitude = position.coords.latitude;
                    this.userLongitude = position.coords.longitude;
                    this.isLocating = false;
                    this.showNotification("Геопозиция определена", "Ваше местоположение успешно получено. Теперь доступна сортировка по расстоянию!", "success");
                },
                (error) => {
                    console.error(error);
                    this.showNotification("Ошибка геопозиции", "Не удалось получить местоположение. Пожалуйста, разрешите доступ к геоданным в настройках браузера.", "error");
                    this.isLocating = false;
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        },

        // Логика сравнения клиник (добавить/удалить)
        toggleComparison(item) {
            const index = this.comparisonList.findIndex(x => x.id === item.id);
            if (index > -1) {
                this.comparisonList.splice(index, 1);
                this.showNotification("Сравнение", "Предложение удалено из списка сравнения.", "info");
            } else {
                this.comparisonList.push(item);
                this.showNotification("Сравнение", "Предложение добавлено в список сравнения.", "success");
            }
        },

        isInComparison(item) {
            return this.comparisonList.some(x => x.id === item.id);
        },

        removeFromComparison(id) {
            this.comparisonList = this.comparisonList.filter(x => x.id !== id);
            this.showNotification("Сравнение", "Предложение удалено из списка сравнения.", "info");
        },

        clearComparison() {
            this.comparisonList = [];
            this.showNotification("Сравнение", "Список сравнения полностью очищен.", "info");
        },

        openCompareModal() {
            if (this.comparisonList.length < 2) {
                this.showNotification("Мало предложений", "Выберите как минимум 2 предложения для полноценного сравнения.", "warning");
                return;
            }
            this.isCompareModalOpen = true;
            document.body.style.overflow = 'hidden';
        },

        closeCompareModal() {
            this.isCompareModalOpen = false;
            document.body.style.overflow = '';
        },

        openMobileFilters() {
            this.isMobileFiltersOpen = true;
            document.body.style.overflow = 'hidden';
        },

        closeMobileFilters() {
            this.isMobileFiltersOpen = false;
            document.body.style.overflow = '';
        },

        activeFiltersCount() {
            let count = 0;
            if (this.filters.category) count++;
            if (this.filters.minPrice !== null && this.filters.minPrice !== '') count++;
            if (this.filters.maxPrice !== null && this.filters.maxPrice !== '') count++;
            if (this.filters.onlineBooking) count++;
            return count;
        },

        resetFilters() {
            this.filters.category = '';
            this.filters.minPrice = null;
            this.filters.maxPrice = null;
            this.filters.onlineBooking = false;
            this.showNotification("Фильтры сброшены", "Все настройки фильтрации возвращены к исходным.", "info");
        },
        
        // Открытие модального окна контактов и подписки
        openModal(item) {
            this.selectedClinicName = item.clinic;
            this.selectedServiceItem = item;
            
            // Сброс формы подписки
            this.subscriptionForm.value = '';
            this.subscriptionForm.type = 'email';
            this.subscriptionForm.condition = 'drop';
            this.subscriptionForm.agreed = true;
            this.subscriptionSuccess = false;
            
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden'; 
        },
        closeModal() {
            this.isModalOpen = false;
            this.selectedClinicName = '';
            this.selectedServiceItem = null;
            if (!this.isAboutModalOpen) document.body.style.overflow = ''; 
        },

        // Модалка "О проекте"
        openAboutModal() {
            this.isAboutModalOpen = true;
            document.body.style.overflow = 'hidden'; 
        },
        closeAboutModal() {
            this.isAboutModalOpen = false;
            if (!this.isModalOpen) document.body.style.overflow = ''; 
        },
        
        // Логика оформления подписки на уведомления
        handleSubscribe() {
            const contactValue = this.subscriptionForm.value.trim();
            if (!contactValue) {
                this.showNotification("Ошибка ввода", "Пожалуйста, введите ваши контактные данные для подписки!", "error");
                return;
            }
            
            if (this.subscriptionForm.type === 'email') {
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(contactValue)) {
                    this.showNotification("Неверный E-mail", "Пожалуйста, укажите корректный адрес электронной почты (например: client@mail.ru)!", "error");
                    return;
                }
            } else if (this.subscriptionForm.type === 'telegram') {
                let username = contactValue;
                if (!username.startsWith('@')) {
                    username = '@' + username;
                }
                const telegramRegex = /^@[a-zA-Z0-9_]{3,32}$/;
                if (!telegramRegex.test(username)) {
                    this.showNotification("Неверный Telegram", "Никнейм должен начинаться с @ и содержать от 3 до 32 символов (латиница, цифры, подчеркивания)!", "error");
                    return;
                }
                this.subscriptionForm.value = username; // Сохраняем исправленный вариант с @
            }

            if (!this.subscriptionForm.agreed) {
                this.showNotification("Согласие", "Необходимо согласиться на обработку персональных данных!", "warning");
                return;
            }
            
            // Создаем новую запись подписки
            const newSub = {
                id: Date.now(),
                clinicName: this.selectedClinicName,
                serviceName: this.selectedServiceItem.service_name,
                category: this.selectedServiceItem.category,
                priceAtSubscription: this.selectedServiceItem.price,
                type: this.subscriptionForm.type,
                contactValue: this.subscriptionForm.value,
                condition: this.subscriptionForm.condition,
                city: this.selectedServiceItem.city,
                date: new Date().toLocaleDateString('ru-RU')
            };
            
            this.activeSubscriptions.push(newSub);
            this.saveSubscriptions();
            
            this.subscriptionSuccess = true;
            this.showNotification(
                "Подписка оформлена", 
                `Вы успешно подписались на уведомления об изменении цены для услуги "${this.selectedServiceItem.service_name}"!`, 
                "success"
            );
        },
        
        // Удаление активной подписки
        removeSubscription(subId) {
            this.activeSubscriptions = this.activeSubscriptions.filter(s => s.id !== subId);
            this.saveSubscriptions();
        },
        
        saveSubscriptions() {
            localStorage.setItem('med_subscriptions', JSON.stringify(this.activeSubscriptions));
        },
        
        loadSubscriptions() {
            const saved = localStorage.getItem('med_subscriptions');
            if (saved) {
                try {
                    this.activeSubscriptions = JSON.parse(saved);
                } catch (e) {
                    this.activeSubscriptions = [];
                }
            }
        },

        selectPopularService(name) {
            this.searchQuery = name;
            this.searchServices();
        },

        async searchServices() {
            if (!this.searchQuery.trim()) {
                this.showNotification(
                    "Укажите медицинскую услугу",
                    "Пожалуйста, введите название услуги или выберите подсказку (например: Общий анализ крови, УЗИ, МРТ) для выполнения поиска.",
                    "warning"
                );
                return;
            }
            
            this.isLoading = true;
            this.hasSearched = true; 
            this.services = []; 

            const query = this.searchQuery.trim();

            // Если реальное API подключено, делаем запрос к бэкенду
            if (this.isApiConnected) {
                try {
                    const params = new URLSearchParams();
                    params.append('query', query);
                    if (this.filters.city) {
                        params.append('city', getLatinCity(this.filters.city));
                    }
                    if (this.filters.category) {
                        params.append('category', this.filters.category);
                    }
                    if (this.filters.minPrice !== null && this.filters.minPrice !== '') {
                        params.append('min_price', this.filters.minPrice);
                    }
                    if (this.filters.maxPrice !== null && this.filters.maxPrice !== '') {
                        params.append('max_price', this.filters.maxPrice);
                    }

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    
                    const response = await fetch(`${this.apiUrl}/api/search?${params.toString()}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data)) {
                            // Маппим данные с бэкенда для обеспечения 100% совместимости с интерфейсом
                            this.services = data.map((item, index) => ({
                                id: item.id || index + 1000,
                                clinic: item.clinic || item.clinic_name || 'Клиника',
                                category: item.category || 'Общее',
                                service_name: item.service_name || item.name || 'Медицинская услуга',
                                city: item.city ? (CITY_MAP[item.city.toLowerCase()] || (item.city.charAt(0).toUpperCase() + item.city.slice(1))) : (this.filters.city || 'Караганда'),
                                address: item.address || 'Казахстан',
                                price: Number(item.price) || 0,
                                website_url: item.website_url || '#',
                                rating: Number(item.rating) || 4.5,
                                working_hours: item.working_hours || '08:00 - 18:00',
                                phone: item.phone || '+7 (700) 000-00-00',
                                last_updated: item.last_updated || new Date().toISOString().split('T')[0],
                                has_online_booking: item.has_online_booking || item.online_booking || false,
                                lat: item.lat || item.latitude || null,
                                lng: item.lng || item.longitude || null,
                                price_history: item.price_history || [item.price]
                            }));
                            
                            this.isLoading = false;
                            if (this.viewMode === 'map') {
                                this.initMap();
                            }
                            return; // Выходим при успешном поиске
                        }
                    }
                } catch (e) {
                    console.warn("Backend API search failed, falling back to local database:", e);
                }
            }

            // РЕЗЕРВНЫЙ ДЕМО-РЕЖИМ (Фронтенд-поиск по MOCK_SERVICES)
            setTimeout(() => {
                const lowerQuery = query.toLowerCase();
                const safeQuery = lowerQuery.replace(/ь/g, ''); 
                
                this.services = MOCK_SERVICES.filter(item => 
                    item.service_name.toLowerCase().includes(safeQuery) ||
                    item.clinic.toLowerCase().includes(safeQuery) ||
                    item.category.toLowerCase().includes(safeQuery)
                );
                
                this.isLoading = false;
                if (this.viewMode === 'map') {
                    this.initMap();
                }
            }, 400);
        },

        toggleViewMode(mode) {
            this.viewMode = mode;
            if (mode === 'map') {
                this.initMap();
            }
        },

        // --- МЕТОДЫ ИНТЕГРАЦИИ С РЕАЛЬНЫМ API БЭКЕНДА (FASTAPI) ---
        async testApiConnection() {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3500);
                
                const res = await fetch(`${this.apiUrl}/api/cities`, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    this.isApiConnected = true;
                    const data = await res.json();
                    
                    if (data && data.cities && Array.isArray(data.cities)) {
                        const mappedCities = data.cities.map(latinName => {
                            const mapped = CITY_MAP[latinName.toLowerCase()];
                            return mapped || (latinName.charAt(0).toUpperCase() + latinName.slice(1));
                        });
                        
                        if (mappedCities.length > 0) {
                            this.availableCities = mappedCities;
                            if (!this.availableCities.includes(this.filters.city)) {
                                this.filters.city = this.availableCities[0];
                            }
                        }
                    }
                    
                    await this.fetchCategories();
                } else {
                    this.isApiConnected = false;
                }
            } catch (e) {
                console.warn("FastAPI backend is offline or unreachable:", e);
                this.isApiConnected = false;
            }
        },

        async fetchCities() {
            await this.testApiConnection();
        },

        async fetchCategories() {
            try {
                const res = await fetch(`${this.apiUrl}/api/categories`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        this.categoriesList = data;
                    }
                }
            } catch (e) {
                console.warn("fetchCategories error:", e);
            }
        },

        async fetchSuggestions() {
            if (!this.searchQuery.trim()) {
                this.suggestions = typeof MOCK_SUGGESTIONS !== 'undefined' ? MOCK_SUGGESTIONS : [];
                return;
            }
            if (this.isApiConnected) {
                try {
                    const query = encodeURIComponent(this.searchQuery.trim());
                    const res = await fetch(`${this.apiUrl}/api/suggest?q=${query}&query=${query}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) {
                            this.suggestions = data;
                        }
                    }
                } catch (e) {
                    console.warn("fetchSuggestions error:", e);
                }
            }
        },

        initMap() {
            this.$nextTick(() => {
                const mapContainer = document.getElementById('map-container');
                if (!mapContainer) return;
                
                if (this.map) {
                    this.map.remove();
                    this.map = null;
                }
                
                // Центр карты по умолчанию
                let center = [49.8019, 73.1021]; // Караганда
                if (this.filters.city === 'Астана') center = [51.1693, 71.4491];
                else if (this.filters.city === 'Алматы') center = [43.2389, 76.8897];
                else if (this.filteredAndSortedServices.length > 0) {
                    const first = this.filteredAndSortedServices[0];
                    if (first.lat && first.lng) {
                        center = [first.lat, first.lng];
                    }
                }
                
                this.map = L.map('map-container').setView(center, 12);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(this.map);
                
                // Добавляем маркеры клиник
                this.filteredAndSortedServices.forEach(item => {
                    if (item.lat && item.lng) {
                        const marker = L.marker([item.lat, item.lng]).addTo(this.map);
                        const popupContent = `
                            <div class="p-2 min-w-[200px]">
                                <h4 class="font-bold text-slate-900 text-sm mb-1">${item.clinic}</h4>
                                <p class="text-xs text-blue-600 font-bold mb-1">${item.service_name}</p>
                                <div class="text-sm font-black text-slate-900 mb-1">Цена: ${this.formatPrice(item.price)} ₸</div>
                                <div class="text-[10px] text-slate-500 mb-2">📍 ${item.address}</div>
                                <button onclick="window.dispatchEvent(new CustomEvent('show-clinic-details', {detail: ${item.id}}))" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer">
                                    Подробнее и Контакты
                                </button>
                            </div>
                        `;
                        marker.bindPopup(popupContent);
                    }
                });
            });
        }
    },
    created() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            document.documentElement.classList.add('dark');
        }
        this.loadSubscriptions();
        
        // Тестируем соединение с реальным API бэкенда (FastAPI) при старте
        this.testApiConnection();

        // Закрытие выпадающего списка городов при клике вне его области
        document.addEventListener('click', (e) => {
            const container = document.getElementById('city-selector-container');
            if (container && !container.contains(e.target)) {
                this.isCityDropdownOpen = false;
            }
        });

        // Слушатель для открытия деталей из бабблов на карте
        window.addEventListener('show-clinic-details', (e) => {
            const clinicId = e.detail;
            const item = this.services.find(s => s.id === clinicId);
            if (item) {
                this.openModal(item);
            }
        });
    }
}).mount('#app');
