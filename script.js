let productsData = []; 
let cart = {}; 
let promoDiscount = 0; 

// ⚠️ لا تنسَ وضع رابط السكربت نتاعك هنا
const APPS_SCRIPT_URL = 'ضع_الرابط_الجديد_هنا';

// --- الترجمة الحقيقية الشاملة ---
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
        upload_done: 'تم إرفاق الصورة',
        checkout_btn: 'تأكيد وإرسال عبر واتساب',
        promo_btn: 'تفعيل',
        promo_ph: 'لديك كود تخفيض؟',
        phone_ph: 'رقم هاتفك / Numéro de tel',
        alert_flexy: '⚠️ <b>تنبيه هام:</b> عند الدفع عن طريق فليكسي، يتم إضافة نسبة <b>20%</b> على إجمالي المبلغ كرسوم تحويل.',
        alert_dollar: '💵 <b>تنبيه:</b> سعر الصرف المحتسب هو: <b>1 دولار = 250 دج</b>.',
        sold_out: 'نفذت الكمية ❌'
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
        upload_done: 'Image jointe avec succès',
        checkout_btn: 'Confirmer via WhatsApp',
        promo_btn: 'Appliquer',
        promo_ph: 'Avez-vous un code promo ?',
        phone_ph: 'Numéro de téléphone',
        alert_flexy: '⚠️ <b>Attention :</b> Un supplément de <b>20%</b> sera appliqué au total pour les paiements Flexy.',
        alert_dollar: '💵 <b>Note :</b> Le taux de change est de : <b>1$ = 250 DA</b>.',
        sold_out: 'Épuisé ❌'
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
            if(key === 'cart_title') el.innerHTML = `<i class="fas fa-shopping-cart"></i> ` + translations[currentLang][key].replace('<i class="fas fa-shopping-cart"></i> ', '');
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });

    updateCartUI(); 
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

// --- عرض المنتجات ---
function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = ''; 

    const groupedProducts = {};
    productsList.forEach(product => {
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
            let prices = Array.isArray(p.price) ? p.price : [p.price];
            let durations = Array.isArray(p.duration) ? p.duration : [p.duration];

            const isActive = p.active !== false; 

            let selectHTML = `<select id="sel-${p.id}" class="price-select" onchange="syncDisplay('${p.id}')" ${!isActive ? 'disabled' : ''}>`;
            for(let i = 0; i < durations.length; i++) {
                let pr = prices[i] || prices[0]; 
                let dr = durations[i];
                selectHTML += `<option value="${pr}|${dr}">${dr} - ${pr} دج</option>`;
            }
            selectHTML += `</select>`;

            let imgHTML = `
                <div class="img-container">
                    <img src="${p.image}" alt="${p.name}" class="card-img" style="${!isActive ? 'filter: grayscale(100%); opacity: 0.5;' : ''}">
                    ${!isActive ? `<div class="sold-out-overlay"><div class="sold-out-text" data-i18n="sold_out">${currentLang === 'ar' ? 'نفذت الكمية ❌' : 'Épuisé ❌'}</div></div>` : ''}
                </div>
            `;

            let plusBtn = isActive
                ? `<button class="btn-qty plus" onclick="modifyCart('${p.id}', 1)">+</button>`
                : `<button class="btn-qty plus disabled" onclick="alert(currentLang === 'ar' ? 'عذراً، هذا المنتج نفذت كميته حالياً!' : 'Désolé, ce produit est en rupture de stock !')">+</button>`;
                
            let minusBtn = isActive
                ? `<button class="btn-qty minus" onclick="modifyCart('${p.id}', -1)">-</button>`
                : `<button class="btn-qty minus disabled">-</button>`;

            const card = document.createElement('div');
            card.className = 'glass-card';
            
            // تم تصغير حجم الخط واسم المنتج ليناسب الكروت الصغيرة
            card.innerHTML = `
                <div style="width:100%;">
                    ${imgHTML}
                    <h3 style="font-size:0.85rem; margin-bottom:4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</h3>
                    ${selectHTML}
                </div>
                <div class="qty-controls">
                    ${plusBtn}
                    <span id="qty-${p.id}" style="font-size:1rem; font-weight:900;">0</span>
                    ${minusBtn}
                </div>
            `;
            itemsDiv.appendChild(card);
        });
        sectionDiv.appendChild(itemsDiv);
        grid.appendChild(sectionDiv);
    }
    productsList.forEach(p => syncDisplay(p.id));
}

// --- نظام السلة ---
function modifyCart(productId, change) {
    const product = productsData.find(p => p.id === productId);
    if (!product || product.active === false) return; 

    const sel = document.getElementById(`sel-${productId}`);
    const [priceStr, durationStr] = sel.value.split('|');
    const price = parseInt(priceStr);
    const cartKey = `${productId}_${durationStr}`;

    if (!cart[cartKey]) {
        if (change < 0) return; 
        cart[cartKey] = { id: productId, name: product.name, price: price, duration: durationStr, qty: 0 };
    }

    cart[cartKey].qty += change;
    if (cart[cartKey].qty <= 0) delete cart[cartKey];

    syncDisplay(productId);
    updateCartUI();
}

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
        
        let subText = currentLang === 'ar' ? 'دج' : 'DA';
        
        cartItemsDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                <span style="direction:ltr; text-align:left; font-size:0.9rem;">${item.qty} x ${item.duration} ${item.name}</span>
                <span style="color:var(--primary); direction:ltr; font-weight:bold;">${item.price * item.qty} ${subText}</span>
            </div>
        `;
    }

    document.getElementById('cartCount').innerText = totalItems;
    
    const floatBar = document.getElementById('floatBar');
    if (totalItems > 0) {
        floatBar.style.display = 'flex';
    } else {
        floatBar.style.display = 'none';
        cartItemsDiv.innerHTML = `<p style="text-align:center; color:var(--text-sub);">${currentLang === 'ar' ? 'السلة فارغة' : 'Le panier est vide'}</p>`;
    }
    calcTotal(totalPrice);
}

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

    let curr = currentLang === 'ar' ? 'دج' : 'DA';
    document.getElementById('cartTotal').innerText = `${Math.floor(finalTotal)} ${curr}`;
    document.getElementById('barTotal').innerText = `${Math.floor(finalTotal)} ${curr}`;
    return Math.floor(finalTotal);
}

function openCart() { document.getElementById('cartModal').style.display = 'flex'; updateCartUI(); }
function closeCart() { document.getElementById('cartModal').style.display = 'none'; }

function applyPromoClient() {
    const code = document.getElementById('promoInput').value.trim();
    if (code === "DISCOUNT10") { 
        promoDiscount = 10; 
        alert(currentLang === 'ar' ? "تم تفعيل خصم 10% بنجاح!" : "Réduction de 10% appliquée avec succès !"); 
    } 
    else { 
        promoDiscount = 0; 
        alert(currentLang === 'ar' ? "الكود غير صحيح أو منتهي الصلاحية." : "Code invalide ou expiré."); 
    }
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
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (currentLang === 'ar' ? 'جاري المعالجة...' : 'Traitement en cours...');

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
            total: calcTotal() + " DZD",
            phone: phone,
            method: payMethod,
            promo: promoDiscount > 0 ? promoDiscount + "%" : "لا يوجد",
            image: base64File.split(',')[1], 
            filename: file.name
        };

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
        }).catch(e => console.log("Sent"));

        alert(currentLang === 'ar' ? "✅ سيتم تحويلك للواتساب لإرسال الوصل." : "✅ Vous serez redirigé vers WhatsApp.");
        let waUrl = `https://wa.me/213696357483?text=${encodeURIComponent(waMessage)}`;
        window.open(waUrl, '_blank');
        
        cart = {};
        updateCartUI();
        document.querySelectorAll('.qty-display').forEach(el => el.innerText = '0');
        fetchProducts(); 
        closeCart();
        
    } catch (error) {
        alert(currentLang === 'ar' ? "❌ حدث خطأ، يرجى المحاولة مرة أخرى." : "❌ Une erreur s'est produite, veuillez réessayer.");
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
