export interface MenuItem {
  id: number;
  title: string;
  url: string;
  icon?: string;
  target?: string;
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    id: 1,
    title: 'Nedir?',
    url: '#',
    icon: 'bi-question-circle',
    subItems: [
      { id: 80, title: 'Neden B2B?', url: '/neden-b2b-toplantilari-meetwork', icon: 'bi-scale' },
      { id: 110, title: 'MeetWork Nedir?', url: '/meetwork-nedir', icon: 'bi-scale' },
      { id: 115, title: 'Akıllı Eşleşme Nedir?', url: '/akilli-eslesme', icon: 'bi-scale' },
      { id: 116, title: 'Manifesto', url: '/manifesto', icon: 'bi-scale' },
      { id: 81, title: 'İştep Nedir?', url: '/istep', icon: 'bi-headset' },
    { id: 82, title: 'İş İnsanları', url: '/is-adamlari-dernegi', icon: 'bi-headset' },
    { id: 83, title: 'MeetWork Kurullar', url: '/meetwork-kurullar', icon: 'bi-headset' },
    { id: 84, title: 'MeetWork Türkiye Temcilcileri', url: '/meetwork-temsilciler-turkiye', icon: 'bi-headset' },
    { id: 85, title: 'MeetWork Dünya Temcilcileri', url: '/meetwork-temsilciler-dunya', icon: 'bi-headset' },
    { id: 86, title: 'Franchise', url: '/franchise', icon: 'bi-headset' },
    ]
  },

  {
    id: 2,
    title: 'Etkinlik',
    url: '#',
    icon: 'bi-hand-thumbs-up',
    subItems: [
    { id: 114, title: 'Etkinlikten Kareler', url: '/etkinliklerden-kareler', icon: 'bi-headset' },
    { id: 115, title: 'Sponsor Ol', url: '/sponsor-ol', icon: 'bi-headset' },
    { id: 75, title: 'Mini-Maxi Etkinlik', url: '/etkinlik', icon: 'bi-scale' },
    { id: 76, title: 'Etkinlik Takvimi', url: '/etkinlik-takvimi', icon: 'bi-headset' },
    
    //{ id: 102, title: 'Firmalar', url: '/firmalar', icon: 'bi-briefcase' },
    ]
  },
  
  {
    id: 3,
    title: 'Kazanımlar',
    url: '#',
    icon: 'bi-calendar-event',
    subItems: [
    { id: 113, title: 'Talepler', url: '/talepler', icon: 'bi-headset' },
    { id: 77, title: 'Win-Win', url: '/win-win', icon: 'bi-headset' },
    { id: 200, title: 'Tış Ticaret', url: '/dis-ticaret', icon: 'bi-headset' },
    { id: 201, title: 'İhracat', url: '/ihracat', icon: 'bi-headset' },
    { id: 202, title: 'İthalat', url: '/ithalat', icon: 'bi-headset' },
    { id: 78, title: 'İş Birliği', url: '/isbirligi', icon: 'bi-headset' },
    { id: 79, title: 'İştep İştirakleri', url: '/istirakler', icon: 'bi-headset' },
    { id: 90, title: 'Teşvik ve Hibe', url: '/tesvik-hibe', icon: 'bi-headset' },
    { id: 112, title: 'Pro ile Ücretsiz Hizmetler', url: '/dijital-donusum', icon: 'bi-headset' },
    { id: 111, title: 'Hesaplama Araçları', url: '/hesaplama', icon: 'bi-headset' },
    
    //{ id: 102, title: 'Firmalar', url: '/firmalar', icon: 'bi-briefcase' },
    ]
  },
  {
    id: 4,
    title: 'Sektörler',
    url: '#',
    icon: 'bi-folder',
    subItems: [
      { id: 65, title: 'Tüm Sektörler', url: '/sektorler', icon: 'bi-headset' },
      { id: 41, title: 'Teknoloji & Yazılım', url: '/sektorler/teknoloji', icon: 'bi-laptop' },
      { id: 42, title: 'E-Ticaret & Dijital Pazarlama', url: '/sektorler/eticaret', icon: 'bi-cart' },
      { id: 43, title: 'Sağlık & Tıbbi Cihaz', url: '/sektorler/saglik', icon: 'bi-heart-pulse' },
      { id: 44, title: 'Enerji & Yenilenebilir Kaynaklar', url: '/sektorler/enerji', icon: 'bi-lightning-charge' },
      { id: 45, title: 'Gıda & Tarım Teknolojileri', url: '/sektorler/gida', icon: 'bi-cup-straw' },
      { id: 46, title: 'Eğitim Teknolojileri (EdTech)', url: '/sektorler/egitim', icon: 'bi-journal-bookmark' },
      { id: 47, title: 'Lojistik & Tedarik Zinciri', url: '/sektorler/lojistik', icon: 'bi-truck' },
      { id: 48, title: 'Savunma & Havacılık', url: '/sektorler/savunma', icon: 'bi-airplane' },
      { id: 49, title: 'Hava Aracı, Drone (İHA-SİHA) Teknolojileri', url: '/sektorler/drone', icon: 'bi-controller' },
      { id: 50, title: 'Moda & Tekstil', url: '/sektorler/moda', icon: 'bi-scissors' },
      { id: 51, title: 'Turizm & Seyahat', url: '/sektorler/turizm', icon: 'bi-airplane' },
      { id: 52, title: 'Çevre Teknolojileri & Yeşil Enerji', url: '/sektorler/cevre', icon: 'bi-tree' },
      { id: 53, title: 'Finansal Teknolojiler (FinTech)', url: '/sektorler/fintech', icon: 'bi-wallet' },
      { id: 54, title: 'Yapı & İnşaat Teknolojileri', url: '/sektorler/insaat', icon: 'bi-hammer' },
      { id: 55, title: 'Biyoteknoloji & Genetik', url: '/sektorler/biyoteknoloji', icon: 'bi-dna' },
      { id: 56, title: 'Otomotiv', url: '/sektorler/otomotiv', icon: 'bi-car-front' },
      { id: 57, title: 'Makine Sanayi', url: '/sektorler/makine', icon: 'bi-gear' },
      { id: 58, title: 'Gıda Üretimi', url: '/sektorler/gidauretimi', icon: 'bi-egg-fried' },
      { id: 59, title: 'Kozmetik ve Kimya Sanayi', url: '/sektorler/kozmetik', icon: 'bi-eyedropper' },
      { id: 60, title: 'Metal & Maden', url: '/sektorler/metal', icon: 'bi-tools' },
      { id: 61, title: 'Hizmet Sektörü', url: '/sektorler/hizmet', icon: 'bi-person-bounding-box' },
      { id: 62, title: 'Sigorta Sektörü', url: '/sektorler/sigorta', icon: 'bi-shield-check' },
      { id: 63, title: 'Hukuk Sektörü', url: '/sektorler/hukuk', icon: 'bi-scale' },
      { id: 64, title: 'Servis Sektörü', url: '/sektorler/servis', icon: 'bi-headset' },
    ]
  },
  
  {
    id: 5,
    title: 'Üye Ol',
    url: '#',
    icon: 'bi-person-plus',
    subItems: [
      { id: 95, title: 'Üye Paketleri', url: '/uye-ol', icon: 'bi-scale' },
      { id: 96, title: 'Ücretsiz Üyelik', url: '/uye-ol-ucretsiz', icon: 'bi-headset' },
      { id: 97, title: 'Standart Üyelik', url: '/uye-ol-standart', icon: 'bi-headset' },
      { id: 98, title: 'PRO Üyelik', url: '/uye-ol-pro', icon: 'bi-headset' },
      { id: 99, title: 'Kayıt Ol', url: 'https://panel.meetwork.net/register', icon: 'bi-headset' },
      { id: 101, title: 'Pro ile Ücretsiz Hizmetler', url: '/dijital-donusum', icon: 'bi-headset' },
    
    ]
  },
  {
    id: 6,
    title: 'SSS',
    url: '/sss',
    icon: 'bi-patch-question'
  },
  {
    id: 7,
    title: 'İletişim',
    url: '/iletisim',
    icon: 'bi-envelope'
  },
   {
    id: 8,
      title: 'MeetWork',
    url: 'https://meetwork.net',
    icon: 'bi-globe',
    target: '_blank'
  }
];