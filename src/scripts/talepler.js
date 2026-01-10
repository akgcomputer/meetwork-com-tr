/**
 * MeetWork Talep Paylaşım Sistemi - Ana JavaScript Dosyası
 * Pop-up yönetimi, sosyal paylaşım ve görsel indirme fonksiyonları
 */

// XSS Koruması için HTML Escape Fonksiyonu
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Gradient Kombinasyonları (15 farklı kombinasyon)
const gradients = [
    { class: 'gradient-0', colors: ['#e53935', '#1a1a1a'], direction: '135deg' },
    { class: 'gradient-1', colors: ['#1a1a1a', '#e53935'], direction: '135deg' },
    { class: 'gradient-2', colors: ['#e53935', '#ffffff'], direction: '180deg' },
    { class: 'gradient-3', colors: ['#ffffff', '#e53935'], direction: '180deg' },
    { class: 'gradient-4', colors: ['#ff6b6b', '#1a1a1a', '#e53935'], direction: '45deg' },
    { class: 'gradient-5', colors: ['#1a1a1a', '#ff8a80', '#e53935'], direction: '225deg' },
    { class: 'gradient-6', colors: ['#b71c1c', '#1a1a1a', '#e53935'], direction: '90deg' },
    { class: 'gradient-7', colors: ['#e53935', '#212121'], direction: '270deg' },
    { class: 'gradient-8', colors: ['#2c2c2c', '#e53935', '#ffcdd2', '#e53935', '#2c2c2c'], direction: '135deg' },
    { class: 'gradient-9', colors: ['#1a1a1a', '#e53935', '#ffffff'], direction: '45deg' },
    { class: 'gradient-10', colors: ['#ffebee', '#e53935', '#1a1a1a'], direction: '225deg' },
    { class: 'gradient-11', colors: ['#ffffff', '#e53935'], direction: '90deg' },
    { class: 'gradient-12', colors: ['#e53935', '#ffffff'], direction: '270deg' },
    { class: 'gradient-13', colors: ['#e53935', '#1a1a1a'], direction: 'radial' },
    { class: 'gradient-14', colors: ['#1a1a1a', '#c62828'], direction: '135deg' }
];

// Rastgele Gradient Seçimi
function getRandomGradient() {
    const randomIndex = Math.floor(Math.random() * gradients.length);
    return gradients[randomIndex];
}

// Pop-up Açma Fonksiyonu
function openPaylasimPopup(talepId) {
    const overlay = document.getElementById('paylasim-popup-overlay');
    const content = document.getElementById('paylasim-popup-content');

    if (!overlay || !content) {
        console.error('Pop-up elementleri bulunamadı!');
        return;
    }

    // Talep verilerini getir
    const talepData = getTalepById(talepId);
    if (!talepData) {
        console.error('Talep verisi bulunamadı!');
        return;
    }

    // Pop-up içeriğini doldur
    populatePopupContent(talepData);

    // Random gradient uygula
    const gradient = getRandomGradient();
    content.className = 'paylasim-popup-content ' + gradient.class;

    // Pop-up'ı göster
    overlay.classList.add('active');

    // Body scroll'u engelle
    document.body.style.overflow = 'hidden';

    console.log('Pop-up açıldı. Gradient:', gradient.class);
}

// Pop-up Kapatma Fonksiyonu
function closePaylasimPopup() {
    const overlay = document.getElementById('paylasim-popup-overlay');

    if (!overlay) {
        return;
    }

    // Animasyon ile kapat
    overlay.classList.add('closing');

    setTimeout(() => {
        overlay.classList.remove('active', 'closing');
        document.body.style.overflow = '';
    }, 300);

    console.log('Pop-up kapatıldı');
}

// Pop-up İçeriğini Doldur
function populatePopupContent(talep) {
    // Elementleri seç
    const elements = {
        baslik: document.getElementById('popup-baslik'),
        aciklama: document.getElementById('popup-aciklama'),
        firma: document.getElementById('popup-firma'),
        bolge: document.getElementById('popup-bolge'),
        sektor: document.getElementById('popup-sektor'),
        tip: document.getElementById('popup-tip'),
        tarih: document.getElementById('popup-tarih')
    };

    // Her elementi güvenli bir şekilde doldur
    if (elements.baslik) elements.baslik.textContent = escapeHtml(talep.talepBasligi);
    if (elements.aciklama) elements.aciklama.textContent = escapeHtml(talep.talepAciklamasi);
    if (elements.firma) elements.firma.textContent = escapeHtml(talep.firmaAdi);
    if (elements.bolge) elements.bolge.textContent = escapeHtml(talep.bolge);
    if (elements.sektor) elements.sektor.textContent = escapeHtml(talep.sektorAdi);
    if (elements.tip) elements.tip.textContent = escapeHtml(talep.talepTipi);
    if (elements.tarih) elements.tarih.textContent = escapeHtml(talep.tarih);

    // Paylaşım butonları için veri özelliklerini güncelle
    const shareButtons = document.querySelectorAll('.paylasim-btn[data-talep-id]');
    shareButtons.forEach(btn => {
        btn.setAttribute('data-talep-id', talep.id);
    });

    // İndirme butonu için
    const indirBtn = document.getElementById('btn-indir');
    if (indirBtn) {
        indirBtn.setAttribute('data-talep-id', talep.id);
    }
}

// ID'ye Göre Talep Getirme
function getTalepById(id) {
    // Global talepVerileri değişkenini kontrol et
    if (typeof talepVerileri !== 'undefined') {
        return talepVerileri.talepler.find(t => t.id === id);
    }

    // Alternatif olarak localStorage'dan oku
    try {
        const storedData = localStorage.getItem('talepler');
        if (storedData) {
            const data = JSON.parse(storedData);
            return data.talepler.find(t => t.id === id);
        }
    } catch (e) {
        console.error('Veri okuma hatası:', e);
    }

    return null;
}

// WhatsApp Paylaşımı
function shareToWhatsApp(talepId) {
    const talep = getTalepById(talepId);
    if (!talep) return;

    const text = `📋 *MeetWork Talep Bilgisi*\n\n` +
        `*${escapeHtml(talep.talepBasligi)}*\n\n` +
        `🏢 ${escapeHtml(talep.firmaAdi)}\n` +
        `📍 ${escapeHtml(talep.bolge)}\n` +
        `🏷️ ${escapeHtml(talep.sektorAdi)}\n` +
        `📅 ${escapeHtml(talep.tarih)}\n\n` +
        `🔗 meetwork.com.tr`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    console.log('WhatsApp paylaşımı başlatıldı:', talep.talepBasligi);
}

// LinkedIn Paylaşımı
function shareToLinkedIn(talepId) {
    const talep = getTalepById(talepId);
    if (!talep) return;

    const url = encodeURIComponent('https://panel.meetwork.net/talep/' + talepId);
    const title = encodeURIComponent(escapeHtml(talep.talepBasligi));

    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;

    window.open(linkedInUrl, '_blank', 'width=600,height=400');

    console.log('LinkedIn paylaşımı başlatıldı:', talep.talepBasligi);
}

// Görsel İndirme (html2canvas kullanarak)
async function downloadAsImage(talepId) {
    const talep = getTalepById(talepId);
    if (!talep) return;

    const btn = document.getElementById('btn-indir');
    if (btn) {
        btn.classList.add('loading');
    }

    try {
        // html2canvas kütüphanesini kontrol et
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas kütüphanesi yüklenemedi!');
        }

        const element = document.getElementById('paylasim-popup-content');

        // Canvas oluştur
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            width: 540,
            height: 960,
            logging: false
        });

        // Download linki oluştur
        const link = document.createElement('a');
        link.download = `meetwork-talep-${talepId}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        console.log('Görsel indirildi:', link.download);
    } catch (error) {
        console.error('İndirme hatası:', error);
        alert('Görsel indirme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
        if (btn) {
            btn.classList.remove('loading');
        }
    }
}

// Instagram Paylaşımı (Manuel - görsel indirilir)
function shareToInstagram(talepId) {
    const btn = document.querySelector(`.paylasim-btn-instagram[data-talep-id="${talepId}"]`);
    if (btn) {
        btn.classList.add('loading');
    }

    // Önce indir, sonra kullanıcıya bilgi ver
    downloadAsImage(talepId).then(() => {
        alert('Görsel indirildi! Instagram uygulamasından paylaşabilirsiniz.');
    }).catch(() => {
        alert('İndirme başarısız oldu. Lütfen tekrar deneyin.');
    }).finally(() => {
        if (btn) {
            btn.classList.remove('loading');
        }
    });
}

// Event Listener Kurulumu
function initEventListeners() {
    // ESC tuşu ile kapatma
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('paylasim-popup-overlay');
            if (overlay && overlay.classList.contains('active')) {
                closePaylasimPopup();
            }
        }
    });

    // Overlay click ile kapatma
    const overlay = document.getElementById('paylasim-popup-overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closePaylasimPopup();
            }
        });
    }

    // Kapatma butonu
    const closeBtn = document.getElementById('paylasim-kapat-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePaylasimPopup);
    }

    // Paylaşım butonları - Event Delegation
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-paylasim-action]');
        if (!target) return;

        const action = target.getAttribute('data-paylasim-action');
        const talepId = parseInt(target.getAttribute('data-talep-id'));

        if (!talepId) return;

        switch (action) {
            case 'whatsapp':
                shareToWhatsApp(talepId);
                break;
            case 'instagram':
                shareToInstagram(talepId);
                break;
            case 'linkedin':
                shareToLinkedIn(talepId);
                break;
            case 'indir':
                downloadAsImage(talepId);
                break;
        }
    });

    console.log('Event listener\'ları başlatıldı');
}

// Sayfa yüklendiğinde init
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    console.log('MeetWork Talep Paylaşım Sistemi yüklendi');
});

// Global fonksiyonları expose et
window.openPaylasimPopup = openPaylasimPopup;
window.closePaylasimPopup = closePaylasimPopup;
window.shareToWhatsApp = shareToWhatsApp;
window.shareToLinkedIn = shareToLinkedIn;
window.downloadAsImage = downloadAsImage;
window.shareToInstagram = shareToInstagram;
