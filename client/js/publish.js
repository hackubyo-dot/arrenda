/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 💎 ARRENDA ANGOLA VIP - ULTRA-PREMIUM PUBLISHING ENGINE (V5.0)
 * 🚀 Binary Asset Pipeline & Quota Intelligence
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Este módulo orquestra:
 * - Workflow de Criação e Edição de Ativos (Hybrid Mode)
 * - Pipeline de Imagens Binárias (BYTEA Support para 5 slots)
 * - Sistema de Drag & Drop com Previsualização em Alta Fidelidade
 * - Verificação Proativa de Quotas e Integração com Gateway de Pagamento
 * - Validação de Dados em Tempo Real e Feedback de UI Apple-like
 */

"use strict";

const ArrendaPublish = (() => {
    // ESTADO INTERNO DO MOTOR DE PUBLICAÇÃO
    const state = {
        isEditMode: false,
        propertyId: null,
        currentUser: null,
        quota: {
            allowed: 1,
            used: 0
        },
        selectedFiles: {
            main: null,
            gallery: [null, null, null, null]
        }
    };

    /**
     * 🏁 INICIALIZADOR MESTRE
     */
    const init = async () => {
        console.log("💎 ARRENDA PUBLISH: Iniciando Pipeline de Publicação...");

        // 1. Segurança e Identidade
        state.currentUser = apiService.auth.getCurrentUser();
        if (!state.currentUser) {
            window.location.href = '/pages/login.html';
            return;
        }

        // 2. Determinar Modo (Create vs Edit)
        const params = new URLSearchParams(window.location.search);
        state.propertyId = params.get('edit') || params.get('id');
        state.isEditMode = !!state.propertyId;

        // 3. Inicializar Componentes de UI
        _setupImageHandlers();
        _setupFormValidation();
        _setupThemeSync();

        // 4. Fluxo de Dados
        if (state.isEditMode) {
            await _loadExistingData();
        } else {
            await _checkQuota();
        }

        console.log(`💎 ARRENDA PUBLISH: Modo ${state.isEditMode ? 'EDIÇÃO' : 'CRIAÇÃO'} Ativo.`);
    };

    /**
     * 🖼️ GESTÃO DE IMAGENS (DRAG & DROP / PREVIEWS)
     */
    const _setupImageHandlers = () => {
        // Slot Principal (Capa)
        const dropZone = document.getElementById('dropZoneMain');
        const inputMain = document.getElementById('inputMain');
        const prevMain = document.getElementById('previewMain');

        if (dropZone && inputMain) {
            dropZone.onclick = () => inputMain.click();
            
            inputMain.onchange = (e) => _processFile(e.target.files[0], 'main', prevMain);

            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
            dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) {
                    state.selectedFiles.main = e.dataTransfer.files[0];
                    _processFile(e.dataTransfer.files[0], 'main', prevMain);
                }
            };
        }

        // Slots de Galeria (1-4)
        [1, 2, 3, 4].forEach(i => {
            const input = document.getElementById(`input${i}`);
            const prev = document.getElementById(`prev${i}`);
            if (input) {
                input.onchange = (e) => _processFile(e.target.files[0], `gallery_${i}`, prev);
            }
        });
    };

    const _processFile = (file, type, previewElement) => {
        if (!file) return;

        // Validação de Tamanho (Máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            apiService.notify("A imagem é muito pesada (Máx 5MB).", "error");
            return;
        }

        // Atualizar Estado
        if (type === 'main') {
            state.selectedFiles.main = file;
        } else {
            const index = parseInt(type.split('_')[1]) - 1;
            state.selectedFiles.gallery[index] = file;
        }

        // Preview de Alta Fidelidade
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.classList.remove('d-none');
            previewElement.classList.add('animate-fade-in');
            
            // Efeito visual no container pai
            const parent = previewElement.closest('.drop-zone-premium') || previewElement.closest('.thumb-upload-box');
            if (parent) parent.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    };

    /**
     * 📊 VERIFICAÇÃO DE QUOTA E PAGAMENTO
     */
    const _checkQuota = async () => {
        try {
            const [resQuota, resMyProps] = await Promise.all([
                apiService.payments.getQuota(),
                apiService.properties.getMyProperties()
            ]);

            if (resQuota.success && resMyProps.success) {
                state.quota.allowed = resQuota.allowed_posts;
                state.quota.used = resMyProps.data.length;

                const badge = document.getElementById('badgeQuota');
                if (badge) {
                    if (state.quota.used >= state.quota.allowed) {
                        badge.innerText = "Quota Esgotada";
                        badge.className = "badge bg-danger text-white rounded-pill px-3";
                        apiService.notify("Atenção: Publicação adicional requer pagamento de 5.000 Kz.", "info");
                    } else {
                        badge.innerText = "Gratuita Disponível";
                        badge.className = "badge bg-neon text-black rounded-pill px-3";
                    }
                }
            }
        } catch (error) {
            console.error("🔴 QUOTA_CHECK_ERROR:", error);
        }
    };

    /**
     * 📥 CARREGAMENTO PARA EDIÇÃO (MODO EDIT)
     */
    const _loadExistingData = async () => {
        try {
            const res = await apiService.properties.getById(state.propertyId);
            if (res.success) {
                const p = res.data;

                // Preencher Campos de Texto
                const form = document.getElementById('formPublishElite');
                form.elements['title'].value = p.title;
                form.elements['type'].value = p.type;
                form.elements['price'].value = p.price;
                form.elements['location'].value = p.location;
                form.elements['description'].value = p.description;
                form.elements['phone_primary'].value = p.phone_primary;
                form.elements['phone_secondary'].value = p.phone_secondary || '';
                form.elements['is_360'].checked = p.is_360;

                // Carregar Previews Atuais do Backend (Persistência Bytea)
                const mainPrev = document.getElementById('previewMain');
                mainPrev.src = apiService.properties.resolveImageUrl(p.id, 0);
                mainPrev.classList.remove('d-none');

                for (let i = 1; i <= 4; i++) {
                    const prev = document.getElementById(`prev${i}`);
                    if (prev) {
                        prev.src = apiService.properties.resolveImageUrl(p.id, i);
                        prev.classList.remove('d-none');
                        // Verificar se a imagem realmente existe (para não mostrar slots vazios)
                        prev.onerror = () => prev.classList.add('d-none');
                    }
                }

                // Alterar Título da Página
                document.querySelector('h2').innerText = "Editar Propriedade VIP";
                document.getElementById('btnSubmitPublish').innerHTML = `Sincronizar Alterações <i class="bi bi-arrow-right ms-2"></i>`;
            }
        } catch (error) {
            apiService.notify("Erro ao carregar dados para edição.", "error");
        }
    };

    /**
     * 🚀 SUBMISSÃO DO FORMULÁRIO (ORQUESTRAÇÃO BINÁRIA)
     */
    const _handleFormSubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitPublish');
        const form = e.target;

        // Feedback Visual de Processamento
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processando Ativo...`;

        const formData = new FormData(form);
        
        // Adicionar metadados extras se necessário
        formData.set('is_360', form.elements['is_360'].checked);

        try {
            let response;
            
            if (state.isEditMode) {
                // MODO EDIÇÃO
                response = await apiService.properties.update(state.propertyId, formData);
            } else {
                // MODO CRIAÇÃO
                response = await apiService.properties.create(formData);
            }

            if (response.success) {
                apiService.notify("Parabéns! Ativo publicado com sucesso.", "success");
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
            } else if (response.requirePayment) {
                // Trigger Modal de Pagamento
                const payModal = new bootstrap.Modal(document.getElementById('paymentModal'));
                payModal.show();
            } else {
                apiService.notify(response.message || "Erro ao publicar anúncio.", "error");
            }

        } catch (error) {
            console.error("🔴 SUBMIT_ERROR:", error);
            apiService.notify("Erro crítico na comunicação com o servidor.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = state.isEditMode ? 'Sincronizar Alterações' : 'Publicar Anúncio Agora <i class="bi bi-arrow-right ms-2"></i>';
        }
    };

    /**
     * 💰 PROCESSAMENTO DE PAGAMENTO VIP
     */
    const _confirmPaymentAndPublish = async () => {
        const btn = document.getElementById('btnConfirmPay');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processando Kwanza...`;

        try {
            const res = await apiService.payments.pay();
            if (res.success) {
                apiService.notify("Pagamento confirmado! Quota liberada.", "success");
                
                // Fecha o modal e re-submete o formulário
                const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                modal.hide();
                
                // Simular clique no submit do formulário original
                document.getElementById('formPublishElite').requestSubmit();
            } else {
                apiService.notify("Falha no processamento do pagamento.", "error");
            }
        } catch (error) {
            apiService.notify("Erro no gateway de pagamento.", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "Pagar e Publicar";
        }
    };

    /**
     * 🛠️ AUXILIARES DE UI
     */
    const _setupFormValidation = () => {
        const form = document.getElementById('formPublishElite');
        if (form) {
            form.addEventListener('submit', _handleFormSubmit);
        }

        const payBtn = document.getElementById('btnConfirmPay');
        if (payBtn) {
            payBtn.addEventListener('click', _confirmPaymentAndPublish);
        }
    };

    const _setupThemeSync = () => {
        const theme = localStorage.getItem('arrenda_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
    };

    // EXPOSIÇÃO PÚBLICA
    return {
        init,
        refreshQuota: _checkQuota
    };
})();

// AUTO-BOOT
document.addEventListener('DOMContentLoaded', ArrendaPublish.init);

/**
 * 🚀 FIM DO ARQUIVO: publish.js
 * Projetado para suportar o pipeline de imagens binárias e fluxos complexos de pagamento.
 */