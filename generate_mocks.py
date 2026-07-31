import os
import json
import random
import uuid
from datetime import datetime, timedelta
import unicodedata
import re

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text

target_dir = r"C:\Users\dell\.gemini\antigravity\scratch\MeetWork\src\data\talepler"
os.makedirs(target_dir, exist_ok=True)

urunler = [
    "Endüstriyel Temizlik Malzemesi", "Ofis Mobilyası", "İş Güvenliği Ekipmanı (Baret, Eldiven)",
    "Sunucu ve Ağ Cihazları", "CNC Freze Tezgahı Parçaları", "Personel Taşıma Hizmeti",
    "Yemek ve Catering Hizmeti", "Forklift Aküsü", "Paslanmaz Çelik Boru", "Ambalaj ve Koli",
    "Pazarlama Ajansı Danışmanlığı", "ISO 9001 Denetim Hizmeti", "Jeneratör Bakım Hizmeti",
    "Güneş Paneli Sistemi Kurulumu", "Kurumsal Promosyon Ürünleri", "Yedek Parça ve Rulman",
    "Ağır Yük Nakliye Hizmeti", "Soğuk Hava Deposu Bakımı", "Yangın Söndürme Sistemleri",
    "Kablo ve Elektrik Malzemeleri", "Alüminyum Profil", "Polietilen Hammadde",
    "Vinç Kiralama Hizmeti", "Güvenlik Kamerası (CCTV) Kurulumu", "Matbaa ve Broşür Basımı"
]

for i in range(500):
    rfq_id = str(243000 + i)
    urun = random.choice(urunler)
    
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
      "items": [
        {
          "name": urun,
          "quantity": f"{random.randint(1, 500)} Adet/Paket"
        }
      ]
    }
    
    with open(os.path.join(target_dir, f"{rfq_id}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("50 adet örnek talep başarıyla oluşturuldu.")
