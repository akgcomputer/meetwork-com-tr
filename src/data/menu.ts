export interface MenuItem {
  id?: number;
  title: string;
  url: string;
  icon?: string;
  iconColor?: string;
  target?: string;
  subItems?: MenuItem[];
  disabled?: boolean;
  isGroupHeader?: boolean;
}

export const menuItems: MenuItem[] = [
  {
    id: 1,
    title: 'Nedir',
    url: '#',
    icon: 'bi-question-circle',
    subItems: [
      { title: 'Neden B2B?', url: '/neden-b2b-toplantilari-meetwork', icon: 'bi-scale' },
      { title: 'MeetWork Nedir?', url: '/meetwork-nedir', icon: 'bi-scale' },
      { title: 'Akıllı Eşleşme Nedir?', url: '/akilli-eslesme', icon: 'bi-scale' },
      { title: 'Manifesto', url: '/manifesto', icon: 'bi-scale' },
      { title: 'İştep Nedir?', url: '/istep', icon: 'bi-headset' },
      { title: 'İş İnsanları', url: '/is-adamlari-dernegi', icon: 'bi-headset' },
      { title: 'MeetWork Kurullar', url: '/meetwork-kurullar', icon: 'bi-headset' },
      { title: 'MeetWork Türkiye Temsilcileri', url: '/meetwork-temsilciler-turkiye', icon: 'bi-headset' },
      { title: 'MeetWork Dünya Temsilcileri', url: '/meetwork-temsilciler-dunya', icon: 'bi-headset' },
      { title: 'Franchise', url: '/franchise', icon: 'bi-headset' },
    ]
  },

  {
    id: 2,
    title: 'Talepler',
    url: '#',
    icon: 'bi-hand-thumbs-up',
    subItems: [
      { title: 'Tüm Talepler', url: '/talepler', icon: 'bi-star' },
      { title: 'Talep Oluşturmak Nedir?', url: '/talep-olustur', icon: 'bi-headset' },
      { title: 'Talep Gir', url: 'https://panel.meetwork.net/register', icon: 'bi-headset', target: '_blank' },
      { title: 'Win-Win Fırsatlar', url: '/win-win', icon: 'bi-headset' },
    ]
  },
  
  // ACİL DURUM - Ana menü, ikon kırmızı
  {
    title: 'Acil Durum',
    url: '#',
    icon: 'bi-exclamation-triangle-fill',
    iconColor: 'text-danger', // KIRMIZI RENK EKLENDİ
    subItems: [
      { title: 'Acil Durum Talebi Gir', url: '/acil-durum', icon: 'bi-exclamation-triangle-fill', iconColor: 'text-danger' },
      { title: 'Şirket Birleşme & Satın Alma', url: '/sirket-birlesme-satin-alma', icon: 'bi-building' },
      { title: 'Şirket Değerleme', url: '/sirket-degerleme', icon: 'bi-calculator' },
      { title: 'Şirket Satış Süreci', url: '/sirket-satis-sureci', icon: 'bi-arrow-right-circle' },
      { title: 'Girişimci Destek', url: '/girisimci-destek', icon: 'bi-rocket' },
      { title: 'İş Planı Hazırlama', url: '/is-plani-hazirlama', icon: 'bi-file-text' },
      { title: 'Akıllı İş Eşleştirme', url: '/akilli-is-eslestirme', icon: 'bi-diagram-3' },
    ]
  },

  {
    id: 3,
    title: 'Etkinlik',
    url: '#',
    icon: 'bi-calendar-day',
    subItems: [
      { title: 'Etkinlikten Kareler', url: '/etkinliklerden-kareler', icon: 'bi-headset' },
      { title: 'Sponsor Ol', url: '/sponsor-ol', icon: 'bi-headset' },
      { title: 'Mini-Maxi Etkinlik', url: '/etkinlik', icon: 'bi-scale' },
      { title: 'Etkinlik Takvimi', url: '/etkinlik-takvimi', icon: 'bi-headset' },
    ]
  },
  
  {
    id: 4,
    title: 'Kazanımlar',
    url: '#',
    icon: 'bi-stars',
    subItems: [
      { title: 'Dış Ticaret', url: '/dis-ticaret', icon: 'bi-headset' },
      { title: 'Konşimento', url: '/konsimento', icon: 'bi-headset' },
      { title: 'İhracat', url: '/ihracat', icon: 'bi-headset' },
      { title: 'İthalat', url: '/ithalat', icon: 'bi-headset' },
      { title: 'İş Birliği', url: '/isbirligi', icon: 'bi-headset' },
      { title: 'İştep İştirakleri', url: '/istirakler', icon: 'bi-headset' },
      { title: 'Teşvik ve Hibe', url: '/tesvik-hibe', icon: 'bi-headset' },
      { title: 'Pro ile Ücretsiz Hizmetler', url: '/dijital-donusum', icon: 'bi-headset' },
      { title: 'Hesaplama Araçları', url: '/hesaplama', icon: 'bi-headset' },
    ]
  },

  // SEKTÖRLER - Düzenlendi, tümü görünür
  {
    id: 5,
    title: 'Sektörler',
    url: '#',
    icon: 'bi-folder',
    subItems: [
      { title: 'TÜM SEKTÖRLER', url: '/sektorler', icon: 'bi-grid-3x3-gap-fill' },
      { title: 'Teknoloji & Yazılım', url: '/sektorler/teknoloji', icon: 'bi-laptop' },
      { title: 'E-Ticaret & Dijital Pazarlama', url: '/sektorler/eticaret', icon: 'bi-cart' },
      { title: 'Finans & Yatırım (FinTech)', url: '/sektorler/fintech', icon: 'bi-wallet' },
      { title: 'Sağlık & Medikal', url: '/sektorler/saglik', icon: 'bi-heart-pulse' },
      { title: 'Enerji & Yenilenebilir', url: '/sektorler/enerji', icon: 'bi-lightning-charge' },
      { title: 'Gıda & Tarım', url: '/sektorler/gida', icon: 'bi-cup-straw' },
      { title: 'Makine & Ekipman', url: '/sektorler/makine', icon: 'bi-gear' },
      { title: 'Otomotiv & Yan Sanayi', url: '/sektorler/otomotiv', icon: 'bi-car-front' },
      { title: 'Metal & Maden', url: '/sektorler/metal', icon: 'bi-tools' },
      { title: 'Kimya & Kozmetik', url: '/sektorler/kozmetik', icon: 'bi-eyedropper' },
      { title: 'Tekstil & Moda', url: '/sektorler/moda', icon: 'bi-scissors' },
      { title: 'Mobilya & Dekorasyon', url: '/sektorler/mobilya', icon: 'bi-house' },
      { title: 'İnşaat & Yapı', url: '/sektorler/insaat', icon: 'bi-hammer' },
      { title: 'Ambalaj & Matbaa', url: '/sektorler/ambalaj', icon: 'bi-box' },
      { title: 'Lojistik & Taşımacılık', url: '/sektorler/lojistik', icon: 'bi-truck' },
      { title: 'Turizm & Seyahat', url: '/sektorler/turizm', icon: 'bi-airplane' },
      { title: 'Eğitim & Danışmanlık', url: '/sektorler/egitim', icon: 'bi-journal-bookmark' },
      { title: 'Hukuk & Mali Müşavirlik', url: '/sektorler/hukuk', icon: 'bi-scale' },
      { title: 'Reklam & Pazarlama', url: '/sektorler/reklam', icon: 'bi-megaphone' },
      { title: 'Sigorta & Risk Yönetimi', url: '/sektorler/sigorta', icon: 'bi-shield-check' },
      { title: 'İK & İstihdam', url: '/sektorler/ik', icon: 'bi-people' },
      { title: 'Temizlik & Bakım', url: '/sektorler/temizlik', icon: 'bi-droplet' },
      { title: 'Güvenlik', url: '/sektorler/guvenlik', icon: 'bi-shield-lock' },
      { title: 'Yapay Zeka & Makine Öğrenmesi', url: '/sektorler/ai', icon: 'bi-cpu' },
      { title: 'Nesnelerin İnterneti (IoT)', url: '/sektorler/iot', icon: 'bi-wifi' },
      { title: 'Siber Güvenlik', url: '/sektorler/siber', icon: 'bi-shield' },
      { title: 'Blockchain & Kripto', url: '/sektorler/blockchain', icon: 'bi-link' },
      { title: 'Oyun & Eğlence', url: '/sektorler/oyun', icon: 'bi-controller' },
      { title: 'Savunma & Havacılık', url: '/sektorler/savunma', icon: 'bi-airplane-engines' },
      { title: 'Drone & İHA Teknolojileri', url: '/sektorler/drone', icon: 'bi-send' },
      { title: 'Biyoteknoloji & Genetik', url: '/sektorler/biyoteknoloji', icon: 'bi-dna' },
      { title: 'Çevre & Sürdürülebilirlik', url: '/sektorler/cevre', icon: 'bi-tree' },
      { title: 'Perakende & Mağazacılık', url: '/sektorler/perakende', icon: 'bi-shop' },
      { title: 'Toptan Ticaret', url: '/sektorler/toptan', icon: 'bi-boxes' },
      { title: 'İhracat & İthalat', url: '/sektorler/dis-ticaret', icon: 'bi-globe' },
      { title: 'E-İhracat', url: '/sektorler/e-ihracat', icon: 'bi-globe2' },
      { title: 'Franchise', url: '/sektorler/franchise', icon: 'bi-graph-up' },
      
      
    ]
  },

  {
    id: 6,
    title: 'Üye Ol',
    url: '#',
    icon: 'bi-person-plus',
    subItems: [
      { title: 'Üye Paketleri', url: '/uye-ol', icon: 'bi-scale' },
      { title: 'Ücretsiz Üyelik', url: '/uye-ol-ucretsiz', icon: 'bi-headset' },
      { title: 'Standart Üyelik', url: '/uye-ol-standart', icon: 'bi-headset' },
      { title: 'PRO Üyelik', url: '/uye-ol-pro', icon: 'bi-headset' },
      { title: 'Kayıt Ol', url: 'https://panel.meetwork.net/register', icon: 'bi-headset', target: '_blank' },
      { title: 'Pro ile Ücretsiz Hizmetler', url: '/dijital-donusum', icon: 'bi-headset' },
    ]
  },

  // SSS - Mavi ikon
  {
    title: '',
    url: '/sss',
    icon: 'bi-patch-question',
    iconColor: 'text-primary',  // MAVİ
  },

  // İletişim - Sarı ikon
  {
    title: '',
    url: '/iletisim',
    icon: 'bi-envelope',
    iconColor: 'text-warning',  // SARI
  },

  {
    title: 'MeetWork',
    url: 'https://meetwork.net',
    icon: 'bi-globe',
    target: '_blank'
  }
];