import telebot, requests, json, base64, time, re, os
from telebot import types

# ================= الإعدادات الأساسية (الآمنة) =================
# الكود الآن سيقرأ التوكنات من خزنة السيرفر (Koyeb) ولن تكون مكشوفة للعامة
TOKEN = os.environ.get('BOT_TOKEN')
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
ADMIN_IDS = ['8556546126', '5399049460']

GITHUB_REPO = 'Store1hjj/Click-store-'
FILE_PATH = 'products.json'
# ===============================================================

bot = telebot.TeleBot(TOKEN)
user_states = {}

def convert_image_link(url):
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
    if match: return f"https://drive.google.com/thumbnail?id={match.group(1)}&sz=w800"
    return url

def get_products():
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{FILE_PATH}"
        headers = {"Authorization": f"token {GITHUB_TOKEN}"}
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            data = r.json()
            content = base64.b64decode(data['content']).decode('utf-8')
            return json.loads(content), data['sha']
        return [], None
    except: return [], None

def update_products(products_list, sha):
    if not sha: return False
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{FILE_PATH}"
    headers = {"Authorization": f"token {GITHUB_TOKEN}"}
    content_str = json.dumps(products_list, indent=4, ensure_ascii=False)
    content_b64 = base64.b64encode(content_str.encode('utf-8')).decode('utf-8')
    payload = {"message": "Update via Bot", "content": content_b64, "sha": sha}
    r = requests.put(url, headers=headers, json=payload)
    return r.status_code in [200, 201]

def main_menu():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    markup.add("➕ إضافة منتج", "📦 إدارة المنتجات", "🔄 ترتيب المنتجات")
    return markup

@bot.message_handler(commands=['start'])
def start(message):
    if str(message.chat.id) not in ADMIN_IDS: return
    bot.send_message(message.chat.id, "👋 أهلاً بك! لوحة التحكم كاملة تعمل من السحابة ☁️.", reply_markup=main_menu())

# --- نظام الإضافة ---
@bot.message_handler(func=lambda m: m.text == "➕ إضافة منتج")
def add_start(message):
    if str(message.chat.id) not in ADMIN_IDS: return
    user_states[message.chat.id] = {'step': 'add_name'}
    bot.reply_to(message, "📝 أرسل اسم المنتج الجديد:")

@bot.message_handler(func=lambda m: m.text == "📦 إدارة المنتجات")
def manage(message):
    if str(message.chat.id) not in ADMIN_IDS: return
    products, sha = get_products()
    if not products: return
    markup = types.InlineKeyboardMarkup(row_width=1)
    for p in products:
        status = "✅" if p.get('active', True) else "❌"
        markup.add(types.InlineKeyboardButton(f"{status} {p['name']}", callback_data=f"menu|{p['id']}"))
    bot.send_message(message.chat.id, "اختر منتجاً لتعديله:", reply_markup=markup)

@bot.message_handler(func=lambda m: m.text == "🔄 ترتيب المنتجات")
def reorder(message):
    if str(message.chat.id) not in ADMIN_IDS: return
    products, sha = get_products()
    if not products: return
    markup = types.InlineKeyboardMarkup(row_width=1)
    for p in products:
        markup.add(types.InlineKeyboardButton(f"نقل 👈 {p['name']}", callback_data=f"premov|{p['id']}"))
    bot.send_message(message.chat.id, "🔄 اختر المنتج لنقله:", reply_markup=markup)

@bot.message_handler(func=lambda m: m.chat.id in user_states)
def handle_steps(message):
    state = user_states[message.chat.id]
    step = state['step']

    if step == 'add_name':
        state['name'] = message.text
        state['step'] = 'add_dur'
        bot.reply_to(message, "⏳ أرسل المدة:\n(ملاحظة: إذا كان هناك عدة مدد، أرسل كل مدة في سطر جديد)")

    elif step == 'add_dur':
        state['dur'] = [x.strip() for x in message.text.split('\n') if x.strip()]
        state['step'] = 'add_price'
        bot.reply_to(message, "💰 أرسل السعر:\n(بنفس ترتيب المدد، كل سعر في سطر جديد)")

    elif step == 'add_price':
        state['price'] = [x.strip() for x in message.text.split('\n') if x.strip()]
        state['step'] = 'add_img'
        bot.reply_to(message, "🖼️ أرسل رابط الصورة من Drive:")

    elif step == 'add_img':
        state['img'] = convert_image_link(message.text)
        state['step'] = 'add_cat'

        markup = types.InlineKeyboardMarkup(row_width=1)
        markup.add(
            types.InlineKeyboardButton("🔥 الأكثر مبيعاً", callback_data="cat|🔥 الأكثر مبيعاً"),
            types.InlineKeyboardButton("🎬 الترفيه والمشاهدة", callback_data="cat|🎬 الترفيه والمشاهدة"),
            types.InlineKeyboardButton("🎨 التصميم والمونتاج", callback_data="cat|🎨 التصميم والمونتاج"),
            types.InlineKeyboardButton("🤖 الذكاء الاصطناعي", callback_data="cat|🤖 الذكاء الاصطناعي"),
            types.InlineKeyboardButton("📚 التعليم واللغات", callback_data="cat|📚 التعليم واللغات")
        )
        bot.reply_to(message, "🗂️ اختر القسم:", reply_markup=markup)

    elif step.startswith('edit_'):
        field = step.split('_')[1]
        pid = state['pid']
        products, sha = get_products()
        for p in products:
            if p['id'] == pid:
                if field == 'name':
                    p['name'] = message.text
                elif field == 'prc':
                    p['price'] = [x.strip() for x in message.text.split('\n') if x.strip()]
                elif field == 'dur':
                    p['duration'] = [x.strip() for x in message.text.split('\n') if x.strip()]
                elif field == 'img':
                    p['image'] = convert_image_link(message.text)
        if update_products(products, sha): bot.send_message(message.chat.id, "✅ تم التعديل!")
        del user_states[message.chat.id]

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    products, sha = get_products()
    if not products: return
    data = call.data

    if data.startswith("cat|"):
        category = data.split("|")[1]
        state = user_states.get(call.message.chat.id)

        if state and state.get('step') == 'add_cat':
            bot.edit_message_text("⏳ جاري الرفع...", call.message.chat.id, call.message.message_id)
            new_p = {
                "id": f"p{int(time.time())}",
                "name": state['name'],
                "price": state['price'],     
                "duration": state['dur'],   
                "image": state['img'],
                "category": category,
                "active": True
            }
            products.insert(0, new_p)
            if update_products(products, sha):
                bot.send_message(call.message.chat.id, "✅ تم إضافة المنتج بنجاح!")
            else:
                bot.send_message(call.message.chat.id, "❌ خطأ في الرفع.")
            del user_states[call.message.chat.id]

    elif data.startswith("menu|"):
        pid = data.split("|")[1]
        p = next((x for x in products if x['id'] == pid), None)
        if p:
            markup = types.InlineKeyboardMarkup(row_width=2)
            markup.add(
                types.InlineKeyboardButton("📝 الاسم", callback_data=f"ed|name|{pid}"),
                types.InlineKeyboardButton("💰 السعر", callback_data=f"ed|prc|{pid}"),
                types.InlineKeyboardButton("⏳ المدة", callback_data=f"ed|dur|{pid}"),
                types.InlineKeyboardButton("🖼️ الصورة", callback_data=f"ed|img|{pid}"),
                types.InlineKeyboardButton("👁️ إخفاء/إظهار", callback_data=f"tog|{pid}"),
                types.InlineKeyboardButton("❌ حذف", callback_data=f"del|{pid}")
            )
            bot.edit_message_text(f"⚙️ خيارات: {p['name']}", call.message.chat.id, call.message.message_id, reply_markup=markup)

    elif data.startswith("ed|"):
        _, field, pid = data.split("|")
        user_states[call.message.chat.id] = {'step': f'edit_{field}', 'pid': pid}
        bot.send_message(call.message.chat.id, f"🔄 أرسل القيمة الجديدة لـ {field}\n(تذكر: يمكنك إرسال عدة أسطر):")

    elif data.startswith("premov|"):
        pid = data.split("|")[1]
        markup = types.InlineKeyboardMarkup(row_width=4)
        btns = [types.InlineKeyboardButton(str(i+1), callback_data=f"mov|{pid}|{i}") for i in range(len(products))]
        markup.add(*btns)
        bot.edit_message_text("🔢 اختر المرتبة الجديدة:", call.message.chat.id, call.message.message_id, reply_markup=markup)

    elif data.startswith("mov|"):
        _, pid, n_idx = data.split("|")
        o_idx = next((i for i, x in enumerate(products) if x['id'] == pid), -1)
        if o_idx != -1:
            item = products.pop(o_idx)
            products.insert(int(n_idx), item)
            update_products(products, sha)
            bot.answer_callback_query(call.id, "✅ تم الترتيب")
            bot.delete_message(call.message.chat.id, call.message.message.id)

    elif data.startswith("tog|"):
        pid = data.split("|")[1]
        for p in products:
            if p['id'] == pid: p['active'] = not p.get('active', True)
        update_products(products, sha)
        bot.delete_message(call.message.chat.id, call.message.message.id)

    elif data.startswith("del|"):
        pid = data.split("|")[1]
        products = [x for x in products if x['id'] != pid]
        update_products(products, sha)
        bot.delete_message(call.message.chat.id, call.message.message.id)

bot.polling(none_stop=True)
