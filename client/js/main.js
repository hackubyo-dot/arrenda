document.addEventListener('DOMContentLoaded', () => {
    loadProperties();
    setupSearch();
});

/**
 * Carrega os imóveis do backend e renderiza na tela
 */
async function loadProperties() {
    const featuredContainer = document.getElementById('featuredListings');
    const gridContainer = document.getElementById('allPropertiesGrid');

    try {
        const response = await apiService.properties.getAll();

        if (response.success) {
            const properties = response.data;

            if (properties.length === 0) {
                gridContainer.innerHTML = '<p class="text-center text-secondary py-5">Nenhum imóvel disponível no momento.</p>';
                return;
            }

            // Limpar containers
            featuredContainer.innerHTML = '';
            gridContainer.innerHTML = '';

            properties.forEach((prop, index) => {
                // Os primeiros 3 imóveis vão para o "Destaque" (Featured)
                if (index < 3) {
                    featuredContainer.appendChild(createFeaturedCard(prop));
                }
                
                // Todos os imóveis aparecem na grade principal
                gridContainer.appendChild(createVerticalCard(prop));
            });

        } else {
            console.error('Erro ao carregar:', response.message);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
    }
}

/**
 * Cria o card para o scroll horizontal (Featured)
 */
function createFeaturedCard(prop) {
    const div = document.createElement('div');
    div.className = 'card-featured';
    div.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${prop.main_image}" class="card-img-top" alt="${prop.title}">
            <span class="tag-sale">Para Arrendar</span>
            <button class="btn-wishlist"><i class="bi bi-heart"></i></button>
        </div>
        <div class="p-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small text-secondary"><i class="bi bi-geo-alt"></i> ${prop.location}</span>
                <span class="price-tag">${formatCurrency(prop.price)}</span>
            </div>
            <h6 class="fw-bold text-truncate">${prop.title}</h6>
            <div class="d-flex gap-3 small text-secondary mt-2">
                <span><i class="bi bi- house"></i> ${prop.type}</span>
                ${prop.is_360 ? '<span class="text-neon"><i class="bi bi-view-360"></i> 360°</span>' : ''}
            </div>
            <a href="pages/details.html?id=${prop.id}" class="btn btn-primary-neon w-100 mt-3 py-2 rounded-3 fw-bold">Ver Detalhes</a>
        </div>
    `;
    return div;
}

/**
 * Cria o card para a lista vertical (Nearby)
 */
function createVerticalCard(prop) {
    const col = document.createElement('div');
    col.className = 'col-12';
    col.innerHTML = `
        <a href="pages/details.html?id=${prop.id}" class="property-card-vertical">
            <img src="${prop.main_image}" alt="${prop.title}">
            <div class="flex-grow-1 overflow-hidden">
                <div class="d-flex justify-content-between">
                    <span class="price-tag small">${formatCurrency(prop.price)}</span>
                    ${prop.is_360 ? '<i class="bi bi-view-360 text-neon"></i>' : ''}
                </div>
                <h6 class="fw-bold text-white text-truncate mb-1 mt-1">${prop.title}</h6>
                <p class="text-secondary small mb-1"><i class="bi bi-geo-alt"></i> ${prop.location}</p>
                <div class="d-flex gap-2 extra-info">
                    <span class="badge bg-dark border border-secondary text-secondary">${prop.type}</span>
                </div>
            </div>
        </a>
    `;
    return col;
}

/**
 * Configura o campo de busca
 */
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let timeout = null;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
            const query = e.target.value;
            const response = await apiService.properties.getAll({ location: query });
            
            const gridContainer = document.getElementById('allPropertiesGrid');
            gridContainer.innerHTML = '';
            
            if (response.success && response.data.length > 0) {
                response.data.forEach(prop => gridContainer.appendChild(createVerticalCard(prop)));
            } else {
                gridContainer.innerHTML = '<p class="text-center text-secondary py-4">Nenhum resultado encontrado.</p>';
            }
        }, 500);
    });
}

/**
 * Formata valores para a moeda local (Kwanza - Kz)
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value).replace('Kz', 'Kz ');
}