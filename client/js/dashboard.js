/**
 * DASHBOARD LOGIC
 * Painel de controle do proprietário.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar se está logado
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Carregar todos os dados do Painel
    refreshDashboard();
});

/**
 * Função principal para atualizar os dados da tela
 */
async function refreshDashboard() {
    try {
        // Carregar Perfil do Usuário
        const userRes = await apiService.auth.getMe();
        if (userRes.success) {
            document.getElementById('userName').innerText = userRes.user.name;
            document.getElementById('userEmail').innerText = userRes.user.email;
        }

        // Carregar Meus Imóveis
        const propsRes = await apiService.properties.getMyProperties();
        const propertyList = document.getElementById('myPropertiesList');
        
        if (propsRes.success) {
            const props = propsRes.data;
            document.getElementById('totalProps').innerText = props.length;
            
            renderUserProperties(props);
        }

        // Carregar Quotas e Pagamentos
        const quotaRes = await apiService.payments.getQuota();
        if (quotaRes.success && propsRes.success) {
            const remaining = quotaRes.allowed_posts - propsRes.data.length;
            document.getElementById('quotaLeft').innerText = remaining > 0 ? remaining : 0;
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

/**
 * Renderiza a lista de cards de gestão de imóveis
 */
function renderUserProperties(properties) {
    const container = document.getElementById('myPropertiesList');
    container.innerHTML = ''; // Limpa o spinner de carregamento

    if (properties.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-house-add fs-1 text-secondary opacity-25"></i>
                <p class="text-secondary mt-2">Você ainda não tem imóveis publicados.</p>
                <a href="publish.html" class="btn btn-outline-light btn-sm rounded-pill">Publicar Primeiro</a>
            </div>
        `;
        return;
    }

    properties.forEach(prop => {
        const card = document.createElement('div');
        card.className = 'manage-card';
        card.innerHTML = `
            <img src="${prop.main_image}" alt="thumb">
            <div class="flex-grow-1 overflow-hidden">
                <h6 class="fw-bold mb-1 text-truncate" style="font-size: 0.9rem;">${prop.title}</h6>
                <div class="d-flex align-items-center gap-2">
                    <span class="status-badge ${prop.status === 'active' ? 'status-active' : 'status-pending'}">
                        ${prop.status === 'active' ? 'Ativo' : 'Pendente'}
                    </span>
                    <span class="text-secondary small">${formatCurrency(prop.price)}</span>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button onclick="deleteProperty(${prop.id})" class="btn-action btn-delete" title="Apagar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Deleta um imóvel após confirmação do usuário
 */
async function deleteProperty(id) {
    if (confirm('Tem a certeza que deseja eliminar este anúncio permanentemente?')) {
        try {
            const response = await apiService.properties.delete(id);
            if (response.success) {
                // Atualiza a tela sem recarregar a página inteira
                refreshDashboard();
            } else {
                alert('Erro ao eliminar: ' + response.message);
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao eliminar imóvel.');
        }
    }
}

/**
 * Formata valores para Kwanza (Kz)
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value).replace('Kz', 'Kz ');
}

// Expõe a função para o escopo global (usada no botão inline)
window.deleteProperty = deleteProperty;