// الرابط الدائم الخاص بك
const API_URL = "https://script.google.com/macros/s/AKfycby0rXzRTL8Xqx_urL3yl-a0AmgClCZH5-1PL2dQWzf4owzVnjA5NN7mL6OhJSsN3Fxmbg/exec";
const GITHUB_USER = "Store1hjj"; 
const GITHUB_REPO = "Click-store-"; 
const ADMIN_PHONE = "213696357483"; 

let products = []; let cart = []; let baseTotal = 0; let discountPercent = 0; let appliedPromoCode = "";
let promoCodes = JSON.parse(localStorage.getItem('promo_db')) || [];

const dict = {
    ar: {
        hero_title: "اكتشف عالم<br><span style='color: var(--primary);'>الاشتراكات الرقمية</span>",
        hero_sub: "خدمة فورية، أسعار تنافسية، وضمان كامل.",
        sold_out: "نفذت الكمية",
        bar_total_label: "الإجمالي الحالي:",
        bar_btn: "أكمل وأكد طلبك 🚀",
        cart_title: "<i class='fas fa-shopping-cart'></i> السلة",
        apply_btn: "تطبيق",
        total_label: "الإجمالي:",
        pay_method_label: "اختر طريقة الدفع:",
        flexy_alert: "تنبيه: سيتم إضافة 20% رسوم فليكسي.",
        upload_btn: "أرفق صورة وصل الدفع (إجباري)",
        checkout_btn: "تأكيد وإرسال الطلب"
    },
    fr: {
        hero_title: "Découvrez le monde des<br><span style='color: var(--primary);'>Abonnements Numériques</span>",
        hero_sub: "Service instantané, prix compétitifs, garantie totale.",
        sold_out: "Épuisé",
        bar_total_label: "Total Actuel:",
        bar_btn: "Confirmer la commande 🚀",
        cart_title: "<i class='fas fa-shopping-cart'></i> Panier",
        apply_btn: "Appliquer",
        total_label: "Total:",
        pay_method_label: "Méthode de paiement:",
        flexy_alert: "Attention: 20% de frais Flexy seront ajoutés.",
        upload_btn: "Joindre le reçu (Obligatoire)",
        checkout_btn: "Confirmer et Envoyer"
    }
};

let currentLang = 'ar';
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'fr' : 'ar';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.querySelector('.lang-btn').innerHTML = `<i class="fas fa-globe"></i> ${currentLang === 'ar' ? 'FR' : 'AR'}`;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang][key]) el.innerHTML = dict[currentLang][key];
    });
    renderProducts(); 
}

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'Kx9_Admin_Pro_Secret_2026_vX';

if(isAdmin) {
    document.getElementById('storeView').style.display = 'none';
    document.getElementById('adminView').style.display = 'block';
    document.getElementById('pendingOrders').innerText = localStorage.getItem('admin_orders_count') || "0";
    renderPromoAdmin();
}

async function fetchProducts() {
    try {
        const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/products.json?v=${new Date().getTime()}`;
        const response = await fetch(url);
        if(response.ok) { products = await response.json(); if(!isAdmin) renderProducts(); }
    } catch(error) {}
}

function renderProducts() {
    const grid = document.getElementById('productsGrid'); grid.innerHTML = '';
    products.forEach(prod => {
        const isActive = prod.active !== false;
        const durations = String(prod.duration).split('\n');
        const prices = String(prod.price).split('\n');
        let optionsHtml = '';
        durations.forEach((dur, i) => {
            if(dur.trim() !== '') {
                let cleanPrice = parseInt((prices[i] ? prices[i] : prices[0]).replace(/\D/g, '')) || 0;
                optionsHtml += `<option value="${cleanPrice}|${dur.trim()}">${dur.trim()}</option>`;
            }
        });

        grid.innerHTML += `
            <div class="card">
                <div class="img-box">
                    <img src="${prod.image}" alt="Product">
                    ${!isActive ? `<div class="sold-out-overlay"><div class="sold-out-stamp">${dict[currentLang].sold_out}</div></div>` : ''}
                </div>
                <div class="prod-title">${prod.name}</div>
                <select class="variant-select" id="sel-${prod.id}" onchange="updateUI('${prod.id}')" ${!isActive ? 'disabled' : ''}>${optionsHtml}</select>
                <div class="qty-controls" style="${!isActive ? 'opacity:0.3; pointer-events:none;' : ''}">
                    <button class="btn-qty btn-plus" onclick="modifyCart('${prod.id}', 1)">+</button>
                    <span class="qty-display" id="qty-${prod.id}">0</span>
                    <button class="btn-qty btn-minus" onclick="modifyCart('${prod.id}', -1)">-</button>
                </div>
                <div class="price-tag" id="price-${prod.id}">${parseInt((prices[0]||"0").replace(/\D/g, ''))} دج</div>
            </div>`;
        updateUI(prod.id);
    });
    setupAnimations();
}

function setupAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('show'); }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card').forEach(card => observer.observe(card));
}

function updateUI(id) {
    const select = document.getElementById(`sel-${id}`);
    if(!select) return;
    const [price, duration] = select.value.split('|');
    document.getElementById(`price-${id}`).innerText = price + " دج";
    const item = cart.find(x => x.key === `${id}_${duration}`);
    document.getElementById(`qty-${id}`).innerText = item ? item.qty : "0";
}

function modifyCart(id, change) {
    const prod = products.find(p => p.id === id); if(!prod) return;
    const select = document.getElementById(`sel-${id}`);
    const [priceStr, duration] = select.value.split('|');
    const key = `${id}_${duration}`;
    let item = cart.find(x => x.key === key);
    
    if(item) { item.qty += change; if(item.qty <= 0) cart = cart.filter(x => x.key !== key); } 
    else if (change > 0) { cart.push({ key, name: prod.name, duration, price: parseInt(priceStr), qty: 1 }); }
    
    updateUI(id); updateCartUI();
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').innerText = count;
    baseTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const floatBar = document.getElementById('floatBar');
    if(cart.length > 0) {
        floatBar.classList.add('active');
        document.getElementById('barTotal').innerText = baseTotal + " دج";
    } else { floatBar.classList.remove('active'); }

    calcTotal();
    const list = document.getElementById('cartItems');
    if(cart.length === 0) list.innerHTML = `<p style="text-align:center; color:#9ca3af; font-weight:bold;">${currentLang==='ar'?'السلة فارغة':'Panier vide'}</p>`;
    else list.innerHTML = cart.map(i => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.05);">
            <div style="text-align: left;">
                <div style="font-weight:900; color:#fff;">${i.name}</div>
                <div style="font-size:0.85rem; color:var(--text-sub); font-weight:bold;">${i.duration} - ${i.price} دج</div>
            </div>
            <div style="font-weight:900; color:var(--primary); font-size:1.2rem;">x${i.qty}</div>
        </div>`).join('');
}

function calcTotal() {
    const method = document.getElementById('payMethod').value;
    const details = document.getElementById('payDetails');
    const fileUploadSection = document.querySelector('.file-upload-wrapper');
    
    let finalTotal = baseTotal - (baseTotal * discountPercent);
    
    document.getElementById('alertFlexy').style.display = 'none'; 
    document.getElementById('alertCrypto').style.display = 'none';
    fileUploadSection.style.display = 'block'; 

    if(method === 'flexy') { 
        finalTotal = Math.ceil(finalTotal * 1.20); 
        document.getElementById('alertFlexy').style.display = 'block'; 
        details.innerHTML = (currentLang === 'ar') ? `سيتم توجيهك للواتساب للحصول على رقم الفليكسي 📲` : `Vous serez redirigé vers WhatsApp pour obtenir le numéro Flexy 📲`; 
        fileUploadSection.style.display = 'none'; 
    } 
    else if(method === 'ccp') { details.innerHTML = `CCP: <b style="color:var(--accent); font-size:1.1rem;">00799999002892667082</b><br>Name: M. MEHDI YOUCEF CHERIF`; } 
    else if(method === 'binance') { document.getElementById('alertCrypto').style.display = 'block'; details.innerHTML = `Binance ID: <b style="color:var(--accent); font-size:1.1rem;">534110294</b>`; } 
    else if(method === 'redotpay') { document.getElementById('alertCrypto').style.display = 'block'; details.innerHTML = `RedotPay ID: <b style="color:var(--accent); font-size:1.1rem;">1972824467</b>`; }
    
    document.getElementById('cartTotal').innerText = finalTotal + " دج";
}

function applyPromoClient() {
    const codeInput = document.getElementById('promoInput').value.toUpperCase();
    const promo = promoCodes.find(p => p.code === codeInput && p.expiry > new Date().getTime());
    if(promo) { discountPercent = promo.val / 100; appliedPromoCode = promo.code; alert(`✅ -${promo.val}%`); } 
    else { discountPercent = 0; appliedPromoCode = ""; alert('❌ Code Invalide'); }
    calcTotal();
}

function addPromoCode() {
    const code = document.getElementById('newCodeName').value.toUpperCase(); const val = parseInt(document.getElementById('newCodeVal').value); const days = parseInt(document.getElementById('newCodeDays').value);
    if(!code || isNaN(val) || isNaN(days)) return;
    promoCodes.push({ code, val, expiry: new Date().getTime() + (days * 24 * 60 * 60 * 1000) });
    localStorage.setItem('promo_db', JSON.stringify(promoCodes)); renderPromoAdmin();
}

function delPromo(index) { promoCodes.splice(index, 1); localStorage.setItem('promo_db', JSON.stringify(promoCodes)); renderPromoAdmin(); }

function renderPromoAdmin() {
    const now = new Date().getTime(); promoCodes = promoCodes.filter(p => p.expiry > now); localStorage.setItem('promo_db', JSON.stringify(promoCodes));
    const list = document.getElementById('promoList');
    if(promoCodes.length === 0) { list.innerHTML = `<tr><td colspan="4">--</td></tr>`; return; }
    list.innerHTML = promoCodes.map((p, i) => `<tr><td style="color:var(--primary); font-weight:bold;">${p.code}</td><td>${p.val}%</td><td>${new Date(p.expiry).getDate()}/${new Date(p.expiry).getMonth()+1}</td><td><button class="btn-delete" onclick="delPromo(${i})"><i class="fas fa-trash"></i></button></td></tr>`).join('');
}

function openCart() { document.getElementById('cartModal').style.display = 'flex'; document.getElementById('floatBar').classList.remove('active'); updateCartUI(); }
function closeCart() { document.getElementById('cartModal').style.display = 'none'; updateCartUI(); }

function checkout() {
    const phone = document.getElementById('clientPhone').value;
    const fileInput = document.getElementById('receiptFile');
    const method = document.getElementById('payMethod').value;
    const methodUpper = method.toUpperCase();

    if(cart.length === 0 || phone.length < 9) { 
        alert(currentLang==='ar' ? '⚠️ يرجى التأكد من السلة وكتابة رقم الهاتف بشكل صحيح' : '⚠️ Vérifiez le panier et le numéro'); 
        return; 
    }
    
    if(method !== 'flexy' && fileInput.files.length === 0) {
        alert(currentLang==='ar' ? '⚠️ يرجى إرفاق صورة وصل الدفع لتأكيد الطلب!' : '⚠️ Veuillez joindre le reçu de paiement!');
        return;
    }

    const btn = document.querySelector('.btn-checkout'); const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...'; btn.disabled = true;

    const promo = discountPercent > 0 ? appliedPromoCode : "لا يوجد";
    const itemsText = cart.map(i => `▪️ ${i.name} (${i.duration}) ✖️ ${i.qty}`).join('\n');
    const total = document.getElementById('cartTotal').innerText;

    const sendToServer = (base64Data, fileName) => {
        const payload = { 
            phone: phone, 
            items: itemsText, 
            total: total, 
            method: methodUpper, 
            promo: promo,
            image: base64Data, 
            filename: fileName 
        };

        fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify(payload) 
        })
        .then(response => response.text())
        .then(responseText => {
            localStorage.setItem('admin_orders_count', (parseInt(localStorage.getItem('admin_orders_count')) || 0) + 1);
            
            let finalLink = "";
            if (method === 'flexy') {
                finalLink = "الدفع سيتم عبر الفليكسي (لا يوجد وصل حالياً)";
            } else {
                let urlMatch = responseText.match(/https?:\/\/[^\s"']+/);
                if(urlMatch) finalLink = urlMatch[0];
                else if (responseText.includes("http")) finalLink = responseText;
                else finalLink = "لم يتم إرجاع الرابط من السيرفر";
            }
            
            let waText = `*طلب جديد من المتجر* 🛒\n\n*رقم الهاتف:* ${phone}\n\n*المنتجات:*\n${cart.map(i => `▪️ ${i.name} (${i.duration}) ✖️ ${i.qty}`).join('\n')}\n\n*طريقة الدفع:* ${methodUpper}\n*الإجمالي:* ${total}\n`;
            
            if(method === 'flexy') {
                waText += `\n*أريد رقم الفليكسي من فضلك للدفع.*`;
            } else {
                waText += `\n*رابط وصل الدفع:* 👇\n${finalLink}`;
            }

            document.getElementById('cartContentArea').innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <i class="fas fa-check-circle" style="font-size: 5rem; color: #10b981; margin-bottom: 20px;"></i>
                    <h2 style="color: #fff; margin-bottom: 10px;">${currentLang==='ar'?'تم تأكيد الطلب بنجاح!':'Commande confirmée!'}</h2>
                    <p style="color: var(--text-sub); margin-bottom: 20px;">${currentLang==='ar'?'جاري تحويلك للواتساب...':'Redirection vers WhatsApp...'}</p>
                </div>`; 
            cart = [];

            setTimeout(() => {
                window.location.href = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(waText)}`;
                setTimeout(() => { window.location.reload(); }, 2000);
            }, 1000);

        }).catch((err) => { 
            const fallbackText = `*طلب جديد من المتجر* 🛒\n\n*رقم الهاتف:* ${phone}\n*الإجمالي:* ${total}\n(ملاحظة: راجع التليجرام لرؤية التفاصيل)`;
            window.location.href = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(fallbackText)}`;
            setTimeout(() => { window.location.reload(); }, 2000);
        });
    };

    if(method === 'flexy') {
        sendToServer("", ""); 
    } else {
        const reader = new FileReader(); 
        reader.onload = e => { 
            sendToServer(e.target.result.split(',')[1], `rec_${phone}.jpg`);
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

fetchProducts();
