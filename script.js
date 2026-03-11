let productsData = []; 
let cart = {}; 
let promoDiscount = 0; 

// الرابط نتاعك
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0rXzRTL8Xqx_urL3yl-a0AmgClCZH5-1PL2dQWzf4owzVnjA5NN7mL6OhJSsN3Fxmbg/exec';

async function fetchProducts() {
    try {
        const url = `https://raw.githubusercontent.com/Store1hjj/Click-store-/main/products.json?v=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل جلب المنتجات');
        
        productsData = await response.json();
        renderProducts(productsData);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('productsGrid').innerHTML = '<p style="text-align:center; color:red;">خطأ في تحميل المنتجات. يرجى تحديث الصفحة.</p>';
    }
}

function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = ''; 

    const groupedProducts = {};
    productsList.forEach(product => {
        if (product.active === false) return; 

        const categoryName = product.category || "🔥 الأكثر مبيعاً"; 
        
        if (!groupedProducts[categoryName]) {
            groupedProducts[categoryName] = [];
        }
        groupedProducts[categoryName].push(product);
    });

    for (const [category, items] of Object.entries(groupedProducts)) {
        if (items.length === 0) continue;

        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'category-section';

        const title = document.createElement('h2');
        title.className = 'category-title';
        title.innerText = category;
        sectionDiv.appendChild(title);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'category-items';

        items.forEach(p => {
            let qty = cart[p.id] ? cart[p.id].qty : 0;
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.innerHTML = `
                <img src="${p.image}" alt="${p.name}" class="card-img">
                <h3 style="font-size:1.1rem; margin-bottom:5px;">${p.name}</h3>
                <div class="duration-select">${p.duration}</div>
                <div class="price-text">${p.price} دج</div>
                <div class="qty-controls">
                    <button class="btn-qty minus" onclick="updateCart('${p.id}', -1)">-</button>
                    <span id="qty-${p.id}" style="font-size:1.2rem; font-weight:bold;">${qty}</span>
                    <button class="btn-qty" onclick="updateCart('${p.id}', 1)">+</button>
                </div>
            `;
            itemsDiv.appendChild(card);
        });
        sectionDiv.appendChild(itemsDiv);
        grid.appendChild(sectionDiv);
    }
}

function updateCart(productId, change) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    if (!cart[productId]) { cart[productId] = { ...product, qty: 0 }; }
    cart[productId].qty += change;

    if (cart[productId].qty <= 0) {
        delete cart[productId];
        document.getElementById(`qty-${productId}`).innerText = '0';
    } else {
        document.getElementById(`qty-${productId}`).innerText = cart[productId].qty;
    }
    updateCartUI();
}

function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;
    const cartItemsDiv = document.getElementById('cartItems');
    cartItemsDiv.innerHTML = '';

    for (const id in cart) {
        const item = cart[id];
        totalItems += item.qty;
        totalPrice += (parseInt(item.price) * item.qty);

        cartItemsDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span>${item.name} (${item.duration}) x ${item.qty}</span>
                <span style="color:var(--accent);">${parseInt(item.price) * item.qty} دج</span>
            </div>
        `;
    }

    document.getElementById('cartCount').innerText = totalItems;
    document.getElementById('barTotal').innerText = totalPrice + ' دج';
    
    const floatBar = document.getElementById('floatBar');
    if (totalItems > 0) {
        floatBar.style.display = 'flex';
    } else {
        floatBar.style.display = 'none';
        cartItemsDiv.innerHTML = '<p style="text-align:center; color:var(--text-sub);">السلة فارغة</p>';
    }
    calcTotal(totalPrice);
}

function calcTotal(baseTotal = null) {
    if (baseTotal === null) {
        baseTotal = 0;
        for (const id in cart) {
            baseTotal += (parseInt(cart[id].price) * cart[id].qty);
        }
    }
    let finalTotal = baseTotal;
    if (promoDiscount > 0) {
        finalTotal = finalTotal - (finalTotal * (promoDiscount / 100));
    }
    document.getElementById('cartTotal').innerText = Math.floor(finalTotal) + ' دج';
    return Math.floor(finalTotal);
}

function openCart() {
    document.getElementById('cartModal').style.display = 'flex';
    updateCartUI();
}
function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function applyPromoClient() {
    const code = document.getElementById('promoInput').value.trim();
    if (code === "DISCOUNT10") { 
        promoDiscount = 10;
        alert("تم تفعيل خصم 10% بنجاح!");
    } else {
        promoDiscount = 0;
        alert("الكود غير صحيح أو منتهي الصلاحية.");
    }
    calcTotal();
}

// ✅ تم تصحيح الأسماء لتتطابق تماماً مع Apps Script
async function checkout() {
    const phone = document.getElementById('clientPhone').value;
    const payMethod = document.getElementById('payMethod').value;
    const fileInput = document.getElementById('receiptFile');
    const btn = document.querySelector('.btn-checkout');

    if (Object.keys(cart).length === 0) return alert("السلة فارغة!");
    if (!phone) return alert("يرجى إدخال رقم الهاتف!");
    if (fileInput.files.length === 0) return alert("يرجى إرفاق وصل الدفع!");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const file = fileInput.files[0];
        const base64File = await getBase64(file);
        
        let orderDetails = "";
        for (const id in cart) {
            orderDetails += `- ${cart[id].name} (${cart[id].duration}) | الكمية: ${cart[id].qty}\n`;
        }

        // الأسماء هنا أصبحت تطابق ملف جوجل (image, items, method, filename, promo)
        const payload = {
            items: orderDetails,
            total: calcTotal(),
            phone: phone,
            method: payMethod,
            promo: promoDiscount > 0 ? promoDiscount + "%" : "لا يوجد",
            image: base64File.split(',')[1], 
            mimeType: file.type,
            filename: file.name
        };

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // لتخطي حماية CORS نتاع جوجل
            },
            body: JSON.stringify(payload) 
        });

        alert("✅ تم استلام طلبك بنجاح! سنتواصل معك قريباً.");
        cart = {};
        updateCartUI();
        closeCart();
        
    } catch (error) {
        console.error("Error submitting order:", error);
        alert("❌ حدث خطأ أثناء إرسال الطلب، يرجى المحاولة عبر الواتساب.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'تأكيد الطلب';
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function toggleLanguage() { alert("ميزة تغيير اللغة قيد التطوير!"); }
window.onload = fetchProducts;
