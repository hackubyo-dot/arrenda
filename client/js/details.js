/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 💎 ARRENDA ANGOLA VIP - IMMERSIVE DETAILS ENGINE (V5.0)
 * 🚀 Cinematic Property Visualization & 360° Interaction
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Gerencia:
 * - Renderização de Dados de Alta Fidelidade (Real-time Backend)
 * - Galeria Interativa com Efeito de Zoom e Troca Suave
 * - Visualizador 360° (Photo Sphere Viewer)
 * - Mapas Localizados e Contextuais
 * - Smart Conversion (Chat & WhatsApp Direct Links)
 */

"use strict";

const ArrendaDetails = (() => {
    // ESTADO INTERNO DA PÁGINA
    const state = {
        propertyId: null,
        propertyData: null,
        viewer360: null,
        map: null,
        activeImageIndex: 0
    };

    /**
     * 🏁 INICIALIZADOR DE PÁGINA
     */
    const init = async () => {
        console.log("💎 ARRENDA DETAILS: Iniciando Experiência Imersiva...");
        
        // 1. Extrair ID da URL
        const params = new URLSearchParams(window.location.search);
        state.propertyId = params.get('id');

        if (!state.propertyId) {
            apiService.notify("ID de propriedade inválido.", "error");
            setTimeout(() => window.location.href = '/index.html', 2000);
            return;
        }

        // 2. Carregar Dados Reais do Backend
        await _fetchPropertyDetails();

        // 3. Configurar Interações
        _setupGalleryInteractions();
    };

    /**
     * 🛰️ DATA FETCHING (NEON CORE)
     */
    const _fetchPropertyDetails = async () => {
        try {
            const res = await apiService.properties.getById(state.propertyId);
            
            if (res.success) {
                state.propertyData = res.data;
                _renderUI(state.propertyData);
                _initLocalMap(state.propertyData.location);
                
                if (state.propertyData.is_360) {
                    _setup360Trigger();
                }
            } else {
                throw new Error("Propriedade não encontrada.");
            }
        } catch (error) {
            console.error("🔴 DETAILS_LOAD_ERROR:", error);
            apiService.notify("Erro ao carregar detalhes do ativo.", "error");
        }
    };

    /**
     * 📐 RENDERIZAÇÃO DE UI (NÍVEL APPLE)
     */
    const _renderUI = (p) => {
        // Títulos e Textos Dinâmicos
        document.title = `${p.title} | Arrenda Angola Elite`;
        _updateText('pMainTitle', p.title);
        _updateText('pMainLocation', p.location);
        _updateText('pMainPrice', apiService.utils.formatCurrency(p.price));
        _updateText('pFullDescription', p.description);
        _updateText('pTypeLabel', p.type.toUpperCase());
        _updateText('chipCategory', p.type);
        
        // Dados do Proprietário
        _updateText('pOwnerName', p.owner_name);
        const avatarBox = document.getElementById('pOwnerAvatar');
        if (avatarBox) {
            avatarBox.innerText = p.owner_name.charAt(0).toUpperCase();
        }

        // 🖼️ RENDERIZAÇÃO DA GALERIA BINÁRIA
        // Slot 0 (Capa Principal)
        const mainImg = document.getElementById('displayCap');
        if (mainImg) {
            mainImg.src = apiService.properties.resolveImageUrl(p.id, 0);
        }

        // Slots de Miniaturas (1-4)
        for (let i = 1; i <= 4; i++) {
            const thumb = document.getElementById(`displayImg${i}`);
            if (thumb) {
                const url = apiService.properties.resolveImageUrl(p.id, i);
                thumb.src = url;
                
                // Tratamento para esconder slots vazios no grid cinematográfico
                thumb.onerror = function() {
                    const parent = this.closest('.gallery-thumb-item');
                    if (parent) parent.style.display = 'none';
                };
            }
        }

        // ⚡ BOTÕES DE CONVERSÃO (SMART LINKS)
        const waBtn = document.getElementById('waActionBtn');
        if (waBtn) {
            const msg = encodeURIComponent(`Olá ${p.owner_name}, vi seu anúncio VIP "${p.title}" no Arrenda Angola e gostaria de agendar uma visita.`);
            waBtn.href = `https://wa.me/${p.phone_primary.replace(/\s/g, '')}?text=${msg}`;
        }

        const chatBtn = document.getElementById('chatActionBtn');
        if (chatBtn) {
            chatBtn.onclick = () => {
                const user = apiService.auth.getCurrentUser();
                if (!user) {
                    apiService.notify("Autentique-se para negociar.", "info");
                    setTimeout(() => window.location.href = '/pages/login.html', 1500);
                    return;
                }
                // Redireciona para o chat com parâmetros de alvo
                window.location.href = `chat.html?target=${p.user_id}&name=${encodeURIComponent(p.owner_name)}`;
            };
        }
    };

    /**
     * 🔄 MOTOR DE GALERIA
     */
    const _setupGalleryInteractions = () => {
        window.expandImage = (index) => {
            const mainImg = document.getElementById('displayCap');
            if (!mainImg) return;

            // Efeito de Transição Suave
            mainImg.style.opacity = '0';
            
            setTimeout(() => {
                mainImg.src = apiService.properties.resolveImageUrl(state.propertyId, index);
                mainImg.onload = () => {
                    mainImg.style.opacity = '1';
                };
                state.activeImageIndex = index;
            }, 300);

            // Scroll suave para o topo da galeria se estiver no mobile
            if (window.innerWidth < 991) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    };

    /**
     * 🌐 SISTEMA DE MAPA LOCAL
     */
    const _initLocalMap = (locationName) => {
        const container = document.getElementById('map-location');
        if (!container) return;

        // Coordenadas centrais (fallback se não houver coordenadas reais no objeto)
        state.map = L.map(container.id, {
            zoomControl: false,
            attributionControl: false
        }).setView([-8.8390, 13.2894], 14);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const tiles = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        L.tileLayer(tiles).addTo(state.map);

        // Marcador Neon Estilizado
        const markerIcon = L.divIcon({
            className: 'marker-pulse',
            html: `<div class="dot-neon"></div>`,
            iconSize: [20, 20]
        });

        L.marker([-8.8390, 13.2894], { icon: markerIcon })
            .addTo(state.map)
            .bindPopup(`<b style="color: #000">${locationName}</b>`, { closeButton: false })
            .openPopup();
    };

    /**
     * 🕋 VISUALIZADOR 360° (PHOTO SPHERE)
     */
    const _setup360Trigger = () => {
        const btn = document.getElementById('btn360');
        if (btn) btn.classList.remove('d-none');
    };

    window.toggle360View = () => {
        const container = document.getElementById('photo-sphere-container');
        if (!container) return;

        if (container.style.display === 'block') {
            container.style.display = 'none';
        } else {
            container.style.display = 'block';
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (!state.viewer360) {
                state.viewer360 = new PhotoSphereViewer.Viewer({
                    container: container,
                    panorama: apiService.properties.resolveImageUrl(state.propertyId, 0),
                    loadingTxt: 'A carregar vista panorâmica HD...',
                    navbar: ['autorotate', 'zoom', 'fullscreen'],
                    defaultZoomLvl: 0
                });
            }
        }
    };

    /**
     * 🛠️ HELPERS
     */
    const _updateText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // EXPOSIÇÃO PÚBLICA
    return {
        init,
        expandImage: (i) => window.expandImage(i),
        toggle360: () => window.toggle360View()
    };
})();

// AUTO-BOOT
document.addEventListener('DOMContentLoaded', ArrendaDetails.init);

/**
 * 🚀 FIM DO ARQUIVO: details.js
 * Construído para máxima performance e fidelidade visual.
 */