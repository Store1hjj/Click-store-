// ==========================================
// إعدادات المتجر الأساسية
// ==========================================
let productsData = []; // لتخزين المنتجات القادمة من جيتهاب
let cart = {}; // لتخزين السلة { id: {product, qty} }
let promoDiscount = 0; // نسبة التخفيض إن وجدت

// ⚠️ ضع رابط سكربت إرسال الطلبات إلى تليجرام هنا (Apps Script URL)
const APPS_SCRIPT_URL = 'ضع_رابط_سكربت_جوجل_هنا_يا_مهندس';

// ==========================================
// جلب وعرض المنتجات من GitHub
// ==========================================
async function fetchProducts() {
    try {
        // نستخدم raw.githubusercontent لتخطي الكاش وجلب الملف بسرعة
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

// ==========================================
// دالة عرض المنتجات مقسمة حسب الأقسام (Categories)
// ==========================================
function renderProducts(productsList) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = ''; // مسح علامة التحميل

    // 1. تجميع المنتجات
    const groupedProducts = {};
    productsList.forEach(product => {
        // إذا كان المنتج مخفياً من لوحة التحكم لا نعرضه
        if (product.active === false) return; 

        // القسم الافتراضي إذا لم نحدد قسماً في البوت
        const categoryName = product.category || "🔥 الأكثر مبيعاً"; 
        
        if (!groupedProducts[categoryName]) {
            groupedProducts[categoryName] = [];
        }
        groupedProducts[categoryName].push(product);
    });

    // 2. رسم الأقسام
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

        // رسم البطاقات
        items.forEach(p => {
            let qty = cart[p.id] ? cart[p.id].qty : 0;
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.innerHTML = `
                <img src="${p.image}" alt="${p.name}" style="width:100%; border-radius:10px; margin-bottom:10px; aspect-ratio:1/1; object-fit:cover;">
                <h3 style="font-size:1.1rem; margin-bottom:5px;">${p.name}</h3>
                <p style="color:var(--text-sub); font-size:0.9rem; margin-bottom:10px;">${p.duration} - <strong style="color:var(--accent);">${p.price} دج</strong></p>
                
                <div class="qty-controls">
                    <button onclick="updateCart('${p.id}', 1)">+</button>
                    <span id="qty-${p.id}">${qty}</span>
                    <button onclick="updateCart('${p.id}', -1)" style="background:rgba(255,255,255,0.1);">-</button>
                </div>
            `;
            itemsDiv.appendChild(card);
        });

        sectionDiv.appendChild(itemsDiv);
        grid.appendChild(sectionDiv);
    }
}

// ==========================================
// إدارة السلة (Cart Management)
// ==========================================
function updateCart(productId, change) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    if (!cart[productId]) {
        cart[productId] = { ...product, qty: 0 };
    }

    cart[productId].qty += change;

    // منع الكمية السالبة
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

        // إضافة العنصر إلى نافذة السلة
        cartItemsDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span>${item.name} (${item.duration}) x ${item.qty}</span>
                <span style="color:var(--accent);">${parseInt(item.price) * item.qty} دج</span>
            </div>
        `;
    }

    // تحديث الأرقام في الشريط العائم وأيقونة السلة
    document.getElementById('cartCount').innerText = totalItems;
    document.getElementById('barTotal').innerText = totalPrice + ' دج';
    
    // إظهار أو إخفاء الشريط العائم
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
    
    // تطبيق التخفيض إن وجد
    if (promoDiscount > 0) {
        finalTotal = finalTotal - (finalTotal * (promoDiscount / 100));
    }

    document.getElementById('cartTotal').innerText = Math.floor(finalTotal) + ' دج';
    return Math.floor(finalTotal);
}

// نوافذ السلة (فتح وإغلاق)
function openCart() {
    document.getElementById('cartModal').style.display = 'flex';
    updateCartUI();
}

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

// كود التخفيض
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

// ==========================================
// إرسال الطلب (Checkout)
// ==========================================
async function checkout() {
    const phone = document.getElementById('clientPhone').value;
    const payMethod = document.getElementById('payMethod').value;
    const fileInput = document.getElementById('receiptFile');
    const btn = document.querySelector('.btn-checkout');

    // التحقق من البيانات
    if (Object.keys(cart).length === 0) return alert("السلة فارغة!");
    if (!phone) return alert("يرجى إدخال رقم الهاتف!");
    if (fileInput.files.length === 0) return alert("يرجى إرفاق وصل الدفع!");

    // تعطيل الزر لمنع الضغط المتكرر
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const file = fileInput.files[0];
        const base64File = await getBase64(file);
        
        let orderDetails = "";
        for (const id in cart) {
            orderDetails += `- ${cart[id].name} (${cart[id].duration}) | الكمية: ${cart[id].qty}\n`;
        }

        const payload = {
            orderData: orderDetails,
            total: calcTotal(),
            phone: phone,
            payMethod: payMethod,
            receiptBase64: base64File.split(',')[1], 
            mimeType: file.type,
            fileName: file.name
        };

        // إرسال الطلب إلى Apps Script
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload) 
        });

        const result = await response.text();
        
        alert("✅ تم استلام طلبك بنجاح! سنتواصل معك قريباً.");
        
        // تفريغ السلة وإغلاق النافذة
        cart = {};
        updateCartUI();
        closeCart();
        
    } catch (error) {
        console.error("Error submitting order:", error);
        alert("❌ حدث خطأ أثناء إرسال الطلب، يرجى المحاولة عبر الواتساب.");
    } finally {
        // إعادة تفعيل الزر
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> تأكيد الطلب';
    }
}

// دالة تحويل الصورة إلى Base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ==========================================
// تغيير اللغة
// ==========================================
function toggleLanguage() {
    alert("ميزة تغيير اللغة قيد التطوير!");
}

// تشغيل جلب المنتجات عند فتح الموقع
window.onload = fetchProducts;
