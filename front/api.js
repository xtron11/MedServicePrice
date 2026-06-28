/**
 * MedicalApi - Модуль для работы с FastAPI бэкендом и локальной демо-базой данных.
 * Изолирует сетевые запросы и обеспечивает бесшовный fallback на MOCK данные.
 */

const MedicalApi = {
    // URL бэкенда по умолчанию
    baseUrl: localStorage.getItem('med_api_url') || 'http://127.0.0.1:8000',
    
    // Статус последнего подключения
    isConnected: false,

    /**
     * Установить новый URL бэкенда
     * @param {string} url 
     */
    setBaseUrl(url) {
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        this.baseUrl = cleanUrl;
        localStorage.setItem('med_api_url', cleanUrl);
    },

    /**
     * Проверить соединение с бэкендом (запрос на /api/cities)
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const res = await fetch(`${this.baseUrl}/api/cities`, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                this.isConnected = true;
                return true;
            }
        } catch (e) {
            console.warn("MedicalApi: Бэкенд недоступен по адресу:", this.baseUrl, e.message);
        }
        this.isConnected = false;
        return false;
    },

    /**
     * Получить список городов с бэкенда
     * @returns {Promise<string[]>}
     */
    async getCities() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const res = await fetch(`${this.baseUrl}/api/cities`, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                this.isConnected = true;
                if (data && Array.isArray(data)) {
                    return data;
                } else if (data && data.cities && Array.isArray(data.cities)) {
                    return data.cities;
                }
            }
        } catch (e) {
            console.warn("MedicalApi: Ошибка при получении городов, используем локальный список.", e.message);
        }
        return null; // Возвращаем null, чтобы script.js понял, что нужно использовать локальный список
    },

    /**
     * Получить список категорий услуг
     * @returns {Promise<string[]>}
     */
    async getCategories() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const res = await fetch(`${this.baseUrl}/api/categories`, { 
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                this.isConnected = true;
                if (Array.isArray(data)) {
                    return data;
                } else if (data && Array.isArray(data.categories)) {
                    return data.categories;
                }
            }
        } catch (e) {
            console.warn("MedicalApi: Ошибка получения категорий с бэкенда.", e.message);
        }
        return null;
    },

    /**
     * Получить поисковые подсказки (автодополнение)
     * @param {string} query 
     * @returns {Promise<string[]>}
     */
    async getSuggestions(query = '') {
        try {
            const qVal = (query || '').trim();
            // По Swagger ограничение minLength: 2, поэтому если меньше 2 символов, не шлем запрос
            if (qVal.length < 2) {
                return null;
            }
            const encodedQuery = encodeURIComponent(qVal);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const url = `${this.baseUrl}/api/suggest?q=${encodedQuery}`;

            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                this.isConnected = true;
                
                let rawSuggestions = [];
                if (Array.isArray(data)) {
                    rawSuggestions = data;
                } else if (data && Array.isArray(data.suggestions)) {
                    rawSuggestions = data.suggestions;
                } else if (data && Array.isArray(data.results)) {
                    rawSuggestions = data.results;
                }

                // Преобразуем массив объектов или строк в массив строк
                return rawSuggestions
                    .map(item => {
                        if (!item) return '';
                        if (typeof item === 'object') {
                            return item.value || item.name || '';
                        }
                        return String(item);
                    })
                    .filter(Boolean);
            }
        } catch (e) {
            console.warn("MedicalApi: Не удалось получить подсказки с сервера.", e.message);
        }
        return null;
    },

    /**
     * Выполнить поиск медицинских услуг
     * @param {Object} params - Параметры поиска
     * @param {string} params.query - Поисковый запрос
     * @param {string} params.city - Город (на латинице или кириллице)
     * @param {string} [params.category] - Категория
     * @param {number} [params.minPrice] - Минимальная цена
     * @param {number} [params.maxPrice] - Максимальная цена
     * @returns {Promise<Object[]>} - Массив найденных услуг
     */
    async searchServices({ query, city, category, minPrice, maxPrice }) {
        try {
            const params = new URLSearchParams();
            if (query) params.append('query', query.trim());
            if (city) params.append('city', city);
            if (category) params.append('category', category);
            if (minPrice !== undefined && minPrice !== null && minPrice !== '') params.append('min_price', minPrice);
            if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') params.append('max_price', maxPrice);
            params.append('sort', 'price_asc'); // Передаем дефолтную сортировку, как в Swagger

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            
            const res = await fetch(`${this.baseUrl}/api/search?${params.toString()}`, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                this.isConnected = true;
                
                // Извлекаем массив результатов: либо напрямую массив, либо из поля 'results'
                let resultsArray = null;
                if (Array.isArray(data)) {
                    resultsArray = data;
                } else if (data && Array.isArray(data.results)) {
                    resultsArray = data.results;
                }
                
                if (resultsArray) {
                    // Маппим специфичные для бэкенда поля на стандартные поля фронтенда
                    return resultsArray.map(item => ({
                        ...item,
                        // Маппинг клиники
                        clinic: item.clinic || item.clinic_name || 'Клиника',
                        // Маппинг цены
                        price: Number(item.price_kzt !== undefined ? item.price_kzt : item.price) || 0,
                        // Маппинг категории
                        category: item.category || item.category_label || 'Общее',
                        // Маппинг ссылки на сайт
                        website_url: item.website_url || item.source_url || '#',
                        // Маппинг даты обновления
                        last_updated: item.last_updated || item.updated_at || new Date().toISOString().split('T')[0],
                        // Название услуги
                        service_name: item.service_name || item.name || 'Медицинская услуга'
                    }));
                }
            }
        } catch (e) {
            console.warn("MedicalApi: Ошибка при выполнении поиска через API бэкенда.", e.message);
        }
        return null;
    }
};

// Экспортируем глобально
window.MedicalApi = MedicalApi;
