/* ==========================================
   CONFIGURAÇÕES DA LOJA
   ========================================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRcpAsgOFZmo8_1bZYDs5dvwKzn-DteK8HNM-LEfHBwYpKS08bRGARDGAdGqruV7aldj9IkdkwxPT7t/pub?output=csv";
const WHATSAPP_NUMBER = "5571993171870"; 

/* ==========================================
   ESTADO DA APLICAÇÃO
   ========================================== */
let products = []; 
let categories = ["Todos"];
let cart = JSON.parse(localStorage.getItem('minimalStore_cart')) || [];
let currentCategory = "Todos";
let currentTag = "Todas";
let searchQuery = "";

/* ==========================================
   BUSCA DE DADOS DA PLANILHA
   ========================================== */
async function fetchProductsFromSheet() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1); 
        
        products = rows.map(row => {
            if (!row.trim()) return null;
            const cols = row.split(','); 
            if (cols.length < 6) return null;

            return {
                id: parseInt(cols[0]) || Date.now(),
                name: cols[1]?.trim(),
                price: parseFloat(cols[2]?.replace(',', '.')) || 0,
                category: cols[3]?.trim(),
                tags: cols[4] ? cols[4].split('/').map(t => t.trim()) : [],
                image: cols[5]?.trim(),
                description: cols[6]?.trim() || ""
            };
        }).filter(p => p !== null);

        const uniqueCategories = [...new Set(products.map(p => p.category))];
        categories = ["Todos", ...uniqueCategories];

        renderCategories();
        renderProducts();
    } catch (error) {
        console.error("Erro ao carregar planilha:", error);
    }
}

/* ==========================================
   FUNÇÕES DE RENDERIZAÇÃO
   ========================================== */

const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    if(!categoryList) return;
    categoryList.innerHTML = '';

    categories.forEach(cat => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = `category-btn ${cat === currentCategory ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => {
            currentCategory = cat;
            currentTag = "Todas"; 
            renderCategories();
            renderTags();         
            renderProducts();
        };
        li.appendChild(btn);
        categoryList.appendChild(li);
    });
}

function renderTags() {
    const tagsContainer = document.getElementById('tagsContainer');
    if(!tagsContainer) return;
    tagsContainer.innerHTML = '';

    if (currentCategory === "Todos") return;

    const productsInCategory = products.filter(p => p.category === currentCategory);
    const allTags = productsInCategory.flatMap(p => p.tags || []);
    const tags = ["Todas", ...new Set(allTags)];

    if (tags.length <= 1) return;

    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = `tag-btn ${tag === currentTag ? 'active' : ''}`;
        btn.textContent = tag;
        btn.onclick = () => {
            currentTag = tag;
            renderTags(); 
            renderProducts();
        };
        tagsContainer.appendChild(btn);
    });
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if(!grid) return;
    grid.innerHTML = '';

    const filteredProducts = products.filter(p => {
        const matchCategory = currentCategory === "Todos" || p.category === currentCategory;
        const matchTag = currentTag === "Todas" || (p.tags && p.tags.includes(currentTag));
        const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchTag && matchSearch;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Nenhum produto encontrado.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" onclick="openModal(${product.id})" style="cursor:pointer">
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-title" onclick="openModal(${product.id})" style="cursor:pointer">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                    Adicionar ao carrinho
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* ==========================================
   LÓGICA DO MODAL DE DETALHES
   ========================================== */

function openModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalPrice').textContent = formatCurrency(product.price);
    
    // Converte quebras de linha da planilha em quebras de linha visuais no HTML
    document.getElementById('modalDescription').innerHTML = product.description.replace(/\n/g, '<br>');
    
    const modalBtn = document.getElementById('modalAddToCart');
    modalBtn.onclick = () => {
        addToCart(product.id);
        closeModal();
    };

    document.getElementById('productModal').classList.add('active');
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

/* ==========================================
   LÓGICA DO CARRINHO
   ========================================== */

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveAndRenderCart();
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        saveAndRenderCart();
    }
}

function setQuantity(productId, newQuantity) {
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 1) return;
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = qty;
        saveAndRenderCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveAndRenderCart();
}

function saveAndRenderCart() {
    localStorage.setItem('minimalStore_cart', JSON.stringify(cart));
    
    const cartItemsContainer = document.getElementById('cartItems');
    const badge = document.getElementById('cartBadge');
    const totalValueDisplay = document.getElementById('cartTotalValue');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if(!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    badge.textContent = totalItems;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty-msg">Seu carrinho está vazio.</p>';
        totalValueDisplay.textContent = 'R$ 0,00';
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = false;
    let totalValue = 0;

    cart.forEach(item => {
        totalValue += (item.price * item.quantity);
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4 class="cart-item-title">${item.name}</h4>
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <input type="number" class="qty-input" value="${item.quantity}" min="1" onchange="setQuantity(${item.id}, this.value)">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    totalValueDisplay.textContent = formatCurrency(totalValue);
}

function sendToWhatsApp() {
    const name = document.getElementById('customerName').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const payment = document.getElementById('paymentMethod').value;

    if (!name || !address || !payment) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    let message = `Olá! Gostaria de fazer o seguinte pedido:\n\n🛒 *Pedido:*\n`;
    let totalValue = 0;

    cart.forEach(item => {
        message += `\n▪️ ${item.name} (x${item.quantity}) - ${formatCurrency(item.price * item.quantity)}`;
        totalValue += (item.price * item.quantity);
    });

    message += `\n\n💰 *Total:* ${formatCurrency(totalValue)}\n`;
    message += `\n📍 *Nome:* ${name}\n📍 *Endereço:* ${address}\n💳 *Pagamento:* ${payment}`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

/* ==========================================
   INICIALIZAÇÃO ÚNICA E EVENTOS
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    fetchProductsFromSheet();
    saveAndRenderCart();

    // Eventos do Carrinho
    document.getElementById('cartToggleBtn').addEventListener('click', () => {
        document.getElementById('cartSidebar').classList.add('active');
        document.getElementById('cartOverlay').classList.add('active');
    });

    const closeCart = () => {
        document.getElementById('cartSidebar').classList.remove('active');
        document.getElementById('cartOverlay').classList.remove('active');
    };

    document.getElementById('closeCartBtn').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);

    // Evento de Busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProducts();
    });

    // Finalizar Pedido
    document.getElementById('checkoutBtn').addEventListener('click', sendToWhatsApp);

    // Fechar modal ao clicar fora dele
    window.onclick = function(event) {
        const modal = document.getElementById('productModal');
        if (event.target == modal) {
            closeModal();
        }
    }
});