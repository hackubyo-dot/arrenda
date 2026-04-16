/**
 * MAIN LOGIC - ANGOLA IMÓVEIS ELITE
 * Controle de Mapa, Temas, Filtros e Renderização Híbrida
 */

let mainMap;
let propertyMarkers = [];
let currentFilter = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Tema (Dark/Light)
    initTheme();

    // 2. Inicializar Mapa (Foco em Luanda)
    initMap();

    // 3. Carregar Imóveis com Skeleton Loader
    loadProperties();

    // 4. Configurar Listeners de Categoria e Busca
    setupEventListeners();

    // 5. Verificar Usuário para Sidebar
    updateUserUI();
});

/**
 * Gestão de Tema Real-time
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'dark') {
        btn.innerHTML = '<i class="bi bi-sun-fill"></i> <span>Modo Claro</span>';
    } else {
        btn.innerHTML = '<i class="bi bi-moon-stars-fill"></i> <span>Modo Escuro</span>';
    }
}

/**
 * Inicialização do Mapa Leaflet
 */
function initMap() {
    const mapElement = document.getElementById('main-map');
    if (!mapElement) return;

    // Coordenadas centrais de Luanda
    mainMap = L.map('main-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([-8.8390, 13.2894], 12);

    // Estilo do Mapa (Usando CartoDB para um visual clean)
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tileLayer = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileLayer).addTo(mainMap);
    
    // Adicionar botão de zoom no canto inferior direito
    L.control.zoom({ position: 'bottomright' }).addTo(mainMap);
}

/**
 * Carregamento e Renderização de Imóveis
 */
async function loadProperties(filters = {}) {
    const grid = document.getElementById('masterGrid');
    grid.innerHTML = createSkeletons(6); // Mostrar skeletons enquanto carrega

    try {
        const res = await apiService.properties.getAll(filters);
        
        if (res.success) {
            const props = res.data;
            document.getElementById('prop-count').innerText = props.length;
            
            grid.innerHTML = ''; // Limpar skeletons
            
            if (props.length === 0) {
                grid.innerHTML = '<div class="text-center py-5 w-100"><h5 class="text-muted">Nenhum imóvel encontrado nesta categoria.</h5></div>';
                return;
            }

            props.forEach(prop => {
                grid.appendChild(createPropertyCard(prop));
                addMarkerToMap(prop);
            });
        }
    } catch (err) {
        console.error('Erro ao carregar imóveis:', err);
    }
}

/**
 * Componente: Card de Imóvel Premium
 */
function createPropertyCard(prop) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4 animate-fade';
    
    col.innerHTML = `
        <a href="pages/details.html?id=${prop.id}" class="premium-card-wrapper">
            <div class="card-image-box">
                <img src="${prop.main_image}" alt="${prop.title}" loading="lazy">
                <span class="badge-verified"><i class="bi bi-patch-check-fill"></i> Verificado</span>
                <div class="card-overlay-btn">
                    <i class="bi bi-heart"></i>
                </div>
            </div>
            <div class="p-4">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="category-badge">${prop.type}</span>
                    <span class="price-tag-premium">${formatCurrency(prop.price)}<small>/mês</small></span>
                </div>
                <h5 class="fw-bold text-truncate mb-1">${prop.title}</h5>
                <p class="text-muted small mb-3"><i class="bi bi-geo-alt-fill text-neon"></i> ${prop.location}</p>
                <div class="d-flex gap-3 pt-3 border-top border-secondary border-opacity-10">
                    <div class="d-flex align-items-center gap-2 small text-muted">
                        <i class="bi bi-house-door"></i> ${prop.type}
                    </div>
                    ${prop.is_360 ? '<div class="text-neon fw-bold small"><i class="bi bi-view-360"></i> 360°</div>' : ''}
                </div>
            </div>
        </a>
    `;
    return col;
}

/**
 * Adiciona marcadores ao mapa
 */
function addMarkerToMap(prop) {
    if (!mainMap) return;

    // Em um cenário real, usaríamos geocoding. Aqui simulamos posição perto de Luanda
    const lat = -8.8390 + (Math.random() - 0.5) * 0.1;
    const lng = 13.2894 + (Math.random() - 0.5) * 0.1;

    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class='marker-pin'>${formatCurrency(prop.price, true)}</div>`,
        iconSize: [60, 30],
        iconAnchor: [30, 30]
    });

    const marker = L.marker([lat, lng], { icon: customIcon })
        .addTo(mainMap)
        .bindPopup(`
            <div class="popup-card">
                <img src="${prop.main_image}" style="width:100%; border-radius:10px;">
                <h6 class="mt-2 fw-bold">${prop.title}</h6>
                <a href="pages/details.html?id=${prop.id}" class="btn btn-sm btn-dark w-100 mt-2">Ver detalhes</a>
            </div>
        `);
    
    propertyMarkers.push(marker);
}

/**
 * Listeners: Busca e Filtros
 */
function setupEventListeners() {
    // Filtro de Categorias
    const catButtons = document.querySelectorAll('.category-pill');
    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-type');
            loadProperties({ type: currentFilter === 'Todos' ? '' : currentFilter });
        });
    });

    // Busca Global com Debounce
    const searchInput = document.getElementById('globalSearch');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadProperties({ location: e.target.value, type: currentFilter === 'Todos' ? '' : currentFilter });
        }, 500);
    });
}

/**
 * UI: Atualizar perfil na sidebar
 */
function updateUserUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    const profileBox = document.getElementById('user-sidebar-profile');
    if (!profileBox) return;

    if (user) {
        profileBox.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="user-avatar-small">${user.name.charAt(0)}</div>
                <div class="overflow-hidden">
                    <p class="mb-0 fw-bold text-truncate">${user.name}</p>
                    <p class="mb-0 text-muted small text-truncate">${user.email}</p>
                </div>
            </div>
        `;
    } else {
        profileBox.innerHTML = `
            <a href="pages/login.html" class="btn btn-dark w-100 rounded-pill">Entrar</a>
        `;
    }
}

/**
 * Helpers
 */
function createSkeletons(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="skeleton" style="height: 350px; border-radius: 30px; margin-bottom: 20px;"></div>
            </div>
        `;
    }
    return html;
}

function formatCurrency(value, short = false) {
    const formatter = new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        maximumFractionDigits: 0
    });
    if (short) return (value / 1000).toFixed(0) + 'k';
    return formatter.format(value).replace('Kz', 'Kz ');
}

function toggleMap() {
    const map = document.getElementById('main-map');
    map.classList.toggle('expanded');
    setTimeout(() => mainMap.invalidateSize(), 400);
}