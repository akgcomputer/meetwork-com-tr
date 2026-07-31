import os
import json
import random
import unicodedata
import re
from datetime import datetime, timedelta

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text

target_dir = r"C:\Users\dell\.gemini\antigravity\scratch\MeetWork\src\data\talepler"
os.makedirs(target_dir, exist_ok=True)

# Kategori listesi (İsim, Emoji, Zemin Rengi)
categories = [
    {"name": "Teknoloji & Yazılım", "emoji": "💻", "color": "#0F172A"}, # Dark Blue
    {"name": "E-Ticaret & Pazarlama", "emoji": "🛒", "color": "#7C3AED"}, # Purple
    {"name": "Sağlık & Tıbbi Cihaz", "emoji": "🩺", "color": "#06B6D4"}, # Cyan
    {"name": "Enerji & Yenilenebilir", "emoji": "⚡", "color": "#EAB308"}, # Yellow
    {"name": "Gıda & Tarım", "emoji": "🍎", "color": "#EF4444"}, # Red
    {"name": "Eğitim Teknolojileri", "emoji": "📚", "color": "#3B82F6"}, # Blue
    {"name": "Lojistik & Tedarik", "emoji": "🚚", "color": "#F97316"}, # Orange
    {"name": "Savunma & Havacılık", "emoji": "🚀", "color": "#475569"}, # Slate
    {"name": "İHA-SİHA Teknolojileri", "emoji": "🚁", "color": "#1E293B"}, # Darker Slate
    {"name": "Moda & Tekstil", "emoji": "👕", "color": "#EC4899"}, # Pink
    {"name": "Turizm & Seyahat", "emoji": "✈️", "color": "#0EA5E9"}, # Sky
    {"name": "Çevre Teknolojileri", "emoji": "🌿", "color": "#22C55E"}, # Green
    {"name": "Finansal Teknolojiler", "emoji": "💰", "color": "#14B8A6"}, # Teal
    {"name": "Yapı & İnşaat", "emoji": "🏗️", "color": "#8B5CF6"}, # Violet
    {"name": "Biyoteknoloji & Genetik", "emoji": "🧬", "color": "#A855F7"}, # Purple
    {"name": "Otomotiv", "emoji": "🚗", "color": "#DC2626"}, # Red darker
    {"name": "Makine Sanayi", "emoji": "⚙️", "color": "#52525B"}, # Zinc
    {"name": "Gıda Üretimi", "emoji": "🥐", "color": "#D97706"}, # Amber
    {"name": "Kozmetik & Kimya", "emoji": "🧪", "color": "#D946EF"}, # Fuchsia
    {"name": "Metal & Maden", "emoji": "💎", "color": "#94A3B8"}, # Slate light
    {"name": "Hizmet Sektörü", "emoji": "🍽️", "color": "#F59E0B"}, # Amber lighter
    {"name": "Sigorta Sektörü", "emoji": "💼", "color": "#2563EB"}, # Royal Blue
    {"name": "Hukuk Sektörü", "emoji": "⚖️", "color": "#1E3A8A"}, # Dark Blue
    {"name": "Servis Sektörü", "emoji": "🔧", "color": "#64748B"}  # Slate grayish
]

urunler = [
    "Endüstriyel Temizlik Malzemesi", "Ofis Mobilyası", "İş Güvenliği Ekipmanı",
    "Sunucu ve Ağ Cihazları", "CNC Freze Tezgahı Parçaları", "Personel Taşıma Hizmeti",
    "Yemek ve Catering Hizmeti", "Forklift Aküsü", "Paslanmaz Çelik Boru", "Ambalaj ve Koli"
]

for i in range(2500):
    rfq_id = str(244000 + i)
    urun = random.choice(urunler)
    cat = random.choice(categories)
    
    title = f"{urun} Alım Talebi"
    slug = f"{slugify(title)}-{rfq_id}"
    
    publish_date = datetime.now() - timedelta(hours=random.randint(1, 72))
    end_date = publish_date + timedelta(days=random.randint(1, 7))
    
    data = {
      "id": rfq_id,
      "title": title,
      "slug": slug,
      "company": "Gizli Müşteri",
      "status": "Teklif Aşamasında",
      "publishDate": publish_date.isoformat(),
      "endDate": end_date.isoformat(),
      "category": cat["name"],
      "categoryEmoji": cat["emoji"],
      "categoryColor": cat["color"],
      "items": [
        {
          "name": urun,
          "quantity": f"{random.randint(1, 500)} Adet/Paket"
        }
      ]
    }
    
    with open(os.path.join(target_dir, f"{rfq_id}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("2500 adet kategorili örnek talep başarıyla oluşturuldu.")
