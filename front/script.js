// script.js

const { createApp } = Vue;

const CITY_MAP = {
    'abay': 'Абай',
    'akkol': 'Акколь',
    'akkiistau': 'Аккистау',
    'akmol': 'Акмол',
    'aksai': 'Аксай',
    'aksu': 'Аксу',
    'aksukent': 'Аксукент',
    'aktau': 'Актау',
    'aktobe': 'Актобе',
    'aktogay': 'Актогай',
    'alatau': 'Алатау',
    'alga': 'Алга',
    'almaty': 'Алматы',
    'altai': 'Алтай',
    'aralsk': 'Аральск',
    'arkalyk': 'Аркалык',
    'arshaly': 'Аршалы',
    'arys': 'Арыс',
    'ashchybulak': 'Ащыбулак',
    'asykata': 'Асыката',

    'astana': 'Астана',
    'astrakhanka': 'Астраханка',
    'atakent': 'Атакент',
    'atameken': 'Атамекен',
    'atbasar': 'Атбасар',
    'atyrau': 'Атырау',
    'auliekol': 'Аулиеколь',
    'ayagoz': 'Аягоз',

    'baisarke': 'Байсерке',
    'bakanas': 'Баканас',
    'baikonur': 'Байконур',
    'balkashino': 'Балкашино',
    'balkhash': 'Балхаш',
    'balpyk bi': 'Балпык Би',
    'bayanauyl': 'Баянауыл',
    'beineu': 'Бейнеу',
    'besagash': 'Бесагаш',
    'beskaragay': 'Бескарагай',
    'bishkul': 'Бишкуль',
    'boraldai': 'Боралдай',
    'bulaevo': 'Булаево',
    'chapai': 'Чапаев',
    'chingirlau': 'Чингирлау',
    'chundzha': 'Чунджа',
    'denisovka': 'Денисовка',
    'dossor': 'Доссор',

    'ekibastuz': 'Экибастуз',
    'emba': 'Эмба',
    'erkingala': 'Еркинкала',
    'esik': 'Есик',
    'esil': 'Есиль',
    'fedorovka': 'Федоровка',
    'glubokoe': 'Глубокое',
    'inder': 'Индер',
    'irgeli': 'Иргели',
    'irtyshsk': 'Иртышск',
    'jambyl': 'Жамбыл',
    'janatas': 'Жанатас',
    'zhalagash': 'Жалагаш',

    'zhanalaik': 'Жаналык',
    'zhanaarka': 'Жанаарка',
    'zhanaozen': 'Жанаозен',
    'zhanakorgan': 'Жанакорган',
    'zhansugurov': 'Жансугуров',
    'zharkent': 'Жаркент',
    'zhapek batyr': 'Жапек Батыр',
    'zhelezinka': 'Железинка',
    'zhezkazgan': 'Жезказган',
    'zhibek zholy': 'Жибек Жолы',
    'zhitikara': 'Житикара',
    'zhympity': 'Жымпиты',

    'kabanbai': 'Кабанбай',
    'kairat': 'Кайрат',
    'kalbatau': 'Калбатау',
    'kalininskoe': 'Калининское',
    'kandyagash': 'Кандыагаш',
    'karabalyk': 'Карабалык',
    'karabulak': 'Карабулак',
    'karaganda': 'Караганда',
    'karaoi': 'Караой',
    'karasai': 'Карасай',
    'karatau': 'Каратау',
    'karmakshi': 'Кармакшы',
    'kaskelen': 'Каскелен',
    'kasym kaisenov': 'Касым Кайсенов',

    'katon-karagai': 'Катон-Карагай',
    'kazaly': 'Казалы',
    'kazygurt': 'Казыгурт',
    'kenen azerbaev': 'Кенен Азербаев',
    'kentau': 'Кентау',
    'khromtau': 'Хромтау',
    'koksai': 'Коксай',
    'koksayek': 'Коксайек',
    'kokshetau': 'Кокшетау',
    'konaev': 'Конаев',
    'kordai': 'Кордай',
    'kosshyn': 'Косшын',
    'kostanay': 'Костанай',
    'kulan': 'Кулан',
    'kulsary': 'Кульсары',
    'kurmangazy': 'Курмангазы',
    'kyzylzhar': 'Кызылжар',
    'kyzylorda': 'Кызылорда',

    'lenger': 'Ленгер',
    'lisakovsk': 'Лисаковск',
    'makat': 'Макат',
    'makinsk': 'Макинск',
    'malaya churakovka': 'Малая Чураковка',
    'mamlyutka': 'Мамлютка',
    'mangistau': 'Мангистау',
    'makhambet': 'Махамбет',
    'mendykara': 'Мендыкара',
    'merke': 'Мерке',
    'miyaly': 'Миялы',
    'myrzakent': 'Мырзакент',

    'novoishimskoe': 'Новоишимское',
    'ordabasy': 'Ордабасы',
    'orkeniet': 'Оркениет',
    'otegen batyr': 'Отеген Батыр',
    'pavlodar': 'Павлодар',
    'petropavlovsk': 'Петропавловск',
    'presnovka': 'Пресновка',
    'raiymbek': 'Райымбек',
    'ridder': 'Риддер',
    'rudny': 'Рудный',
    's.podstepnoe': 'с. Подстепное',
    'sagyz': 'Сагыз',
    'saumalkol': 'Саумалколь',
    'saran': 'Сарань',
    'sarkan': 'Саркан',
    'saryagash': 'Сарыагаш',
    'sarykemer': 'Сарыкемер',
    'sarykol': 'Сарыколь',
    'saryozek': 'Сарыозек',
    'satpaev': 'Сатпаев',
    'semey': 'Семей',
    'sergeevka': 'Сергеевка',
    'shalkar': 'Шалкар',
    'shamalgan': 'Шамалган',
    'shanyrak': 'Шанырак',
    'shardara': 'Шардара',
    'shaulder': 'Шаульдер',
    'shayan': 'Шаян',
    'shakhtinsk': 'Шахтинск',
    'shubarkuduk': 'Шубаркудук',
    'shubarsu': 'Шубарсу',
    'shchuchinsk': 'Щучинск',
    'shelek': 'Шелек',
    'shemonaikha': 'Шемонаиха',
    'shetpe': 'Шетпе',
    'shieli': 'Шиели',
    'shortandy': 'Шортанды',
    'sholakorgan': 'Шолаккорган',
    'shu': 'Шу',
    'shymkent': 'Шымкент',
    'smirnovo': 'Смирново',
    'stepnogorsk': 'Степногорск',

    'taiynsha': 'Тайынша',
    'talapker': 'Талапкер',
    'taldykorgan': 'Талдыкорган',
    'talgar': 'Талгар',
    'taraz': 'Тараз',
    'taskala': 'Таскала',
    'tekeli': 'Текели',
    'temirtau': 'Темиртау',
    'terenkol': 'Теренколь',
    'terenozek': 'Теренозек',
    'tobyl': 'Тобыл',
    'tole bi': 'Толе Би',
    'turar ryskulov': 'Турар Рыскулов',
    'turkestan': 'Туркестан',
    'shcherbakty': 'Щербакты',

    'uarkhal': 'Уархал',
    'urdjar': 'Урджар',
    'ust-kamenogorsk': 'Усть-Каменогорск',
    'ushkonyr': 'Ушконыр',
    'ushtobe': 'Уштобе',
    'uzynagash': 'Узынагаш',
    'uzunkol': 'Узунколь',
    'yavlenka': 'Явленка',
    'yntymak': 'Ынтымак'
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
    // Handle DD.MM.YYYY
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
            suggestions: [],
            isSuggestionsOpen: false,
            isLoading: false,
            hasSearched: false, 
            isDarkMode: false,
            isLogoHovered: false,
            
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
                city: 'Алматы',
                category: '',
                minPrice: null,
                maxPrice: null,
                minRating: 0,
                onlineBooking: false,
                searchType: 'service' // 'service', 'doctor'
            },
            sortBy: 'price_asc',

            // Геолокация
            userLatitude: null,
            userLongitude: null,
            isLocating: false,
            geoToast: {
                show: false,
                city: ''
            },

            // Сравнение клиник
            comparisonList: [],
            isCompareModalOpen: false,
            isMobileFiltersOpen: false,
            isCityDropdownOpen: false,
            isCityModalOpen: false,
            isCityConfirmModalOpen: false,
            detectedCity: 'Караганда',
            citySearchQuery: '',
            availableCities: Array.from(new Set(Object.values(CITY_MAP))).sort((a, b) => a.localeCompare(b, 'ru')),
            
            // Настройки подключения к реальному API бэкенда (Swagger FastAPI)
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

            // Популярные услуги для быстрого поиска на главной
            popularServices: [
                { name: "Общий анализ крови", icon: "fa-droplet" },
                { name: "Общий анализ мочи", icon: "fa-vial" },
                { name: "Креатинин", icon: "fa-flask-vial" },
                { name: "Ферритин", icon: "fa-dna" },
                { name: "Глюкоза", query: "Глюкоза (кровь)", icon: "fa-flask" },
                { name: "Магний", query: "Магний (кровь)", icon: "fa-vial" },
                { name: "Холестерин", query: "Общий холестерин", icon: "fa-heart" },
                { name: "Терапевт", icon: "fa-user-doctor" }
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
                
                // Фильтрация по категории с гибким маппингом (поддерживает и русский, и английский)
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
        },
        filteredModalCities() {
            if (!this.citySearchQuery) return this.availableCities;
            const query = this.citySearchQuery.toLowerCase().trim();
            return this.availableCities.filter(city => city.toLowerCase().includes(query));
        }
    },
    watch: {
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
        formatFullAddress(city, address) {
            if (!address || address === 'Казахстан') return city ? `г. ${city}` : '';
            if (!city) return address;
            
            const cityLower = city.toLowerCase().trim();
            const addrLower = address.toLowerCase().trim();
            
            // Если адрес уже содержит название города (например "г. Караганда" или "Караганда")
            if (addrLower.includes(cityLower)) {
                return address;
            }
            
            return `г. ${city}, ${address}`;
        },
        formatPrice(price) {
            return price.toLocaleString('ru-RU');
        },
        formatDate(dateString) {
            const date = safeParseDate(dateString);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('ru-RU', options);
        },
        getHistoryDateLabel(index) {
            if (this.selectedServiceItem && this.selectedServiceItem.price_history_detailed && this.selectedServiceItem.price_history_detailed[index]) {
                const item = this.selectedServiceItem.price_history_detailed[index];
                if (item && item.date) {
                    const parts = item.date.split('-');
                    if (parts.length === 3) {
                        return `${parts[2]}.${parts[1]}`;
                    }
                    return item.date;
                }
            }
            return ['01.06', '10.06', '18.06', '26.06'][index] || '';
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
            
            // Настраиваем адрес в модуле API
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
                this.showNotification("Сохранено с предупреждением", "Адрес сохранен, но бэкенд недоступен или заблокирован (проверьте Mixed Content / CORS). Используется локальная демо-база данных.", "warning");
            }
        },
        resetApiSettingsToDefault() {
            const defaultUrl = 'http://127.0.0.1:8000';
            this.tempApiUrl = defaultUrl;
            this.apiUrl = defaultUrl;
            MedicalApi.setBaseUrl(defaultUrl);
            this.isApiConnected = false;
            this.showNotification("Сброшено", "Адрес API сброшен на стандартный http://127.0.0.1:8000. Включен демонстрационный режим.", "info");
        },
        
        // Получить реалистичные координаты для клиники, если они отсутствуют на бэкенде
        getClinicCoordinates(clinicName, cityName, address = '') {
            const cityCenters = {
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

            const center = cityCenters[cityName] || cityCenters['Караганда'];
            let baseLat = center.lat;
            let baseLng = center.lng;
            
            const addressHash = address ? address.toLowerCase().trim() : '';
            
            // Высокоточное геокодирование для ключевых адресов в Караганде
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
                    baseLat = 49.8055; baseLng = 73.0920;
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
                // Псевдослучайное детерминированное распределение на основе названия
                let hash = 0;
                for (let i = 0; i < clinicName.length; i++) {
                    hash = clinicName.charCodeAt(i) + ((hash << 5) - hash);
                }
                const latOffset = ((Math.abs(hash) % 100) / 4000) - 0.0125;
                const lngOffset = (((Math.abs(hash) >> 8) % 100) / 4000) - 0.0125;
                baseLat = center.lat + latOffset;
                baseLng = center.lng + lngOffset;
            }

            // Добавляем микросмещение на основе адреса, чтобы разные филиалы одного бренда не сливались на карте
            if (address) {
                let h = 0;
                for (let i = 0; i < address.length; i++) {
                    h = address.charCodeAt(i) + ((h << 5) - h);
                }
                const latOffset = ((Math.abs(h) % 100) / 20000) - 0.0025; // Очень легкое смещение до 200 метров
                const lngOffset = (((Math.abs(h) >> 8) % 100) / 20000) - 0.0025;
                return {
                    lat: baseLat + latOffset,
                    lng: baseLng + lngOffset
                };
            }

            return { lat: baseLat, lng: baseLng };
        },
        
        // Высокоточное динамическое геокодирование по тексту адреса через OSM Nominatim и локальный словарь
        async geocodeAddress(address, city) {
            const addressClean = address.toLowerCase().trim();
            const cityClean = city.toLowerCase().trim();

            // 1. Высокоточные хардкод-координаты для Караганды
            if (cityClean === 'караганда') {
                if (addressClean.includes('гоголя') && addressClean.includes('41')) {
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
            
            // 2. Высокоточные хардкод-координаты для Алматы
            if (cityClean === 'алматы') {
                if (addressClean.includes('толе би') && addressClean.includes('99')) {
                    return { lat: 43.2514, lng: 76.9298 };
                }
                if (addressClean.includes('абая') && addressClean.includes('10')) {
                    return { lat: 43.2425, lng: 76.9535 };
                }
            }

            // 3. Динамический запрос к Nominatim API
            try {
                // Очищаем адрес от лишней разметки для лучшего сопоставления
                let searchStr = address.replace(/(кабинет|офис|этаж|блок|бутик|квартира)\s*\d+/gi, '').trim();
                
                // Удаляем повторяющиеся упоминания городов во избежание путаницы у Nominatim
                const cleanPhrases = [
                    `г. ${cityClean}`, `г.${cityClean}`, `город ${cityClean}`, cityClean,
                    'казахстан', 'республика казахстан', 'republic of kazakhstan'
                ];
                cleanPhrases.forEach(phrase => {
                    const escapedPhrase = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`(^|[^a-яА-ЯёЁa-zA-Z0-9])(${escapedPhrase})(?![a-яА-ЯёЁa-zA-Z0-9])`, 'gi');
                    searchStr = searchStr.replace(regex, '$1');
                });
                
                // Убираем лишние запятые, точки и пробелы по краям
                searchStr = searchStr.replace(/^[,\s.]+/, '').replace(/[,\s.]+$/, '').replace(/,\s*,/g, ',').trim();
                
                // Если после очистки ничего не осталось, используем исходный очищенный адрес
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
                        
                        // Защитный механизм: сверяем расстояние с центром города.
                        // Если расстояние больше 30 км, значит Nominatim нашел объект в другом городе/регионе (например, Балхаш вместо Караганды).
                        const cityCenters = {
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
                        
                        const center = cityCenters[city] || cityCenters['Караганда'];
                        const dist = this.getDistance(lat, lng, center.lat, center.lng);
                        
                        if (dist > 30) {
                            console.warn(`Геокодированный адрес "${address}" находится слишком далеко (${dist} км) от центра города ${city}. Игнорируем некорректные координаты.`);
                            return null;
                        }
                        
                        return { lat, lng };
                    }
                }
            } catch (e) {
                console.warn("Dynamic OSM geocoding failed, keeping local fallback coordinates:", e.message);
            }

            return null; // Возвращаем null при неудаче, чтобы использовать стабильные базовые координаты без сдвигов
        },

        // Запуск асинхронного фонового геокодирования для всех найденных услуг
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
                }
                
                // Небольшой интервал во избежание блокировок API (300 мс)
                await new Promise(resolve => setTimeout(resolve, 300));
            }
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
            return count;
        },

        resetFilters() {
            this.filters.category = '';
            this.filters.minPrice = null;
            this.filters.maxPrice = null;
            this.showNotification("Фильтры сброшены", "Все настройки фильтрации возвращены к исходным.", "info");
        },
        
        // Открытие модального окна контактов и подписки
        async openModal(item) {
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

            // Получаем историю цен из API
            if (item.id) {
                try {
                    const historyData = await MedicalApi.getServiceHistory(item.id);
                    if (historyData && historyData.history && Array.isArray(historyData.history)) {
                        let detailedHistory = [...historyData.history];
                        // Если в истории только один элемент, для красивого отображения графика
                        // за последние 30 дней, создадим 4 точки с одинаковой ценой
                        if (detailedHistory.length === 1) {
                            const single = detailedHistory[0];
                            const basePrice = Number(single.price);
                            const baseDate = new Date(single.date || new Date());
                            detailedHistory = [];
                            for (let i = 3; i >= 0; i--) {
                                const d = new Date(baseDate);
                                d.setDate(baseDate.getDate() - i * 8);
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                detailedHistory.push({
                                    date: `${yyyy}-${mm}-${dd}`,
                                    price: basePrice
                                });
                            }
                        }
                        
                        // Записываем историю в выбранный элемент реактивно
                        this.selectedServiceItem.price_history_detailed = detailedHistory;
                        this.selectedServiceItem.price_history = detailedHistory.map(h => Number(h.price));
                        
                        // Если в ответе пришли тренды, запишем их тоже
                        if (historyData.trends) {
                            this.selectedServiceItem.trends = historyData.trends;
                        }
                    }
                } catch (e) {
                    console.warn("Не удалось загрузить историю цен:", e.message);
                }
            }
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

        selectPopularService(service) {
            this.searchQuery = typeof service === 'string' ? service : (service.query || service.name);
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
            
            this.isSuggestionsOpen = false;
            this.isLoading = true;
            this.hasSearched = true; 
            this.services = []; 

            const query = this.searchQuery.trim();

            // Вызываем метод поиска из нашего api.js модуля
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
                    
                    // Извлекаем первый филиал из массива branches, если он есть
                    const branch = (item.branches && item.branches.length > 0) ? item.branches[0] : {};
                    const itemAddress = branch.address || item.address || 'Казахстан';
                    const itemWorkingHours = branch.working_hours || item.working_hours || '08:00 - 18:00';
                    const itemPhone = branch.phone || item.phone || '+7 (700) 000-00-00';
                    
                    let cityName = item.city ? (CITY_MAP[item.city.toLowerCase()] || (item.city.charAt(0).toUpperCase() + item.city.slice(1))) : '';
                    
                    // Если город пустой, попробуем определить по адресу клиники
                    if (!cityName && itemAddress) {
                        const addrLower = itemAddress.toLowerCase();
                        for (const [latin, cyr] of Object.entries(CITY_MAP)) {
                            // Отрезаем окончания или проверяем вхождение, например "караганд", "алмат", "астан"
                            const root = cyr.slice(0, -1).toLowerCase(); // Караганд, Алмат, Астан
                            if (addrLower.includes(root)) {
                                cityName = cyr;
                                break;
                            }
                        }
                    }
                    
                    // Если все еще пустой, берем выбранный фильтр города
                    if (!cityName) {
                        cityName = this.filters.city || 'Алматы';
                    }
                    
                    // Проверяем точный адрес для принудительного высокоточного позиционирования
                    let lat = null;
                    let lng = null;
                    
                    const addressStr = itemAddress.toLowerCase();
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
                    
                    // Если не переопределено точным адресом, используем координаты из API
                    if (!lat || !lng) {
                        lat = item.lat || item.latitude || branch.lat || branch.latitude || null;
                        lng = item.lng || item.longitude || branch.lng || branch.longitude || null;
                    }
                    
                    // Если нет в API, вычисляем по названию клиники
                    if (!lat || !lng) {
                        const calculated = this.getClinicCoordinates(clinicName, cityName, itemAddress);
                        lat = calculated.lat;
                        lng = calculated.lng;
                    }

                    return {
                        id: item.id || index + 1000,
                        clinic: clinicName,
                        category: item.category || 'Общее',
                        service_name: item.service_name || item.name || 'Медицинская услуга',
                        city: cityName,
                        address: itemAddress,
                        price: Number(item.price) || 0,
                        website_url: item.website_url || '#',
                        rating: Number(item.rating) || 4.5,
                        working_hours: itemWorkingHours,
                        phone: itemPhone,
                        last_updated: item.last_updated || new Date().toISOString().split('T')[0],
                        has_online_booking: item.has_online_booking || item.online_booking || false,
                        lat,
                        lng,
                        price_history: item.price_history || [item.price]
                    };
                });
                
                this.isLoading = false;
                // Запускаем фоновое высокоточное геокодирование по текстовым адресам
                this.geocodeAllServices();
                return;
            }

            // Если бэкенд пуст или произошла ошибка
            this.services = [];
            this.isLoading = false;
            this.showNotification(
                "Результаты поиска",
                "Не удалось получить предложения с сервера. Попробуйте обновить страницу или изменить запрос.",
                "info"
            );
        },

        // --- МЕТОДЫ ИНТЕГРАЦИИ С РЕАЛЬНЫМ API БЭКЕНДА (FASTAPI) ---
        async testApiConnection() {
            // Прямой запрос списка городов без лишнего пинг-запроса для максимального быстродействия
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
                console.warn("Ошибка при получении списка городов с бэкенда:", e);
            }
            
            // Загрузка категорий услуг
            await this.fetchCategories();
        },

        async fetchCities() {
            await this.testApiConnection();
        },

        async detectUserLocation() {
            // Если город уже сохранен пользователем и подтвержден, используем его
            const saved = localStorage.getItem('selected_city');
            const isConfirmed = localStorage.getItem('city_confirmed') === 'true';
            
            if (saved && this.availableCities.includes(saved)) {
                this.filters.city = saved;
                if (isConfirmed) {
                    return;
                }
            }

            // Попытка определить по IP (ip-api.com или ipapi.co)
            let detected = 'Караганда'; // По умолчанию Караганда по запросу пользователя
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
                console.warn("ip-api detection error, trying backup:", e);
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
                } catch (err) {
                    console.warn("ipapi.co detection error:", err);
                }
            }

            this.detectedCity = detected;
            this.filters.city = detected;

            // Открываем модальное окно подтверждения города
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
            if (query.length < 2) {
                this.suggestions = [];
                return;
            }
            try {
                const suggestions = await MedicalApi.getSuggestions(query);
                if (suggestions && Array.isArray(suggestions)) {
                    this.suggestions = suggestions;
                } else {
                    this.suggestions = [];
                }
            } catch (e) {
                console.warn("Ошибка при получении подсказок через API:", e);
                this.suggestions = [];
            }
        },

        selectSuggestion(suggestion) {
            this.searchQuery = suggestion.value;
            this.isSuggestionsOpen = false;
            this.searchServices();
        },

        initMap() {}
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

        // Загружаем поисковые подсказки через API при старте
        this.fetchSuggestions();

        // Автоматическое определение геолокации при входе
        this.detectUserLocation();

        // Закрытие выпадающего списка городов и подсказок при клике вне их области
        document.addEventListener('click', (e) => {
            const container = document.getElementById('city-selector-container');
            if (container && !container.contains(e.target)) {
                this.isCityDropdownOpen = false;
            }
            const searchWrapper = document.getElementById('search-input-wrapper');
            if (searchWrapper && !searchWrapper.contains(e.target)) {
                this.isSuggestionsOpen = false;
            }
        });
    }
}).mount('#app');
