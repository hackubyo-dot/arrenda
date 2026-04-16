/**
 * DETAILS LOGIC
 * Gere a exibição de dados do imóvel e o visualizador 360
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) {
        window.location.href = '../index.html';
        return;
    }

    try {
        const response = await apiService.properties.getById(propId);
        if (response.success) {
            renderDetails(response.data);
        } else {
            alert('Imóvel não encontrado.');
            window.location.href = '../index.html';
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
    }
});

function renderDetails(prop) {
    // Textos básicos
    document.getElementById('propTitle').innerText = prop.title;
    document.getElementById('propLocation').innerText = prop.location;
    document.getElementById('propPrice').innerText = formatCurrency(prop.price);
    document.getElementById('propDescription').innerText = prop.description;
    document.getElementById('propType').innerText = prop.type;
    document.getElementById('ownerName').innerText = prop.owner_name;
    document.getElementById('mainImage').src = prop.main_image;
    document.getElementById('propDate').innerText = new Date(prop.created_at).toLocaleDateString('pt-AO');

    // Galeria de miniaturas
    const gallery = document.getElementById('photoGallery');
    const images = [prop.main_image, prop.image_1, prop.image_2, prop.image_3, prop.image_4].filter(img => img);
    
    gallery.innerHTML = ''; // Limpa placeholder
    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${img}" alt="Gallery thumb">`;
        item.onclick = () => { document.getElementById('mainImage').src = img; };
        gallery.appendChild(item);
    });

    // Ativação do Visualizador 360°
    if (prop.is_360) {
        const btn360 = document.getElementById('btn360View');
        btn360.classList.remove('d-none');
        btn360.onclick = () => init360Viewer(prop.main_image);
    }

    // Botões de Ação (WhatsApp e Telefone)
    const whatsappMsg = encodeURIComponent(`Olá, vi o anúncio "${prop.title}" no Angola Imóveis e gostaria de saber mais.`);
    document.getElementById('whatsappBtn').href = `https://wa.me/${prop.phone_primary.replace(/\s/g, '')}?text=${whatsappMsg}`;
    document.getElementById('callBtn').href = `tel:${prop.phone_primary}`;
}

function init360Viewer(imageUrl) {
    const viewerDiv = document.getElementById('viewer-360');
    viewerDiv.style.display = 'block';
    viewerDiv.scrollIntoView({ behavior: 'smooth' });
    
    // Remove qualquer instância anterior
    viewerDiv.innerHTML = '';

    new PhotoSphereViewer.Viewer({
        container: viewerDiv,
        panorama: imageUrl,
        loadingTxt: 'A carregar vista 360...',
        navbar: ['autorotate', 'zoom', 'fullscreen']
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value).replace('Kz', 'Kz ');
}