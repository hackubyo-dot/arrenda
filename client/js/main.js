/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 💎 ARRENDA ANGOLA VIP - MAIN CORE CONTROLLER (V5.0)
 * 🚀 High-End UI Orchestration & Property Streaming Engine
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Este arquivo gerencia:
 * - Renderização Cinematográfica de Imóveis (Grid & Carousel)
 * - Integração Geoespacial (Leaflet Engine com Custom Markers)
 * - Sistema de Busca Global Debounced
 * - Filtragem por Categorias 3D
 * - State Management da UI (Dark/Light/Auth)
 */

"use strict";

const ArrendaMain = (() => {
    // ESTADO PRIVADO DO SISTEMA
    const state = {
        map: null,
        markers: [],
        currentFilter: 'Todos',
        searchQuery: '',
        isLoading: false,
        properties: [],
        vipProperties: []
    };

    /**
     * 🏁 INICIALIZADOR MESTRE
     */
    const init = async () => {
        console.log("💎 ARRENDA MAIN: Iniciando Sequência de Boot Premium...");
        
        // 1. Configuração de Ambiente
        _setupUIState();
        _initMapEngine();

        // 2. Carregamento de Dados (Streaming Paraleleo)
        await Promise.all([
            _loadVipAds(),
            _fetchAndRenderProperties()
        ]);

        // 3. Ativação de Listeners de Elite
        _setupEventListeners();
        
        console.log("💎 ARRENDA MAIN: Sistema pronto e operante.");
    };

    /**
     * 🛰️ MOTOR GEOESPACIAL (LEAFLET)
     * Configuração de mapa nível fintech com tiles customizados.
     */
    const _initMapEngine = () => {
        const mapContainer = document.getElementById('main-map') || document.getElementById('full-map');
        if (!mapContainer) return;

        // Foco em Luanda com coordenadas precisas
        state.map = L.map(mapContainer.id, {
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: true
        }).setView([-8.8390, 13.2894], 12);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Tiles Premium (CartoDB Voyager / Dark Matter)
        const tileUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(state.map);

        // Adicionar controle de zoom customizado na posição direita
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
    };

    /**
     * 🔥 CARREGAMENTO DE ANÚNCIOS VIP (CARROSSEL)
     * Consome propriedades reais marcadas como is_vip no backend.
     */
    const _loadVipAds = async () => {
        const carousel = document.getElementById('vipCarousel');
        if (!carousel) return;

        // Mostrar Skeletons enquanto carrega
        carousel.innerHTML = _createVipSkeletons(3);

        try {
            const res = await apiService.properties.getAll({ is_vip: true });
            
            if (res.success && res.data.length > 0) {
                state.vipProperties = res.data;
                carousel.innerHTML = ''; // Limpar Skeletons
                
                state.vipProperties.forEach(prop => {
                    carousel.appendChild(_createVipCard(prop));
                });
            } else {
                // Se não houver VIPs, esconde a seção ou mostra fallback elegante
                carousel.closest('section').style.display = 'none';
            }
        } catch (error) {
            console.error("🔴 VIP_STREAM_ERROR:", error);
        }
    };

    /**
     * 🏠 MOTOR DE BUSCA E RENDERIZAÇÃO DE GRID
     * Filtra e renderiza os imóveis no feed principal.
     */
    const _fetchAndRenderProperties = async (filters = {}) => {
        const grid = document.getElementById('masterGrid');
        if (!grid) return;

        state.isLoading = true;
        grid.innerHTML = _createGridSkeletons(6);

        try {
            // Unificar filtros atuais com novos parâmetros
            const finalFilters = {
                type: state.currentFilter === 'Todos' ? '' : state.currentFilter,
                location: state.searchQuery,
                ...filters
            };

            const res = await apiService.properties.getAll(finalFilters);

            if (res.success) {
                state.properties = res.data;
                const countEl = document.getElementById('prop-count');
                if (countEl) countEl.innerText = state.properties.length;

                grid.innerHTML = ''; // Limpar Skeletons

                if (state.properties.length === 0) {
                    grid.innerHTML = _createEmptyState();
                    return;
                }

                state.properties.forEach(prop => {
                    grid.appendChild(_createPropertyCard(prop));
                    _addMarkerToMap(prop);
                });

                // Re-ajustar mapa para conter todos os markers se necessário
                if (state.markers.length > 0) {
                    const group = new L.featureGroup(state.markers);
                    state.map.fitBounds(group.getBounds().pad(0.1));
                }
            }
        } catch (error) {
            apiService.notify("Erro ao conectar com o catálogo real.", "error");
        } finally {
            state.isLoading = false;
        }
    };

    /**
     * 📐 COMPONENTES: CARDS CINEMÁTICOS
     * Criação de elementos DOM com injeção de dados reais.
     */
    const _createPropertyCard = (prop) => {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-4 animate-fade-in';
        
        const imageUrl = apiService.properties.resolveImageUrl(prop.id, 0);
        const formattedPrice = apiService.utils.formatCurrency(prop.price);

        col.innerHTML = `
            <div class="property-card-elite" onclick="window.location.href='/pages/details.html?id=${prop.id}'">
                <div class="card-img-container">
                    <img src="${imageUrl}" alt="${prop.title}" loading="lazy" class="shimmer-effect">
                    <div class="price-badge-premium">${formattedPrice}</div>
                    ${prop.is_360 ? '<div class="badge-360"><i class="bi bi-view-360"></i></div>' : ''}
                </div>
                <div class="card-body-elite">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="category-chip">${prop.type}</span>
                        <span class="status-dot ${prop.status}"></span>
                    </div>
                    <h5 class="fw-800 text-truncate mb-1">${prop.title}</h5>
                    <p class="text-muted small mb-0">
                        <i class="bi bi-geo-alt-fill text-neon me-1"></i> ${prop.location}
                    </p>
                </div>
            </div>
        `;
        return col;
    };

    const _createVipCard = (prop) => {
        const div = document.createElement('div');
        div.className = 'vip-card-premium animate-fade-in';
        div.onclick = () => window.location.href = `/pages/details.html?id=${prop.id}`;
        
        const imageUrl = apiService.properties.resolveImageUrl(prop.id, 0);

        div.innerHTML = `
            <img src="${imageUrl}" class="vip-img" alt="VIP Ad">
            <div class="vip-info">
                <span class="vip-badge">DESTINO EXCLUSIVO</span>
                <h2 class="text-white fw-800 mb-1">${prop.title}</h2>
                <div class="d-flex align-items-center gap-3">
                    <span class="text-neon fw-800 fs-4">${apiService.utils.formatCurrency(prop.price)}</span>
                    <span class="text-white-50 small"><i class="bi bi-geo-alt"></i> ${prop.location}</span>
                </div>
            </div>
        `;
        return div;
    };

    /**
     * 📍 SISTEMA DE MARCADORES CUSTOMIZADOS
     */
    const _addMarkerToMap = (prop) => {
        if (!state.map) return;

        // Simulamos coordenadas baseadas no ID para fins de demonstração no mapa (Luanda Central)
        // Em produção, o backend enviaria lat/lng reais.
        const lat = -8.8390 + (Math.sin(prop.id) * 0.05);
        const lng = 13.2894 + (Math.cos(prop.id) * 0.05);

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class='marker-pin-premium'>${apiService.utils.formatCurrency(prop.price).split(',')[0]}</div>`,
            iconSize: [65, 30],
            iconAnchor: [32, 30]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(state.map);
        
        marker.bindPopup(`
            <div class="map-popup-elite">
                <img src="${apiService.properties.resolveImageUrl(prop.id, 0)}" class="popup-img">
                <div class="p-3">
                    <h6 class="fw-800 mb-1">${prop.title}</h6>
                    <p class="text-neon fw-bold mb-2">${apiService.utils.formatCurrency(prop.price)}</p>
                    <a href="/pages/details.html?id=${prop.id}" class="btn-popup-link">Ver Ativo</a>
                </div>
            </div>
        `, { closeButton: false, className: 'vip-popup' });

        state.markers.push(marker);
    };

    /**
     * 👂 LISTENERS E INTERAÇÕES
     */
    const _setupEventListeners = () => {
        // 1. Busca Global (Debounced)
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    state.searchQuery = e.target.value.trim();
                    _fetchAndRenderProperties();
                }, 500);
            });
        }

        // 2. Filtro de Categorias 3D
        const catCards = document.querySelectorAll('.cat-3d-card');
        catCards.forEach(card => {
            card.addEventListener('click', () => {
                catCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                state.currentFilter = card.getAttribute('data-type');
                _fetchAndRenderProperties();
            });
        });

        // 3. Toggle de Mapa (Mobile/Expand)
        const btnMap = document.getElementById('btnOpenMap');
        if (btnMap) {
            btnMap.addEventListener('click', () => {
                const overlay = document.getElementById('mapOverlay');
                overlay.style.display = 'flex';
                setTimeout(() => state.map.invalidateSize(), 300);
            });
        }
    };

    /**
     * 🌓 UI STATE & THEME SYNC
     */
    const _setupUIState = () => {
        // Sync User Profile na Sidebar
        const user = apiService.auth.getCurrentUser();
        const profileBox = document.getElementById('userSidebarProfile');
        
        if (profileBox && user) {
            profileBox.innerHTML = `
                <div class="user-sidebar-card animate-fade-in">
                    <img src="${apiService.utils.generateAvatar(user.name)}" class="avatar-sm" alt="Me">
                    <div class="overflow-hidden">
                        <p class="mb-0 fw-800 text-truncate">${user.name}</p>
                        <p class="mb-0 text-muted small text-truncate">Membro VIP</p>
                    </div>
                </div>
            `;
        }

        // Theme Toggle Logic
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const next = apiService.utils.toggleTheme();
                _updateThemeUI(next);
                // Refresh map tiles
                if (state.map) {
                    state.map.remove();
                    _initMapEngine();
                    state.properties.forEach(p => _addMarkerToMap(p));
                }
            });
        }
    };

    const _updateThemeUI = (theme) => {
        const text = document.getElementById('theme-text');
        const lightIcon = document.querySelector('.light-icon');
        const darkIcon = document.querySelector('.dark-icon');

        if (theme === 'dark') {
            if (text) text.innerText = 'Modo Escuro';
            if (lightIcon) lightIcon.classList.add('d-none');
            if (darkIcon) darkIcon.classList.remove('d-none');
        } else {
            if (text) text.innerText = 'Modo Claro';
            if (lightIcon) lightIcon.classList.remove('d-none');
            if (darkIcon) darkIcon.classList.add('d-none');
        }
    };

    /**
     * 🦴 SKELETON LOADERS
     */
    const _createGridSkeletons = (count) => {
        return Array(count).fill(0).map(() => `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="skeleton-card">
                    <div class="skeleton-img"></div>
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text body"></div>
                </div>
            </div>
        `).join('');
    };

    const _createVipSkeletons = (count) => {
        return Array(count).fill(0).map(() => `
            <div class="vip-card-skeleton shimmer-effect"></div>
        `).join('');
    };

    const _createEmptyState = () => `
        <div class="text-center py-5 w-100 animate-fade-in">
            <i class="bi bi-search fs-1 text-muted mb-3 d-block"></i>
            <h4 class="fw-800">Nenhum ativo encontrado</h4>
            <p class="text-muted">Tente ajustar seus filtros ou mude a localização.</p>
        </div>
    `;

    // EXPOSIÇÃO PÚBLICA
    return {
        boot: init,
        refresh: () => _fetchAndRenderProperties(),
        toggleMap: (show) => {
            const overlay = document.getElementById('mapOverlay');
            if (overlay) overlay.style.display = show ? 'flex' : 'none';
            if (show) setTimeout(() => state.map.invalidateSize(), 400);
        }
    };
})();

// AUTO-START
document.addEventListener('DOMContentLoaded', ArrendaMain.boot);

/**
 * 🚀 FIM DO ARQUIVO: main.js
 * Sistema robusto, escalável e pronto para o design Apple-like.
 */