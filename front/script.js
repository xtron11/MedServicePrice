// script.js

const { createApp } = Vue;

const POPULAR_SUGGESTIONS = [
    "Общий анализ крови",
    "Биохимический анализ крови",
    "МРТ головного мозга",
    "МРТ позвоночника",
    "УЗИ брюшной полости",
    "УЗИ сердца (ЭхоКГ)",
    "Прием терапевта",
    "Прием кардиолога"
];

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

// Глобальная константа координат
const CITY_CENTERS = {
    'Алматы': { lat: 43.2389, lng: 76.8897 },
    'Астана': { lat: 51.1693, lng: 71.4491 },
    'Караганда': { lat: 49.8019, lng: 73.1021 },
    'Шымкент': { lat: 42.3249, lng: 69.5901 },
    'Актобе': { lat: 50.2839, lng: 57.1669 },
    'Атырау': { lat: 47.0945, lng: 51.9054 },
    'Актау': { lat: 43.6481, lng: 51.1722 },
    'Павлодар': { lat: 52.3001, lng: 76.9504 },
    'Уральск': { lat: 51.2333, lng: 51.3667 },
    'Усть-Каменогорск': { lat: 49.9501, lng: 82.6167 },
    'Тараз': { lat: 42.9000, lng: 71.3667 },
    'Семей': { lat: 50.4111, lng: 80.2501 },
    'Костанай': { lat: 53.2144, lng: 63.6244 },
    'Кызылорда': { lat: 44.8488, lng: 65.4822 },
    'Темиртау': { lat: 50.0544, lng: 72.9644 },
    'Кокшетау': { lat: 53.2833, lng: 69.4000 },
    'Балхаш': { lat: 46.8500, lng: 74.9667 },
    'Абай': { lat: 49.6333, lng: 72.8500 },
    'Сарань': { lat: 49.7917, lng: 72.8583 },
    'Шахтинск': { lat: 49.7111, lng: 72.5861 }
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

function safeParseDate(dateStr) {
    if (!dateStr) return new Date();
    const match = String(dateStr).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (match) {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

createApp({
    data() {
        return {
            searchQuery: '',
            services: [],
            suggestions: POPULAR_SUGGESTIONS,
            isLoading: false,
            hasSearched: false, 
            isDarkMode: false,
            isLogoHovered: false,
            
            isModalOpen: false,
            selectedClinicName: '',
            selectedServiceItem: null,
            
            isAboutModalOpen: false,
            
            subscriptionForm: {
                type: 'email',
                value: '',
                condition: 'drop',
                agreed: true
            },
            subscriptionSuccess: false,
            activeSubscriptions: [],
            
            filters: {
                city: 'Алматы',
                category: '',
                minPrice: null,
                maxPrice: null,
                minRating: 0,
                onlineBooking: false,
                searchType: 'service'
            },
            sortBy: 'price_asc',

            userLatitude: null,
            userLongitude: null,
            isLocating: false,
            geoToast: {
                show: false,
                city: ''
            },

            comparisonList: [],
            isCompareModalOpen: false,
            isMobileFiltersOpen: false,
            isCityDropdownOpen: false,
            isCityModalOpen: false,
            isCityConfirmModalOpen: false,
            detectedCity: 'Караганда',
            citySearchQuery: '',
            availableCities: ['Алматы', 'Астана', 'Караганда', 'Шымкент', 'Актобе', 'Атырау', 'Актау', 'Павлодар', 'Уральск', 'Усть-Каменогорск', 'Тараз', 'Семей', 'Костанай', 'Кызылорда', 'Темиртау', 'Кокшетау', 'Балхаш', 'Абай', 'Сарань', 'Шахтинск'],
            
            isApiSettingsModalOpen: false,
            tempApiUrl: localStorage.getItem('med_api_url') || 'http://127.0.0.1:8000',
            apiUrl: localStorage.getItem('med_api_url') || 'http://127.0.0.1:8000',
            isApiConnected: false,
            categoriesList: [
                { value: 'laboratory', label: 'Лаборатория' },
                { value: 'doctor', label: 'Приём врача' },
                { value: 'diagnostics', label: 'Диагностика' },
                { value: 'procedure', label: 'Процедура' }
            ],

            popularServices: [
                { name: "Общий анализ крови", icon: "fa-droplet" },
                { name: "МРТ головного мозга", icon: "fa-brain" },
                { name: "УЗИ брюшной полости", icon: "fa-stethoscope" },
                { name: "Прием терапевта", icon: "fa-user-doctor" },
                { name: "УЗИ сердца (ЭхоКГ)", icon: "fa-heart-pulse" }
            ],

            viewMode: 'list',
            map: null,

            notification: {
                show: false,
                title: '',
                message: '',
                type: 'warning'
            },
            notificationTimeout: null
        }
    },
    computed: {
        filteredAndSortedServices() {
            let result = this.services.filter(item => {
                if (item.city !== this.filters.city) return false;
                
                if (this.filters.category) {
                    const catVal = this.filters.category.toLowerCase().trim();
                    const itemCat = (item.category || '').toLowerCase().trim();
                    
                    const catMapping = {
                        'laboratory': ['laboratory', 'лаборатория', 'анализы', 'анализ'],
                        'doctor': ['doctor', 'прием врача', 'приём врача', 'врач', 'консультация', 'прием'],
                        'diagnostics': ['diagnostics', 'диагностика', 'мрт/кт', 'узи', 'мрт', 'кт', 'рентген'],
                        'procedure': ['procedure', 'процедура', 'процедуры', 'капельница', 'укол']
                    };
                    
                    const allowed = catMapping[catVal] || [catVal];
                    const isMatched = allowed.some(a => itemCat.includes(a) || a.includes(itemCat));
                    if (!isMatched) return false;
                }
                
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
                    case 'date': return safeParseDate(b.last_updated) - safeParseDate(a.last_updated);
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
            
            const sortedPrices = [...prices].sort((a, b) => a - b);
            const mid = Math.floor(sortedPrices.length / 2);
            const medianPrice = sortedPrices.length % 2 !== 0 
                ? sortedPrices[mid] 
                : Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2);
            
            const cheapest = this.filteredAndSortedServices.reduce((min, item) => item.price < min.price ? item : min, this.filteredAndSortedServices[0]);
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
        },
        filteredModalCities() {
            if (!this.citySearchQuery) return this.availableCities;
            const query = this.citySearchQuery.toLowerCase().trim();
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
            const date = safeParseDate(dateString);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('ru-RU', options);
        },
        getLatestParsingDate() {
            if (!this.filteredAndSortedServices || this.filteredAndSortedServices.length === 0) {
                return null;
            }
            
            let latestDate = null;
            let latestTime = 0;
            
            for (const item of this.filteredAndSortedServices) {
                const dateStr = item.last_updated;
                if (!dateStr) continue;
                
                const date = safeParseDate(dateStr);
                if (date && !isNaN(date.getTime())) {
                    if (date.getTime() > latestTime) {
                        latestTime = date.getTime();
                        latestDate = date;
                    }
                }
            }
            
            if (latestDate) {
                const options = { day: 'numeric', month: 'long', year: 'numeric' };
                return latestDate.toLocaleDateString('ru-RU', options);
            }
            
            return null;
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
            localStorage.setItem('selected_city', city);
            localStorage.setItem('city_confirmed', 'true');
            this.isCityConfirmModalOpen = false;
            if (this.hasSearched) {
                this.searchServices();
            }
        },
        confirmGuessedCity(isCorrect) {
            if (isCorrect) {
                localStorage.setItem('selected_city', this.detectedCity);
                localStorage.setItem('city_confirmed', 'true');
                this.filters.city = this.detectedCity;
                this.isCityConfirmModalOpen = false;
                this.showNotification("Город подтвержден", `Выбран город ${this.detectedCity}`, "success");
                if (this.hasSearched) {
                    this.searchServices();
                }
            } else {
                this.isCityConfirmModalOpen = false;
                this.openCityModal();
            }
        },
        openCityModal() {
            this.isCityModalOpen = true;
            this.citySearchQuery = '';
        },
        selectCityFromModal(city) {
            this.selectCity(city);
            this.isCityModalOpen = false;
        },
        confirmGeoCity() {
            localStorage.setItem('selected_city', this.filters.city);
            this.geoToast.show = false;
            this.showNotification("Город подтвержден", `Выбран город ${this.filters.city}`, "success");
            if (this.hasSearched) {
                this.searchServices();
            }
        },
        changeGeoCity() {
            this.geoToast.show = false;
            this.openCityModal();
        },
        openApiSettingsModal() {
            this.isApiSettingsModalOpen = true;
            this.tempApiUrl = this.apiUrl;
        },
        async testAndSaveApiSettings() {
            let url = this.tempApiUrl.trim();
            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }
            if (!url) {
                this.showNotification("Ошибка", "Адрес API не может быть пустым", "error");
                return;
            }

            this.showNotification("Проверка...", "Тестирование подключения к API...", "info");
            
            MedicalApi.setBaseUrl(url);
            const isConnected = await MedicalApi.testConnection();
            
            this.apiUrl = url;
            if (isConnected) {
                this.isApiConnected = true;
                this.isApiSettingsModalOpen = false;
                this.showNotification("Успешно!", "Соединение с API установлено. Изменения сохранены.", "success");
                
                await this.testApiConnection();
                if (this.hasSearched) {
                    this.searchServices();
                }
            } else {
                this.isApiConnected = false;
                this.showNotification("Сохранено с предупреждением", "Адрес сохранен, но бэкенд недоступен или заблокирован. Используется локальная база.", "warning");
            }
        },
        resetApiSettingsToDefault() {
            const defaultUrl = 'http://127.0.0.1:8000';
            this.tempApiUrl = defaultUrl;
            this.apiUrl = defaultUrl;
            MedicalApi.setBaseUrl(defaultUrl);
            this.isApiConnected = false;
            this.showNotification("Сброшено", "Адрес API сброшен на стандартный. Включен демонстрационный режим.", "info");
        },
        
        getClinicCoordinates(clinicName, cityName, address = '') {
            const center = CITY_CENTERS[cityName] || CITY_CENTERS['Караганда'];
            let baseLat = center.lat;
            let baseLng = center.lng;
            
            const addressHash = address ? address.toLowerCase().trim() : '';
            
            if (cityName === 'Караганда') {
                if (addressHash.includes('гоголя') && addressHash.includes('41')) {
                    return { lat: 49.811565, lng: 73.099195 };
                }
                if (addressHash.includes('сейфуллина') && addressHash.includes('17')) {
                    return { lat: 49.792842, lng: 73.080536 };
                }
                if (addressHash.includes('гоголя') && (addressHash.includes('50/1') || addressHash.includes('50 / 1'))) {
                    return { lat: 49.8111, lng: 73.0864 };
                }
            }
            
            const clinicHash = clinicName.toLowerCase().trim();
            if (cityName === 'Караганда') {
                if (clinicHash.includes('олимп') || clinicHash.includes('olymp')) {
                    baseLat = 49.8077; baseLng = 73.0885;
                } else if (clinicHash.includes('invivo') || clinicHash.includes('инвиво')) {
                    baseLat = 49.8032; baseLng = 73.0841;
                } else if (clinicHash.includes('инвитро') || clinicHash.includes('invitro')) {
                    // ИСПРАВЛЕНИЕ МАРКЕРА ИНВИТРО: принудительно задаем координаты Гоголя 41
                    baseLat = 49.811565; baseLng = 73.099195;
                } else if (clinicHash.includes('гиппократ') || clinicHash.includes('hippokrat')) {
                    baseLat = 49.8091; baseLng = 73.1012;
                }
            } else if (cityName === 'Астана') {
                if (clinicHash.includes('олимп') || clinicHash.includes('olymp')) {
                    baseLat = 51.1605; baseLng = 71.4302;
                } else if (clinicHash.includes('invivo') || clinicHash.includes('инвиво')) {
                    baseLat = 51.1555; baseLng = 71.4422;
                } else if (clinicHash.includes('инвитро') || clinicHash.includes('invitro')) {
                    baseLat = 51.1685; baseLng = 71.4255;
                }
            } else if (cityName === 'Алматы') {
                if (clinicHash.includes('олимп') || clinicHash.includes('olymp')) {
                    baseLat = 43.2425; baseLng = 76.9012;
                } else if (clinicHash.includes('invivo') || clinicHash.includes('инвиво')) {
                    baseLat = 43.2312; baseLng = 76.8795;
                } else if (clinicHash.includes('инвитро') || clinicHash.includes('invitro')) {
                    baseLat = 43.2515; baseLng = 76.9150;
                }
            } else {
                let hash = 0;
                for (let i = 0; i < clinicName.length; i++) {
                    hash = clinicName.charCodeAt(i) + ((hash << 5) - hash);
                }
                const latOffset = ((Math.abs(hash) % 100) / 4000) - 0.0125;
                const lngOffset = (((Math.abs(hash) >> 8) % 100) / 4000) - 0.0125;
                baseLat = center.lat + latOffset;
                baseLng = center.lng + lngOffset;
            }

            if (address) {
                let h = 0;
                for (let i = 0; i < address.length; i++) {
                    h = address.charCodeAt(i) + ((h << 5) - h);
                }
                const latOffset = ((Math.abs(h) % 100) / 20000) - 0.0025;
                const lngOffset = (((Math.abs(h) >> 8) % 100) / 20000) - 0.0025;
                return {
                    lat: baseLat + latOffset,
                    lng: baseLng + lngOffset
                };
            }

            return { lat: baseLat, lng: baseLng };
        },
        
        async geocodeAddress(address, city) {
            const addressClean = address.toLowerCase().trim();
            const cityClean = city.toLowerCase().trim();

            if (cityClean === 'караганда') {
                // ИСПРАВЛЕНИЕ МАРКЕРА ИНВИТРО: если парсер присылает Гоголя 43, перехватываем и ставим 41
                if (addressClean.includes('гоголя') && (addressClean.includes('41') || addressClean.includes('43'))) {
                    return { lat: 49.811565, lng: 73.099195 };
                }
                if (addressClean.includes('сейфуллина') && addressClean.includes('17')) {
                    return { lat: 49.792842, lng: 73.080536 };
                }
                if (addressClean.includes('гоголя') && (addressClean.includes('50/1') || addressClean.includes('50 / 1'))) {
                    return { lat: 49.8111, lng: 73.0864 };
                }
                if (addressClean.includes('алиханова') && addressClean.includes('2')) {
                    return { lat: 49.8082, lng: 73.0898 };
                }
                if (addressClean.includes('бухар') && addressClean.includes('45')) {
                    return { lat: 49.8055, lng: 73.0872 };
                }
                if (addressClean.includes('шахтеров') && addressClean.includes('21')) {
                    return { lat: 49.7825, lng: 73.1415 };
                }
                if (addressClean.includes('строителей') && addressClean.includes('28')) {
                    return { lat: 49.7891, lng: 73.1294 };
                }
                if (addressClean.includes('кривогуза') && addressClean.includes('10')) {
                    return { lat: 49.7984, lng: 73.0722 };
                }
                if (addressClean.includes('ерубаева') && addressClean.includes('48')) {
                    return { lat: 49.8050, lng: 73.0880 };
                }
            }
            
            if (cityClean === 'алматы') {
                if (addressClean.includes('толе би') && addressClean.includes('99')) {
                    return { lat: 43.2514, lng: 76.9298 };
                }
                if (addressClean.includes('абая') && addressClean.includes('10')) {
                    return { lat: 43.2425, lng: 76.9535 };
                }
            }

            try {
                let searchStr = address.replace(/(кабинет|офис|этаж|блок|бутик|квартира)\s*\d+/gi, '').trim();
                
                const cleanPhrases = [
                    `г. ${cityClean}`, `г.${cityClean}`, `город ${cityClean}`, cityClean,
                    'казахстан', 'республика казахстан', 'republic of kazakhstan'
                ];
                cleanPhrases.forEach(phrase => {
                    const escapedPhrase = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`(^|[^a-яА-ЯёЁa-zA-Z0-9])(${escapedPhrase})(?![a-яА-ЯёЁa-zA-Z0-9])`, 'gi');
                    searchStr = searchStr.replace(regex, '$1');
                });
                
                searchStr = searchStr.replace(/^[,\s.]+/, '').replace(/[,\s.]+$/, '').replace(/,\s*,/g, ',').trim();
                
                if (!searchStr) {
                    searchStr = address.replace(/(кабинет|офис|этаж|блок|бутик|квартира)\s*\d+/gi, '').trim();
                }

                const query = `${city}, ${searchStr}`;
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
                
                const res = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'MedServicePriceApp/1.0'
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        
                        const center = CITY_CENTERS[city] || CITY_CENTERS['Караганда'];
                        const dist = this.getDistance(lat, lng, center.lat, center.lng);
                        
                        if (dist > 30) {
                            console.warn(`Геокодированный адрес слишком далеко. Игнорируем.`);
                            return null;
                        }
                        
                        return { lat, lng };
                    }
                }
            } catch (e) {
                console.warn("Dynamic OSM geocoding failed, keeping local fallback coordinates:", e.message);
            }

            return null;
        },

        async geocodeAllServices() {
            const geocodeCache = {};

            for (let i = 0; i < this.services.length; i++) {
                const item = this.services[i];
                const address = item.address;
                const city = this.filters.city;
                
                if (!address || address === 'Казахстан') continue;

                const cacheKey = `${city}_${address}`;
                if (geocodeCache[cacheKey]) {
                    const coords = geocodeCache[cacheKey];
                    item.lat = coords.lat;
                    item.lng = coords.lng;
                    continue;
                }

                const coords = await this.geocodeAddress(address, city);
                if (coords) {
                    geocodeCache[cacheKey] = coords;
                    item.lat = coords.lat;
                    item.lng = coords.lng;
                    
                    if (this.viewMode === 'map' && this.map) {
                        this.initMap();
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        },
        
        getDistance(lat1, lon1, lat2, lon2) {
            if (!lat1 || !lon1 || !lat2 || !lon2) return null;
            const R = 6371; 
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c; 
            return Math.round(d * 10) / 10;
        },

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
                    this.showNotification("Ошибка геопозиции", "Не удалось получить местоположение.", "error");
                    this.isLocating = false;
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        },

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
        
        openModal(item) {
            this.selectedClinicName = item.clinic;
            this.selectedServiceItem = item;
            
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

        openAboutModal() {
            this.isAboutModalOpen = true;
            document.body.style.overflow = 'hidden'; 
        },
        closeAboutModal() {
            this.isAboutModalOpen = false;
            if (!this.isModalOpen) document.body.style.overflow = ''; 
        },
        
        handleSubscribe() {
            const contactValue = this.subscriptionForm.value.trim();
            if (!contactValue) {
                this.showNotification("Ошибка ввода", "Пожалуйста, введите ваши контактные данные для подписки!", "error");
                return;
            }
            
            if (this.subscriptionForm.type === 'email') {
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                if (!emailRegex.test(contactValue)) {
                    this.showNotification("Неверный E-mail", "Пожалуйста, укажите корректный адрес электронной почты!", "error");
                    return;
                }
            } else if (this.subscriptionForm.type === 'telegram') {
                let username = contactValue;
                if (!username.startsWith('@')) {
                    username = '@' + username;
                }
                const telegramRegex = /^@[a-zA-Z0-9_]{3,32}$/;
                if (!telegramRegex.test(username)) {
                    this.showNotification("Неверный Telegram", "Никнейм должен начинаться с @ и содержать от 3 до 32 символов!", "error");
                    return;
                }
                this.subscriptionForm.value = username; 
            }

            if (!this.subscriptionForm.agreed) {
                this.showNotification("Согласие", "Необходимо согласиться на обработку персональных данных!", "warning");
                return;
            }
            
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
                    "Пожалуйста, введите название услуги.",
                    "warning"
                );
                return;
            }
            
            this.isLoading = true;
            this.hasSearched = true; 
            this.services = []; 

            const query = this.searchQuery.trim();

            const data = await MedicalApi.searchServices({
                query,
                city: getLatinCity(this.filters.city),
                category: this.filters.category,
                minPrice: this.filters.minPrice,
                maxPrice: this.filters.maxPrice
            });

            if (data && Array.isArray(data)) {
                this.services = data.map((item, index) => {
                    const clinicName = item.clinic || item.clinic_name || 'Клиника';
                    let cityName = item.city ? (CITY_MAP[item.city.toLowerCase()] || (item.city.charAt(0).toUpperCase() + item.city.slice(1))) : '';
                    
                    if (!cityName && item.address) {
                        const addrLower = item.address.toLowerCase();
                        for (const [latin, cyr] of Object.entries(CITY_MAP)) {
                            const root = cyr.slice(0, -1).toLowerCase(); 
                            if (addrLower.includes(root)) {
                                cityName = cyr;
                                break;
                            }
                        }
                    }
                    
                    if (!cityName) {
                        cityName = this.filters.city || 'Алматы';
                    }
                    
                    let lat = null;
                    let lng = null;
                    
                    const addressStr = (item.address || '').toLowerCase();
                    if (cityName === 'Караганда' || addressStr.includes('караганд')) {
                        if (addressStr.includes('гоголя') && addressStr.includes('41')) {
                            lat = 49.811565;
                            lng = 73.099195;
                        } else if (addressStr.includes('сейфуллина') && addressStr.includes('17')) {
                            lat = 49.792842;
                            lng = 73.080536;
                        } else if (addressStr.includes('гоголя') && (addressStr.includes('50/1') || addressStr.includes('50 / 1'))) {
                            lat = 49.8111;
                            lng = 73.0864;
                        }
                    }
                    
                    if (!lat || !lng) {
                        lat = item.lat || item.latitude || null;
                        lng = item.lng || item.longitude || null;
                    }
                    
                    if (!lat || !lng) {
                        const calculated = this.getClinicCoordinates(clinicName, cityName, item.address || '');
                        lat = calculated.lat;
                        lng = calculated.lng;
                    }

                    return {
                        id: item.id || index + 1000,
                        clinic: clinicName,
                        category: item.category || 'Общее',
                        service_name: item.service_name || item.name || 'Медицинская услуга',
                        city: cityName,
                        address: item.address || 'Казахстан',
                        price: Number(item.price) || 0,
                        website_url: item.website_url || '#',
                        rating: Number(item.rating) || 4.5,
                        working_hours: item.working_hours || '08:00 - 18:00',
                        phone: item.phone || '+7 (700) 000-00-00',
                        last_updated: item.last_updated || new Date().toISOString().split('T')[0],
                        has_online_booking: item.has_online_booking || item.online_booking || false,
                        lat,
                        lng,
                        price_history: item.price_history || [item.price]
                    };
                });
                
                this.isLoading = false;
                if (this.viewMode === 'map') {
                    this.initMap();
                }
                this.geocodeAllServices();
                return;
            }

            this.services = [];
            this.isLoading = false;
            this.showNotification(
                "Результаты поиска",
                "Не удалось получить предложения с сервера.",
                "info"
            );
        },

        toggleViewMode(mode) {
            this.viewMode = mode;
            if (mode === 'map') {
                this.initMap();
            }
        },

        async testApiConnection() {
            try {
                const citiesData = await MedicalApi.getCities();
                if (citiesData && Array.isArray(citiesData)) {
                    const mappedCities = citiesData.map(latinName => {
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
            } catch (e) {
                console.warn("Ошибка при получении списка городов:", e);
            }
            await this.fetchCategories();
        },

        async fetchCities() {
            await this.testApiConnection();
        },

        async detectUserLocation() {
            const saved = localStorage.getItem('selected_city');
            const isConfirmed = localStorage.getItem('city_confirmed') === 'true';
            
            if (saved && this.availableCities.includes(saved)) {
                this.filters.city = saved;
                if (isConfirmed) {
                    return;
                }
            }

            let detected = 'Караганда';
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const res = await fetch('https://ip-api.com/json/', { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.city) {
                        const englishCity = data.city.toLowerCase().trim();
                        let cyrillicCity = '';
                        for (const [latin, cyr] of Object.entries(CITY_MAP)) {
                            if (latin === englishCity || englishCity.includes(latin) || latin.includes(englishCity)) {
                                cyrillicCity = cyr;
                                break;
                            }
                        }
                        if (cyrillicCity && this.availableCities.includes(cyrillicCity)) {
                            detected = cyrillicCity;
                        }
                    }
                }
            } catch (e) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);
                    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
                    clearTimeout(timeoutId);
                    
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.city) {
                            const englishCity = data.city.toLowerCase().trim();
                            let cyrillicCity = '';
                            for (const [latin, cyr] of Object.entries(CITY_MAP)) {
                                if (latin === englishCity || englishCity.includes(latin) || latin.includes(englishCity)) {
                                    cyrillicCity = cyr;
                                    break;
                                }
                            }
                            if (cyrillicCity && this.availableCities.includes(cyrillicCity)) {
                                detected = cyrillicCity;
                            }
                        }
                    }
                } catch (err) {}
            }

            this.detectedCity = detected;
            this.filters.city = detected;

            if (!isConfirmed) {
                this.isCityConfirmModalOpen = true;
            }
        },

        async fetchCategories() {
            const categories = await MedicalApi.getCategories();
            if (categories && Array.isArray(categories) && categories.length > 0) {
                this.categoriesList = categories;
            }
        },

        async fetchSuggestions() {
            const query = (this.searchQuery || '').trim();
            try {
                const suggestions = await MedicalApi.getSuggestions(query);
                if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
                    this.suggestions = suggestions;
                    return;
                }
            } catch (e) { }
            
            if (!query) {
                this.suggestions = POPULAR_SUGGESTIONS;
            } else {
                const lowerQuery = query.toLowerCase();
                this.suggestions = POPULAR_SUGGESTIONS.filter(s => s.toLowerCase().includes(lowerQuery));
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
                
                const currentCity = this.filters.city || 'Караганда';
                const cityCenter = CITY_CENTERS[currentCity] || CITY_CENTERS['Караганда'];
                let center = [cityCenter.lat, cityCenter.lng];
                
                if (this.filteredAndSortedServices.length > 0) {
                    const first = this.filteredAndSortedServices[0];
                    if (first.lat && first.lng) {
                        const distToFirst = this.getDistance(first.lat, first.lng, cityCenter.lat, cityCenter.lng);
                        if (distToFirst < 40) {
                            center = [first.lat, first.lng];
                        }
                    }
                }
                
                // Зум поднят до 14, чтобы сразу было лучше видно улицы
                this.map = L.map('map-container', { attributionControl: false }).setView(center, 14);
                
                // ИНТЕГРАЦИЯ 2GIS: Используем точные тайлы
                const tileUrl = 'https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1';
                
                L.tileLayer(tileUrl, {
                    subdomains: ['0', '1', '2', '3'],
                    maxZoom: 19,
                    attribution: '&copy; <a href="https://2gis.kz">2GIS</a>'
                }).addTo(this.map);
                
                const addedCoordinates = [];
                const validMarkers = [];

                this.filteredAndSortedServices.forEach(item => {
                    if (item.lat && item.lng) {
                        let latitude = parseFloat(item.lat);
                        let longitude = parseFloat(item.lng);
                        if (isNaN(latitude) || isNaN(longitude)) return;

                        const distanceToCenter = this.getDistance(latitude, longitude, cityCenter.lat, cityCenter.lng);
                        if (distanceToCenter > 40) {
                            const fallback = this.getClinicCoordinates(item.clinic, currentCity, item.address || '');
                            latitude = fallback.lat;
                            longitude = fallback.lng;
                        }

                        const coordKey = `${latitude.toFixed(5)}_${longitude.toFixed(5)}`;
                        if (addedCoordinates.includes(coordKey)) {
                            latitude += (Math.random() - 0.5) * 0.00015;
                            longitude += (Math.random() - 0.5) * 0.00015;
                        }
                        addedCoordinates.push(`${latitude.toFixed(5)}_${longitude.toFixed(5)}`);
                        validMarkers.push([latitude, longitude]);

                        let iconHtml = '';
                        const catLower = (item.category || '').toLowerCase();
                        if (catLower.includes('лаборатор') || catLower.includes('анализ') || catLower.includes('lab')) {
                            iconHtml = '<i class="fa-solid fa-flask text-xs"></i>';
                        } else if (catLower.includes('врач') || catLower.includes('прием') || catLower.includes('doc')) {
                            iconHtml = '<i class="fa-solid fa-user-doctor text-xs"></i>';
                        } else if (catLower.includes('диагност') || catLower.includes('узи') || catLower.includes('мрт') || catLower.includes('diag')) {
                            iconHtml = '<i class="fa-solid fa-heart-pulse text-xs"></i>';
                        } else if (catLower.includes('процедур') || catLower.includes('укол') || catLower.includes('proc')) {
                            iconHtml = '<i class="fa-solid fa-syringe text-xs"></i>';
                        } else {
                            iconHtml = '<i class="fa-solid fa-house-medical text-xs"></i>';
                        }

                        const customIcon = L.divIcon({
                            html: `
                                <div class="relative flex items-center justify-center">
                                    <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 dark:bg-blue-400/20 animate-ping" style="animation-duration: 3s;"></div>
                                    <div class="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] border-2 border-white dark:border-slate-800 hover:scale-110 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all cursor-pointer">
                                        ${iconHtml}
                                    </div>
                                </div>
                            `,
                            className: 'custom-leaflet-marker',
                            iconSize: [36, 36],
                            iconAnchor: [18, 36],
                            popupAnchor: [0, -36]
                        });

                        const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(this.map);
                        const popupContent = `
                            <div class="p-1 min-w-[210px] dark:text-slate-200">
                                <h4 class="font-extrabold text-slate-900 dark:text-white text-sm mb-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all line-clamp-2" onclick="window.dispatchEvent(new CustomEvent('show-clinic-details', {detail: '${item.id}'}))">${item.clinic}</h4>
                                <p class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold mb-2 cursor-pointer underline transition-all line-clamp-2" onclick="window.dispatchEvent(new CustomEvent('show-clinic-details', {detail: '${item.id}'}))">${item.service_name}</p>
                                <div class="text-sm font-black text-slate-900 dark:text-slate-100 mb-1.5">Цена: <span class="text-blue-600 dark:text-blue-400 font-black">${this.formatPrice(item.price)} ₸</span></div>
                                <div class="text-[10px] text-slate-500 dark:text-slate-400 mb-3 flex items-start gap-1">
                                    <span>📍</span>
                                    <span class="line-clamp-2">${item.address}</span>
                                </div>
                                <button onclick="window.dispatchEvent(new CustomEvent('show-clinic-details', {detail: '${item.id}'}))" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20 hover:shadow-md">
                                    Подробнее и Контакты
                                </button>
                            </div>
                        `;
                        marker.bindPopup(popupContent);
                    }
                });

                if (validMarkers.length > 0) {
                    const bounds = L.latLngBounds(validMarkers);
                    this.map.fitBounds(bounds, { padding: [40, 40] });
                }
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
        
        this.testApiConnection();
        this.fetchSuggestions();
        this.detectUserLocation();

        document.addEventListener('click', (e) => {
            const container = document.getElementById('city-selector-container');
            if (container && !container.contains(e.target)) {
                this.isCityDropdownOpen = false;
            }
        });

        window.addEventListener('show-clinic-details', (e) => {
            const clinicId = e.detail;
            const item = this.services.find(s => String(s.id) === String(clinicId));
            if (item) {
                this.openModal(item);
            }
        });
    }
}).mount('#app');