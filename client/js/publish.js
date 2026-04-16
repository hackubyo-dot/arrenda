/**
 * PUBLISH LOGIC
 * Gerencia o formulário de anúncio, previews de imagem e regras de pagamento.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticação
    if (!apiService.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Verificar Quota de Publicação (Regra de Negócio: 1 grátis, resto pago)
    checkPublicationQuota();

    // 3. Inicializar Previews de Imagem
    setupImagePreviews();

    // 4. Lógica de Submissão do Formulário
    const form = document.getElementById('publishForm');
    form.addEventListener('submit', handlePublishSubmit);

    // 5. Lógica de Botão de Pagamento no Modal
    const btnPayNow = document.getElementById('btnPayNow');
    if (btnPayNow) {
        btnPayNow.addEventListener('click', handleProcessPayment);
    }
});

/**
 * Verifica se o usuário já atingiu o limite gratuito e exibe aviso
 */
async function checkPublicationQuota() {
    try {
        const quotaRes = await apiService.payments.getQuota();
        const myPropsRes = await apiService.properties.getMyProperties();
        
        const allowed = quotaRes.allowed_posts;
        const current = myPropsRes.data.length;

        if (current >= allowed) {
            const notice = document.getElementById('paymentNotice');
            if (notice) notice.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Erro ao verificar quota:', error);
    }
}

/**
 * Configura os campos de upload para mostrar a imagem selecionada imediatamente
 */
function setupImagePreviews() {
    const uploadFields = [
        { id: 'main_image', preview: 'prev_main' },
        { id: 'image_1', preview: 'prev_1' },
        { id: 'image_2', preview: 'prev_2' }
    ];

    uploadFields.forEach(field => {
        const input = document.getElementById(field.id);
        const img = document.getElementById(field.preview);

        if (input && img) {
            input.addEventListener('change', function() {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        img.src = e.target.result;
                        img.classList.remove('d-none');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    });
}

/**
 * Processa a submissão do formulário via FormData para o Backend
 */
async function handlePublishSubmit(e) {
    e.preventDefault();
    
    const btn = document.getElementById('btnSubmit');
    const form = e.target;
    const formData = new FormData(form);

    // Feedback Visual
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> A publicar anúncio...';

    try {
        const response = await apiService.properties.create(formData);

        if (response.success) {
            alert('Sucesso! O seu imóvel foi publicado em Angola Imóveis.');
            window.location.href = 'dashboard.html';
        } else if (response.requirePayment) {
            // Se o backend bloquear por limite de 1 imóvel grátis
            const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
            paymentModal.show();
        } else {
            alert('Erro: ' + response.message);
        }
    } catch (error) {
        console.error('Erro na submissão:', error);
        alert('Ocorreu um erro ao conectar com o servidor.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Publicar Anúncio';
    }
}

/**
 * Simula o processamento do pagamento de 5.000 Kz
 */
async function handleProcessPayment() {
    const btn = document.getElementById('btnPayNow');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> A processar pagamento...';

    try {
        const response = await apiService.payments.pay();

        if (response.success) {
            alert('Pagamento de 5.000 Kz confirmado via Multicaixa/Unitel Money!');
            // Fecha modal e tenta publicar novamente
            const modalEl = document.getElementById('paymentModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Dispara o clique de publicação automaticamente após o pagamento
            document.getElementById('publishForm').requestSubmit();
        } else {
            alert('Erro ao processar pagamento. Tente novamente.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Pagar e Publicar';
    }
}