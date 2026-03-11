let productsData = []; 
let cart = {}; // السلة الآن تعتمد على (id + مدة) كمفتاح فريد
let promoDiscount = 0; 

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0rXzRTL8Xqx_urL3yl-a0AmgClCZH5-1PL2dQWzf4owzVnjA5NN7mL6OhJSsN3Fxmbg/exec';

// --- الترجمة ---
const translations = {
    ar: {
        hero_title: 'الاشتراكات الرقمية <span style="color: var(--primary);">الأفضل عالمياً</span>',
        hero_sub: 'خدمة فورية، أسعار تنافسية، وضمان كامل 💯',
        bar_total_label: 'الإجمالي الحالي:',
        bar_btn: 'أكمل وأكد طلبك 🚀',
        cart_title: '<i class="fas fa-shopping-cart"></i> السلة',
        total_label: 'الإجمالي:',
        pay_method_label: 'اختر طريقة الدفع',
        upload_btn: 'اضغط هنا لإرفاق وصل الدفع',
        checkout_btn: 'تأكيد وإرسال عبر واتساب',
        promo_btn: 'تفعيل',
        promo_ph: 'لديك كود تخفيض؟',
        phone_ph: 'رقم هاتفك / Numéro de tel'
    },
    fr: {
        hero_title: 'Les Meilleurs Abonnements <span style="color: var(--primary);">Numériques</span>',
        hero_sub: 'Service instantané, prix compétitifs, garantie 💯',
        bar_total_label: 'Total actuel :',
        bar_btn: 'Confirmer la commande 🚀',
        cart_title: '<i class="fas fa-shopping-cart"></i> Panier',
        total_label: 'Total :',
        pay_method_label: 'Mode de paiement',
        upload_btn: 'Cliquez ici pour joindre le reçu',
        checkout_btn: 'Confirmer via WhatsApp',
        promo_btn: 'Appliquer',
        promo_ph: 'Avez-vous un code promo ?',
        phone_ph: 'Numéro de téléphone'
    }
};
let currentLang = 'ar';

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'fr' : 'ar';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('langBtn').innerHTML = `<i class="fas fa-globe"></i> ${currentLang === 'ar' ? 'FR' : 'AR'}`;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
            if(key === 'checkout_btn') el.innerHTML = `<i class="fab fa-whatsapp" style="font-size:1.3rem;"></i> ` + translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });
}

// --- جلب البيانات ---
async function fetchProducts() {
    try {
        const url = `https://raw.githubusercontent.com/Store1hjj/Click-store-/main/products.json?v=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل جلب المنتجات');
        productsData = await response.json();
        renderProducts(productsData);
    } catch (error) {
        document.getElementById('productsGrid').innerHTML = '<p style="text-align:center; color:red;">خطأ في تحميل المنتجات.</p>';
    }
}

// --- عرض المنتجات مع القائمة المنسدلة ---
function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = ''; 

    const groupedProducts = {};
    productsList.forEach(product => {
        if (product.active === false) return; 
        const categoryName = product.category || "🔥 الأكثر مبيعاً"; 
        if (!groupedProducts[categoryName]) groupedProducts[categoryName] = [];
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
            // معالجة البيانات لتكون مصفوفات (Lists)
            let prices = Array.isArray(p.price) ? p.price : [p.price];
            let durations = Array.isArray(p.duration) ? p.duration : [p.duration];

            // صنع خيارات القائمة المنسدلة
            let selectHTML = `<select id="sel-${p.id}" class="price-select" onchange="syncDisplay('${p.id}')">`;
            for(let i = 0; i < durations.length; i++) {
                let pr = prices[i] || prices[0]; 
                let dr = durations[i];
                selectHTML += `<option value="${pr}|${dr}">${dr} - ${pr} دج</option>`;
            }
            selectHTML += `</select>`;

            const card = document.createElement('div');
            card.className = 'glass-card';
            card.innerHTML = `
                <div style="width:100%;">
                    <img src="${p.image}" alt="${p.name}" class="card-img">
                    <h3 style="font-size:1.1rem; margin-bottom:5px;">${p.name}</h3>
                    ${selectHTML}
                </div>
                <div class="qty-controls">
                    <button class="btn-qty minus" onclick="modifyCart('${p.id}', -1)">-</button>
                    <span id="qty-${p.id}" style="font-size:1.2rem; font-weight:bold;">0</span>
                    <button class="btn-qty plus" onclick="modifyCart('${p.id}', 1)">+</button>
                </div>
            `;
            itemsDiv.appendChild(card);
        });
        sectionDiv.appendChild(itemsDiv);
        grid.appendChild(sectionDiv);
    }
    
    // تزامن الكميات بعد الرسم
    productsList.forEach(p => syncDisplay(p.id));
}

// --- نظام السلة الجديد (يعتمد على السعر والمدة المختارة) ---
function modifyCart(productId, change) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const sel = document.getElementById(`sel-${productId}`);
    const [priceStr, durationStr] = sel.value.split('|');
    const price = parseInt(priceStr);

    // صناعة مفتاح فريد لكل مدة داخل نفس المنتج
    const cartKey = `${productId}_${durationStr}`;

    if (!cart[cartKey]) {
        if (change < 0) return; // لا تنقص من منتج غير موجود
        cart[cartKey] = { id: productId, name: product.name, price: price, duration: durationStr, qty: 0 };
    }

    cart[cartKey].qty += change;

    if (cart[cartKey].qty <= 0) {
        delete cart[cartKey];
    }

    syncDisplay(productId);
    updateCartUI();
}

// مزامنة الرقم المعروض مع المدة المختارة حالياً
function syncDisplay(productId) {
    const sel = document.getElementById(`sel-${productId}`);
    if(!sel) return;
    const [_, durationStr] = sel.value.split('|');
    const cartKey = `${productId}_${durationStr}`;
    
    const qtyDisplay = document.getElementById(`qty-${productId}`);
    if (cart[cartKey]) {
        qtyDisplay.innerText = cart[cartKey].qty;
        qtyDisplay.style.color = 'var(--primary)';
    } else {
        qtyDisplay.innerText = '0';
        qtyDisplay.style.color = '#fff';
    }
}

function updateCartUI() {
    let totalItems = 0; 
    let totalPrice = 0;
    const cartItemsDiv = document.getElementById('cartItems');
    cartItemsDiv.innerHTML = '';

    for (const key in cart) {
        const item = cart[key];
        totalItems += item.qty;
        totalPrice += (item.price * item.qty);
        cartItemsDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span>${item.name} (${item.duration}) x ${item.qty}</span>
                <span style="color:var(--accent);">${item.price * item.qty} دج</span>
            </div>
        `;
    }

    document.getElementById('cartCount').innerText = totalItems;
    
    const floatBar = document.getElementById('floatBar');
    if (totalItems > 0) {
        floatBar.style.display = 'flex';
    } else {
        floatBar.style.display = 'none';
        cartItemsDiv.innerHTML = '<p style="text-align:center; color:var(--text-sub);">السلة فارغة</p>';
    }

    calcTotal(totalPrice);
}

// --- الحاسبة وتأكيد الطلب ---
function calcTotal(baseTotal = null) {
    if (baseTotal === null) {
        baseTotal = 0;
        for (const key in cart) baseTotal += (cart[key].price * cart[key].qty);
    }
    
    let finalTotal = baseTotal;
    if (promoDiscount > 0) finalTotal = finalTotal - (finalTotal * (promoDiscount / 100));

    const method = document.getElementById('payMethod').value;
    const flexyAlert = document.getElementById('flexyAlert');
    const dollarAlert = document.getElementById('dollarAlert');

    if (flexyAlert && dollarAlert) {
        flexyAlert.style.display = 'none';
        dollarAlert.style.display = 'none';

        if (method === 'flexy') {
            finalTotal = Math.ceil(finalTotal * 1.20); 
            flexyAlert.style.display = 'block';
        } else if (method === 'binance' || method === 'redotpay') {
            dollarAlert.style.display = 'block';
        }
    }

    document.getElementById('cartTotal').innerText = Math.floor(finalTotal) + ' دج';
    document.getElementById('barTotal').innerText = Math.floor(finalTotal) + ' دج';
    return Math.floor(finalTotal);
}

function openCart() { document.getElementById('cartModal').style.display = 'flex'; updateCartUI(); }
function closeCart() { document.getElementById('cartModal').style.display = 'none'; }

function applyPromoClient() {
    const code = document.getElementById('promoInput').value.trim();
    if (code === "DISCOUNT10") { promoDiscount = 10; alert("تم تفعيل خصم 10% بنجاح!"); } 
    else { promoDiscount = 0; alert("الكود غير صحيح أو منتهي الصلاحية."); }
    calcTotal();
}

async function checkout() {
    const phone = document.getElementById('clientPhone').value;
    const payMethod = document.getElementById('payMethod').value;
    const fileInput = document.getElementById('receiptFile');
    const btn = document.querySelector('.btn-checkout');

    if (Object.keys(cart).length === 0) return alert(currentLang === 'ar' ? "السلة فارغة!" : "Le panier est vide!");
    if (!phone) return alert(currentLang === 'ar' ? "يرجى إدخال رقم الهاتف!" : "Veuillez entrer le numéro de téléphone!");
    if (fileInput.files.length === 0) return alert(currentLang === 'ar' ? "يرجى إرفاق وصل الدفع!" : "Veuillez joindre le reçu!");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';

    try {
        const file = fileInput.files[0];
        const base64File = await getBase64(file);
        
        let orderDetails = "";
        let waMessage = `*طلب جديد من المتجر* 🛒\n\n*رقم الهاتف:* ${phone}\n*طريقة الدفع:* ${payMethod}\n\n*المنتجات:*\n`;

        for (const key in cart) {
            let line = `- ${cart[key].name} (${cart[key].duration}) | الكمية: ${cart[key].qty}\n`;
            orderDetails += line;
            waMessage += line;
        }
        
        waMessage += `\n*الإجمالي:* ${calcTotal()} دج`;
        if(payMethod === 'flexy') waMessage += `\n\n⚠️ (يرجى تزويدي برقم فليكسي)`;

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

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        }).catch(e => console.log("Sent."));

        alert(currentLang === 'ar' ? "✅ سيتم تحويلك للواتساب لإرسال الوصل." : "✅ Vous serez redirigé vers WhatsApp.");
        let waUrl = `https://wa.me/213696357483?text=${encodeURIComponent(waMessage)}`;
        window.open(waUrl, '_blank');
        
        cart = {};
        updateCartUI();
        
        // إعادة تصفير الأرقام في الواجهة
        document.querySelectorAll('.qty-display').forEach(el => el.innerText = '0');
        fetchProducts(); // إعادة جلب سريعة لتصفير كل شيء
        closeCart();
        
    } catch (error) {
        alert("❌ حدث خطأ، يرجى المحاولة مرة أخرى.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fab fa-whatsapp" style="font-size:1.3rem;"></i> ${currentLang === 'ar' ? 'تأكيد وإرسال عبر واتساب' : 'Confirmer via WhatsApp'}`;
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

window.onload = fetchProducts;
