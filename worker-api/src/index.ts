import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  SP_DB: D1Database;
  DD_DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  KV: KVNamespace;
  STOKPRATIK_API_URL: string;
  DEPODANDIREKT_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id']
}));

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ============================================================================
// 1. CENTRALIZED D1 SCHEMA INITIALIZER (NO FAKE DATA, CLEAN PRODUCTION TABLES)
// ============================================================================
async function ensureSchema(db: D1Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS mw_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      title TEXT,
      avatar_url TEXT,
      company_id TEXT,
      sp_tenant_id TEXT,
      role TEXT DEFAULT 'member',
      match_credits INTEGER DEFAULT 3,
      tender_credits INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_companies (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      vkn TEXT,
      sector TEXT NOT NULL,
      sub_sector TEXT,
      target_sectors TEXT DEFAULT '[]',
      city TEXT,
      district TEXT,
      country TEXT DEFAULT 'Türkiye',
      description TEXT,
      logo_url TEXT,
      cover_url TEXT,
      website TEXT,
      phone TEXT,
      email TEXT,
      trust_level INTEGER DEFAULT 1,
      sp_tenant_id TEXT,
      dd_vendor_id TEXT,
      carinet_enabled INTEGER DEFAULT 0,
      membership_tier TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      author_name TEXT NOT NULL,
      author_title TEXT,
      company_name TEXT,
      company_slug TEXT,
      trust_level INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      media_url TEXT,
      post_type TEXT DEFAULT 'post',
      related_id TEXT,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      company_name TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_listings (
      id TEXT PRIMARY KEY,
      listing_no TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      company_id TEXT,
      user_id TEXT,
      seller_name TEXT NOT NULL,
      seller_phone TEXT,
      seller_city TEXT NOT NULL,
      seller_district TEXT,
      trust_level INTEGER DEFAULT 1,
      main_category TEXT NOT NULL,
      sub_category TEXT NOT NULL,
      listing_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'TRY',
      images TEXT DEFAULT '[]',
      attributes TEXT DEFAULT '{}',
      is_vitrin INTEGER DEFAULT 0,
      is_urgent INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      sp_product_id TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_tenders (
      id TEXT PRIMARY KEY,
      tender_no TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      company_id TEXT,
      buyer_name TEXT NOT NULL,
      buyer_city TEXT,
      trust_level INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      tender_method TEXT DEFAULT 'rfq',
      description TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      target_price REAL,
      currency TEXT DEFAULT 'TRY',
      payment_terms TEXT,
      delivery_location TEXT,
      rules_json TEXT DEFAULT '{}',
      is_group_buy INTEGER DEFAULT 0,
      group_participants INTEGER DEFAULT 1,
      end_time DATETIME NOT NULL,
      bids_count INTEGER DEFAULT 0,
      lowest_bid REAL,
      magic_token TEXT,
      sp_product_id TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_tender_bids (
      id TEXT PRIMARY KEY,
      tender_id TEXT NOT NULL,
      company_id TEXT,
      supplier_name TEXT NOT NULL,
      supplier_phone TEXT,
      supplier_email TEXT,
      supplier_vkn TEXT,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'TRY',
      delivery_days INTEGER,
      payment_terms TEXT,
      note TEXT,
      is_winner INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_matches (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      matched_company_id TEXT NOT NULL,
      match_type TEXT NOT NULL,
      matched_sector TEXT,
      status TEXT DEFAULT 'suggested',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_endorsements (
      id TEXT PRIMARY KEY,
      from_company_id TEXT NOT NULL,
      from_company_name TEXT NOT NULL,
      to_company_id TEXT NOT NULL,
      comment TEXT NOT NULL,
      relation_type TEXT DEFAULT 'Ticari İş Ortağı',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_events (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      event_type TEXT DEFAULT 'Maxi Etkinlik',
      city TEXT NOT NULL,
      venue TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      capacity INTEGER DEFAULT 100,
      registered_count INTEGER DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      company_id TEXT,
      full_name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      sector TEXT NOT NULL,
      phone TEXT NOT NULL,
      qr_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_stories (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      company_name TEXT NOT NULL,
      company_slug TEXT,
      author_name TEXT,
      trust_level INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'İş Gündemi',
      bg_gradient TEXT DEFAULT 'linear-gradient(135deg, #0b0b0e 0%, #dc3545 100%)',
      media_url TEXT,
      cta_label TEXT DEFAULT 'İşletme Vitrini',
      cta_url TEXT,
      views_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of statements) {
    await db.prepare(sql).run();
  }
}

async function ensureInitialStories(db: D1Database) {
  const countRow = await db.prepare(`SELECT COUNT(*) as cnt FROM mw_stories`).first() as any;
  if (countRow && Number(countRow.cnt) > 0) return;

  const initialStories = [
    {
      id: 'st_anadolu_1',
      company_id: 'comp_anadolu_celik',
      company_name: 'Anadolu Çelik & Makine',
      company_slug: 'anadolu-celik-makine-sanayi',
      author_name: 'Ahmet Yılmaz',
      trust_level: 3,
      title: 'Yeni 5 Eksen CNC Hattımız Devrede',
      content: 'Tuzla OSB fabrikamızda savunma ve otomotiv yan sanayi için 5 eksenli lazer ve CNC büküm parkurumuz tam kapasite üretime başladı. Fason ve proje talepleriniz için iletişime geçebilirsiniz.',
      category: 'Üretim & Yatırım',
      bg_gradient: 'linear-gradient(135deg, #111115 0%, #b45309 50%, #f59e0b 100%)',
      cta_label: 'İşletme Vitrinini İncele',
      cta_url: '/isletmeler?firma=anadolu-celik-makine-sanayi'
    },
    {
      id: 'st_marmara_2',
      company_id: 'comp_marmara_makine',
      company_name: 'Marmara Makine',
      company_slug: 'marmara-endustriyel-makine',
      author_name: 'Selim Arslan',
      trust_level: 3,
      title: 'Bursa Nilüfer OSB Otomasyon Teslimatı',
      content: 'Ambalaj ve gıda sektörü için geliştirdiğimiz tam otomatik paletleme robot hattımızı teslim ettik. Stoktan hazır konveyör ve otomasyon çözümlerimiz CariNet vitrinimizde!',
      category: 'Yeni Teslimat',
      bg_gradient: 'linear-gradient(135deg, #0b0b0e 0%, #dc3545 100%)',
      cta_label: 'Mağaza & Katalog',
      cta_url: '/isletmeler?firma=marmara-endustriyel-makine'
    },
    {
      id: 'st_vizyon_3',
      company_id: 'comp_vizyon_otomotiv',
      company_name: 'Vizyon Otomotiv',
      company_slug: 'vizyon-oto-kaporta-yan-sanayi',
      author_name: 'Kaan Demir',
      trust_level: 2,
      title: 'Sac Kalıp & Soğuk Şekillendirme İhalesi',
      content: 'Gebze OSB tesislerimiz için yıllık 450 ton DKP rulo sac tedarik ihalemiz E-İhale merkezinde açıldı. Çelik servis merkezlerinin tekliflerini bekliyoruz.',
      category: 'Canlı E-İhale',
      bg_gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #64748b 100%)',
      cta_label: 'İhaleye Teklif Ver',
      cta_url: '/ihaleler'
    },
    {
      id: 'st_ege_4',
      company_id: 'comp_ege_lojistik',
      company_name: 'Ege Global Lojistik',
      company_slug: 'ege-global-lojistik-filo',
      author_name: 'Berna Aydın',
      trust_level: 2,
      title: 'Avrupa Parsiyel & Filo Kiralama Fırsatı',
      content: 'Almanya, Hollanda ve İtalya hattında haftalık düzenli parsiyel çıkışlarımız ve 2026 model ticari araç filo kiralama kampanyamız başladı.',
      category: 'Lojistik & Filo',
      bg_gradient: 'linear-gradient(135deg, #052e16 0%, #15803d 100%)',
      cta_label: 'Filo & İlanları Gör',
      cta_url: '/isletmeler?firma=ege-global-lojistik-filo'
    },
    {
      id: 'st_meetwork_5',
      company_id: 'comp_meetwork_hq',
      company_name: 'MeetWork Global',
      company_slug: 'meetwork-global-yonetim',
      author_name: 'MeetWork Ekibi',
      trust_level: 3,
      title: 'Maxi B2B Kahvaltı & Akıllı Eşleşme',
      content: 'Bu hafta düzenlenecek yüz yüze Mini & Maxi iş toplantılarımızda yerinizi alın! Seçtiğiniz 5 hedef sektörden karar vericilerle aynı masada tanışın.',
      category: 'B2B Etkinlik',
      bg_gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #111115 100%)',
      cta_label: 'Etkinlik Takvimi',
      cta_url: '/etkinlik-takvimi'
    }
  ];

  for (const st of initialStories) {
    await db.prepare(
      `INSERT OR IGNORE INTO mw_stories (id, company_id, company_name, company_slug, author_name, trust_level, title, content, category, bg_gradient, cta_label, cta_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      st.id, st.company_id, st.company_name, st.company_slug, st.author_name,
      st.trust_level, st.title, st.content, st.category, st.bg_gradient, st.cta_label, st.cta_url
    ).run();
  }
}

app.get('/', (c) => {
  return c.json({
    service: 'MeetWork B2B Super-Network & E-Procurement API',
    status: 'active',
    storage: { d1: true, r2: true, kv: true, sp_bridge: true, dd_bridge: true }
  });
});

app.post('/api/init', async (c) => {
  await ensureSchema(c.env.DB);
  return c.json({ success: true, message: 'MeetWork D1 veritabanı tabloları hazır.' });
});

// ============================================================================
// 2. AUTH & STOKPRATIK SSO BRIDGE (/api/auth/*)
// ============================================================================
app.post('/api/auth/register', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const {
    full_name, email, phone, password,
    company_name, vkn, sector, sub_sector,
    target_sectors = [], city = 'İstanbul', district = ''
  } = body;

  if (!full_name || !email || !company_name || !sector) {
    return c.json({ success: false, message: 'Ad Soyad, E-posta, İşletme Adı ve Ana Sektör zorunludur.' }, 400);
  }

  const companyId = uid('comp');
  const userId = uid('usr');
  const slug = company_name
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.floor(100 + Math.random() * 900);

  // Check if VKN exists in StokPratik MASTER_DB for instant Trust Level 2 badge!
  let spTenantId: string | null = null;
  let trustLevel = 1;
  if (vkn && c.env.SP_DB) {
    try {
      const spTenant = await c.env.SP_DB.prepare(
        `SELECT id, company_name FROM tenants WHERE tax_number = ? OR id = ? LIMIT 1`
      ).bind(String(vkn).trim(), String(vkn).trim()).first() as any;
      if (spTenant) {
        spTenantId = spTenant.id;
        trustLevel = 2; // StokPratik VKN Doğrulanmış İşletme
      }
    } catch (_) {}
  }

  const safeTargets = Array.isArray(target_sectors) ? target_sectors.slice(0, 5) : [];

  await c.env.DB.prepare(
    `INSERT INTO mw_companies (id, slug, name, vkn, sector, sub_sector, target_sectors, city, district, phone, email, trust_level, sp_tenant_id, carinet_enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    companyId, slug, company_name.trim(), vkn || '', sector, sub_sector || '',
    JSON.stringify(safeTargets), city, district, phone || '', email.trim().toLowerCase(),
    trustLevel, spTenantId, spTenantId ? 1 : 0
  ).run();

  await c.env.DB.prepare(
    `INSERT INTO mw_users (id, email, password_hash, full_name, phone, title, company_id, sp_tenant_id, match_credits, tender_credits)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 3)`
  ).bind(
    userId, email.trim().toLowerCase(), password || 'mw_pass', full_name.trim(),
    phone || '', body.title || 'Firma Yetkilisi', companyId, spTenantId
  ).run();

  const sessionToken = uid('mwsess');
  const sessionData = {
    user_id: userId,
    full_name: full_name.trim(),
    email: email.trim().toLowerCase(),
    company_id: companyId,
    company_slug: slug,
    company_name: company_name.trim(),
    sector,
    target_sectors: safeTargets,
    trust_level: trustLevel,
    sp_tenant_id: spTenantId,
    match_credits: 3,
    tender_credits: 3
  };

  await c.env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), { expirationTtl: 86400 * 30 });

  return c.json({
    success: true,
    token: sessionToken,
    user: sessionData,
    message: trustLevel === 2
      ? 'StokPratik kurumsal kaydınız doğrulandı! 2. Kademe Güven Rozeti ve 3 İhale/Eşleşme Kredisi tanımlandı.'
      : 'Üyeliğiniz oluşturuldu! 3 Ücretsiz Akıllı Eşleşme ve 3 E-İhale Kredisi hesabınıza tanımlandı.'
  });
});

app.post('/api/auth/login', async (c) => {
  await ensureSchema(c.env.DB);
  const { email, password, sso_provider } = await c.req.json();
  if (!email) return c.json({ success: false, message: 'E-posta veya VKN giriniz.' }, 400);

  const clean = String(email).trim().toLowerCase();

  let user = await c.env.DB.prepare(
    `SELECT u.*, comp.name as company_name, comp.slug as company_slug, comp.sector, comp.target_sectors, comp.trust_level
     FROM mw_users u
     LEFT JOIN mw_companies comp ON u.company_id = comp.id
     WHERE u.email = ? LIMIT 1`
  ).bind(clean).first() as any;

  // If logging in via StokPratik SSO and not yet in MeetWork DB, check StokPratik DB
  if (!user && sso_provider === 'stokpratik' && c.env.SP_DB) {
    try {
      const spUser = await c.env.SP_DB.prepare(
        `SELECT u.*, t.company_name, t.tax_number FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id WHERE lower(u.email) = ? LIMIT 1`
      ).bind(clean).first() as any;

      if (spUser) {
        const companyId = uid('comp');
        const userId = uid('usr');
        const cName = spUser.company_name || spUser.name || 'StokPratik İşletmesi';
        const slug = cName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);

        await c.env.DB.prepare(
          `INSERT INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, email, trust_level, sp_tenant_id, carinet_enabled)
           VALUES (?, ?, ?, ?, 'Toptan & Perakende Ticaret', '["Teknoloji & Yazılım","Lojistik & Taşımacılık","Üretim & Sanayi"]', 'İstanbul', ?, 2, ?, 1)`
        ).bind(companyId, slug, cName, spUser.tax_number || '', clean, spUser.tenant_id).run();

        await c.env.DB.prepare(
          `INSERT INTO mw_users (id, email, password_hash, full_name, company_id, sp_tenant_id, match_credits, tender_credits)
           VALUES (?, ?, 'sso', ?, ?, ?, 5, 5)`
        ).bind(userId, clean, spUser.name || cName, companyId, spUser.tenant_id).run();

        user = await c.env.DB.prepare(
          `SELECT u.*, comp.name as company_name, comp.slug as company_slug, comp.sector, comp.target_sectors, comp.trust_level
           FROM mw_users u LEFT JOIN mw_companies comp ON u.company_id = comp.id WHERE u.id = ?`
        ).bind(userId).first() as any;
      }
    } catch (_) {}
  }

  if (!user) {
    return c.json({
      success: false,
      message: 'Bu e-posta ile kayıtlı hesap bulunamadı. Lütfen "Üye Ol" sekmesinden 30 saniyede işletmenizi kaydedin.'
    }, 404);
  }

  if (password && user.password_hash && user.password_hash !== 'sso' && user.password_hash !== password) {
    return c.json({ success: false, message: 'Girdiğiniz şifre hatalı.' }, 401);
  }

  const sessionToken = uid('mwsess');
  let parsedTargets: string[] = [];
  try { parsedTargets = JSON.parse(user.target_sectors || '[]'); } catch (_) {}

  const sessionData = {
    user_id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role || 'member',
    company_id: user.company_id,
    company_slug: user.company_slug,
    company_name: user.company_name,
    sector: user.sector,
    target_sectors: parsedTargets,
    trust_level: user.trust_level || 1,
    sp_tenant_id: user.sp_tenant_id,
    match_credits: user.match_credits ?? 3,
    tender_credits: user.tender_credits ?? 3
  };

  await c.env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), { expirationTtl: 86400 * 30 });

  return c.json({ success: true, token: sessionToken, user: sessionData });
});

app.post('/api/auth/change-password', async (c) => {
  await ensureSchema(c.env.DB);
  const { user_id, email, current_password, new_password } = await c.req.json();
  if (!new_password || String(new_password).trim().length < 4) {
    return c.json({ success: false, message: 'Yeni şifre en az 4 karakter olmalıdır.' }, 400);
  }

  let user: any = null;
  if (user_id) {
    user = await c.env.DB.prepare(`SELECT * FROM mw_users WHERE id = ? LIMIT 1`).bind(user_id).first();
  } else if (email) {
    user = await c.env.DB.prepare(`SELECT * FROM mw_users WHERE email = ? LIMIT 1`).bind(String(email).trim().toLowerCase()).first();
  }

  if (!user) {
    return c.json({ success: false, message: 'Kullanıcı bulunamadı.' }, 404);
  }

  if (current_password && user.password_hash && user.password_hash !== 'sso' && user.password_hash !== current_password) {
    return c.json({ success: false, message: 'Mevcut şifreniz hatalı.' }, 401);
  }

  await c.env.DB.prepare(`UPDATE mw_users SET password_hash = ? WHERE id = ?`).bind(String(new_password).trim(), user.id).run();
  return c.json({ success: true, message: 'Şifreniz başarıyla güncellendi.' });
});

// ============================================================================
// 3. UNIFIED FEED & STORIES (SOCIAL POSTS + STORIES + VITRIN LISTINGS + TENDERS)
// ============================================================================
app.get('/api/stories', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialStories(c.env.DB);
  const companyId = c.req.query('company_id');
  const companySlug = c.req.query('company_slug');

  let sql = `SELECT * FROM mw_stories WHERE 1=1`;
  const params: any[] = [];
  if (companyId) {
    sql += ` AND company_id = ?`;
    params.push(companyId);
  } else if (companySlug) {
    sql += ` AND company_slug = ?`;
    params.push(companySlug);
  }
  sql += ` ORDER BY created_at DESC LIMIT 20`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ success: true, stories: results || [] });
});

app.post('/api/stories', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const {
    company_id = '',
    company_name = 'MeetWork İşletmesi',
    company_slug = '',
    author_name = 'Firma Yetkilisi',
    trust_level = 1,
    title,
    content,
    category = 'İş Gündemi',
    bg_gradient = 'linear-gradient(135deg, #0b0b0e 0%, #dc3545 100%)',
    media_url = '',
    cta_label = 'İşletme Vitrini',
    cta_url = ''
  } = body;

  if (!title || !content) {
    return c.json({ success: false, message: 'Hikaye başlığı ve açıklaması zorunludur.' }, 400);
  }

  const id = uid('st');
  const finalCtaUrl = cta_url || (company_slug ? `/isletmeler?firma=${company_slug}` : '/isletmeler');

  await c.env.DB.prepare(
    `INSERT INTO mw_stories (id, company_id, company_name, company_slug, author_name, trust_level, title, content, category, bg_gradient, media_url, cta_label, cta_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, company_id, company_name.trim(), company_slug, author_name.trim(),
    Number(trust_level || 1), title.trim(), content.trim(), category, bg_gradient, media_url, cta_label, finalCtaUrl
  ).run();

  return c.json({ success: true, id, message: 'Hikayeniz yayınlandı!' });
});

app.get('/api/feed', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialStories(c.env.DB);
  const { results: stories } = await c.env.DB.prepare(
    `SELECT * FROM mw_stories ORDER BY created_at DESC LIMIT 15`
  ).all();
  const { results: posts } = await c.env.DB.prepare(
    `SELECT * FROM mw_posts ORDER BY created_at DESC LIMIT 30`
  ).all();
  const { results: vitrinListings } = await c.env.DB.prepare(
    `SELECT * FROM mw_listings WHERE status = 'active' ORDER BY is_vitrin DESC, created_at DESC LIMIT 12`
  ).all();
  const { results: activeTenders } = await c.env.DB.prepare(
    `SELECT * FROM mw_tenders WHERE status = 'open' ORDER BY created_at DESC LIMIT 10`
  ).all();
  const { results: companies } = await c.env.DB.prepare(
    `SELECT id, slug, name, sector, city, trust_level, carinet_enabled, sp_tenant_id FROM mw_companies ORDER BY trust_level DESC, created_at DESC LIMIT 10`
  ).all();

  return c.json({
    success: true,
    stories: stories || [],
    posts: posts || [],
    vitrinListings: vitrinListings || [],
    activeTenders: activeTenders || [],
    featuredCompanies: companies || []
  });
});

app.post('/api/posts', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const { user_id, company_id, author_name, author_title, company_name, company_slug, trust_level = 1, content, media_url, post_type = 'post' } = body;

  if (!content || !author_name) {
    return c.json({ success: false, message: 'Paylaşım içeriği boş olamaz.' }, 400);
  }

  const id = uid('post');
  await c.env.DB.prepare(
    `INSERT INTO mw_posts (id, user_id, company_id, author_name, author_title, company_name, company_slug, trust_level, content, media_url, post_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, user_id || 'guest', company_id || '', author_name, author_title || 'İş İnsanı',
    company_name || '', company_slug || '', trust_level, content, media_url || '', post_type
  ).run();

  return c.json({ success: true, id, message: 'Paylaşımınız MeetWork İş Ağı akışında yayınlandı.' });
});

app.post('/api/posts/:id/like', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`UPDATE mw_posts SET likes_count = likes_count + 1 WHERE id = ?`).bind(id).run();
  return c.json({ success: true });
});

// ============================================================================
// 4. İLAN PAZARI (EMLAK, VASITA BINEK/TİCARİ, SANAYİ, 2.EL)
// ============================================================================
app.get('/api/listings', async (c) => {
  await ensureSchema(c.env.DB);
  const main_category = c.req.query('category');
  const sub_category = c.req.query('sub_category');
  const listing_type = c.req.query('type');
  const city = c.req.query('city');
  const q = c.req.query('q');
  const minPrice = c.req.query('min_price');
  const maxPrice = c.req.query('max_price');
  const company_id = c.req.query('company_id');

  let sql = `SELECT * FROM mw_listings WHERE status = 'active'`;
  const params: any[] = [];

  if (main_category && main_category !== 'all') {
    sql += ` AND main_category = ?`;
    params.push(main_category);
  }
  if (sub_category && sub_category !== 'all') {
    sql += ` AND sub_category = ?`;
    params.push(sub_category);
  }
  if (listing_type && listing_type !== 'all') {
    sql += ` AND listing_type = ?`;
    params.push(listing_type);
  }
  if (city && city !== 'all') {
    sql += ` AND seller_city = ?`;
    params.push(city);
  }
  if (company_id) {
    sql += ` AND company_id = ?`;
    params.push(company_id);
  }
  if (minPrice) {
    sql += ` AND price >= ?`;
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += ` AND price <= ?`;
    params.push(Number(maxPrice));
  }
  if (q) {
    sql += ` AND (title LIKE ? OR description LIKE ? OR listing_no LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  sql += ` ORDER BY is_vitrin DESC, is_urgent DESC, created_at DESC LIMIT 100`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ success: true, listings: results || [] });
});

app.get('/api/listings/:slugOrId', async (c) => {
  await ensureSchema(c.env.DB);
  const param = c.req.param('slugOrId');
  const listing = await c.env.DB.prepare(
    `SELECT * FROM mw_listings WHERE slug = ? OR id = ? OR listing_no = ? LIMIT 1`
  ).bind(param, param, param).first() as any;

  if (!listing) return c.json({ success: false, message: 'İlan bulunamadı.' }, 404);

  await c.env.DB.prepare(`UPDATE mw_listings SET views_count = views_count + 1 WHERE id = ?`).bind(listing.id).run();

  let company = null;
  if (listing.company_id) {
    company = await c.env.DB.prepare(`SELECT * FROM mw_companies WHERE id = ? LIMIT 1`).bind(listing.company_id).first();
  }

  return c.json({ success: true, listing, company });
});

app.post('/api/listings', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const {
    company_id, user_id, seller_name, seller_phone, seller_city = 'İstanbul', seller_district = '',
    trust_level = 1, main_category, sub_category, listing_type = 'Satılık',
    title, description, price, currency = 'TRY', images = [], attributes = {},
    is_vitrin = 0, is_urgent = 0, sp_product_id = null, share_on_feed = true
  } = body;

  if (!title || !main_category || price === undefined) {
    return c.json({ success: false, message: 'İlan başlığı, kategori ve fiyat zorunludur.' }, 400);
  }

  const id = uid('lst');
  const listingNo = String(Math.floor(100000000 + Math.random() * 900000000));
  const slug = title
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + listingNo;

  await c.env.DB.prepare(
    `INSERT INTO mw_listings (
      id, listing_no, slug, company_id, user_id, seller_name, seller_phone, seller_city, seller_district,
      trust_level, main_category, sub_category, listing_type, title, description, price, currency,
      images, attributes, is_vitrin, is_urgent, sp_product_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, listingNo, slug, company_id || '', user_id || '', seller_name || 'MeetWork Üyesi',
    seller_phone || '', seller_city, seller_district, trust_level,
    main_category, sub_category || main_category, listing_type, title.trim(),
    description || '', Number(price), currency,
    JSON.stringify(images), JSON.stringify(attributes),
    is_vitrin ? 1 : 0, is_urgent ? 1 : 0, sp_product_id
  ).run();

  if (share_on_feed) {
    const postId = uid('post');
    await c.env.DB.prepare(
      `INSERT INTO mw_posts (id, user_id, company_id, author_name, author_title, company_name, trust_level, content, post_type, related_id)
       VALUES (?, ?, ?, ?, 'İlan Veren', ?, ?, ?, 'listing', ?)`
    ).bind(
      postId, user_id || 'system', company_id || '', seller_name || 'MeetWork Üyesi',
      seller_name || '', trust_level,
      `📢 YENİ İLAN (${listing_type.toUpperCase()} - ${main_category}): "${title}" — Fiyat: ${Number(price).toLocaleString('tr-TR')} ${currency} (${seller_city}/${seller_district}) | İlan No: #${listingNo}`,
      slug
    ).run();
  }

  return c.json({
    success: true,
    id,
    listing_no: listingNo,
    slug,
    message: `İlanınız (#${listingNo}) başarıyla yayınlandı!`
  });
});

// ============================================================================
// 5. AKILLI EŞLEŞME (2 HEDEF SEKTÖR + 1 RASTGELE/SÜRPRİZ FİRMA ALGORİTMASI)
// ============================================================================
app.get('/api/smart-match', async (c) => {
  await ensureSchema(c.env.DB);
  const companyId = c.req.query('company_id') || '';
  const targetsParam = c.req.query('targets') || '';

  let targetSectors: string[] = [];
  if (targetsParam) {
    targetSectors = targetsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);
  } else if (companyId) {
    const myComp = await c.env.DB.prepare(`SELECT target_sectors FROM mw_companies WHERE id = ?`).bind(companyId).first() as any;
    if (myComp && myComp.target_sectors) {
      try { targetSectors = JSON.parse(myComp.target_sectors).slice(0, 5); } catch (_) {}
    }
  }

  const { results: allCompanies } = await c.env.DB.prepare(
    `SELECT * FROM mw_companies WHERE id != ? ORDER BY trust_level DESC, created_at DESC LIMIT 100`
  ).bind(companyId).all();

  const pool = (allCompanies || []) as any[];

  // 2 Target Matches (from selected 5 target sectors)
  const targetMatches = pool.filter(comp =>
    targetSectors.length === 0 || targetSectors.some(t => comp.sector.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(comp.sector.toLowerCase()))
  ).slice(0, 2);

  const usedIds = new Set(targetMatches.map(m => m.id));

  // 1 Surprise/Serendipity Match (from a different random sector)
  const surpriseCandidates = pool.filter(comp => !usedIds.has(comp.id));
  const surpriseMatch = surpriseCandidates.length > 0
    ? surpriseCandidates[Math.floor(Math.random() * surpriseCandidates.length)]
    : null;

  return c.json({
    success: true,
    target_sectors: targetSectors,
    matches: {
      target_firms: targetMatches.map(f => ({ ...f, match_badge: 'Hedef Sektör Eşleşmesi (Nokta Atışı)' })),
      surprise_firm: surpriseMatch ? { ...surpriseMatch, match_badge: 'Sürpriz Fırsat Eşleşmesi (Farklı Sektör Sinerjisi)' } : null
    }
  });
});

app.put('/api/companies/:id/targets', async (c) => {
  await ensureSchema(c.env.DB);
  const id = c.req.param('id');
  const { sector, target_sectors } = await c.req.json();
  const safeTargets = Array.isArray(target_sectors) ? target_sectors.slice(0, 5) : [];

  await c.env.DB.prepare(
    `UPDATE mw_companies SET sector = COALESCE(?, sector), target_sectors = ? WHERE id = ?`
  ).bind(sector || null, JSON.stringify(safeTargets), id).run();

  return c.json({ success: true, target_sectors: safeTargets, message: 'Hedef sektör tercihleriniz (En fazla 5 sektör) güncellendi.' });
});

// ============================================================================
// 6. E-İHALE, RFQ, AÇIK EKSİLTME, KAPALI ZARF & ORTAK ALIM
// ============================================================================
app.get('/api/tenders', async (c) => {
  await ensureSchema(c.env.DB);
  const method = c.req.query('method');
  const category = c.req.query('category');
  let sql = `SELECT * FROM mw_tenders WHERE 1=1`;
  const params: any[] = [];

  if (method && method !== 'all') {
    sql += ` AND tender_method = ?`;
    params.push(method);
  }
  if (category && category !== 'all') {
    sql += ` AND category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ success: true, tenders: results || [] });
});

app.post('/api/tenders', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const {
    company_id, buyer_name, buyer_city = 'İstanbul', trust_level = 1,
    title, category, tender_method = 'rfq', description, quantity, unit = 'Adet',
    target_price = 0, currency = 'TRY', payment_terms = 'Peşin / Vadeli',
    delivery_location = 'İstanbul', rules_json = {}, is_group_buy = 0,
    end_time, sp_product_id = null
  } = body;

  if (!title || !category) {
    return c.json({ success: false, message: 'İhale/Talep başlığı ve kategori zorunludur.' }, 400);
  }

  const id = uid('tnd');
  const tenderNo = `MW-IHL-${Math.floor(100000 + Math.random() * 900000)}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + tenderNo.toLowerCase();
  const magicToken = uid('magic');
  const finalEndTime = end_time || new Date(Date.now() + 86400000 * 5).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO mw_tenders (
      id, tender_no, slug, company_id, buyer_name, buyer_city, trust_level, title, category,
      tender_method, description, quantity, unit, target_price, currency, payment_terms,
      delivery_location, rules_json, is_group_buy, end_time, magic_token, sp_product_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, tenderNo, slug, company_id || '', buyer_name || 'MeetWork Kurumsal Alıcı',
    buyer_city, trust_level, title, category, tender_method, description || '',
    String(quantity || '1'), unit, Number(target_price || 0), currency,
    payment_terms, delivery_location, JSON.stringify(rules_json),
    is_group_buy ? 1 : 0, finalEndTime, magicToken, sp_product_id
  ).run();

  // Deduct 1 tender credit if advanced auction (Kapalı Zarf / Açık Eksiltme / İngiliz Usulü)
  if (tender_method !== 'rfq' && company_id) {
    await c.env.DB.prepare(
      `UPDATE mw_users SET tender_credits = MAX(0, tender_credits - 1) WHERE company_id = ?`
    ).bind(company_id).run();
  }

  return c.json({
    success: true,
    id,
    tender_no: tenderNo,
    slug,
    magic_link: `https://meetwork.com.tr/ihaleler?tender=${tenderNo}&magic=${magicToken}`,
    message: `İhaleniz (${tenderNo}) başlatıldı! Özel Davet Linki (Magic Link) ile tedarikçileriniz üye olmadan da teklif verebilir.`
  });
});

app.post('/api/tenders/:id/bid', async (c) => {
  await ensureSchema(c.env.DB);
  const tenderId = c.req.param('id');
  const body = await c.req.json();
  const { company_id, supplier_name, supplier_phone, supplier_email, supplier_vkn, price, currency = 'TRY', delivery_days = 7, payment_terms = '30 Gün Vade', note = '' } = body;

  if (!supplier_name || !price) {
    return c.json({ success: false, message: 'Tedarikçi firma adı ve teklif fiyatı zorunludur.' }, 400);
  }

  const tender = await c.env.DB.prepare(`SELECT * FROM mw_tenders WHERE id = ? OR tender_no = ? LIMIT 1`).bind(tenderId, tenderId).first() as any;
  if (!tender) return c.json({ success: false, message: 'İhale bulunamadı.' }, 404);

  const bidId = uid('bid');
  const numericPrice = Number(price);

  await c.env.DB.prepare(
    `INSERT INTO mw_tender_bids (id, tender_id, company_id, supplier_name, supplier_phone, supplier_email, supplier_vkn, price, currency, delivery_days, payment_terms, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    bidId, tender.id, company_id || '', supplier_name, supplier_phone || '',
    supplier_email || '', supplier_vkn || '', numericPrice, currency,
    Number(delivery_days), payment_terms, note
  ).run();

  // Anti-Sniping (Son 2 dakika uzatma kuralı): Eğer açık eksiltme bitimine 2 dakikadan az kaldıysa +2 dk uzat!
  const endMs = new Date(tender.end_time).getTime();
  const nowMs = Date.now();
  let newEndTime = tender.end_time;
  let extended = false;
  if (tender.tender_method === 'open_decrement' && endMs - nowMs > 0 && endMs - nowMs <= 120000) {
    newEndTime = new Date(endMs + 120000).toISOString();
    extended = true;
  }

  const newLowest = (!tender.lowest_bid || numericPrice < tender.lowest_bid) ? numericPrice : tender.lowest_bid;

  await c.env.DB.prepare(
    `UPDATE mw_tenders SET bids_count = bids_count + 1, lowest_bid = ?, end_time = ? WHERE id = ?`
  ).bind(newLowest, newEndTime, tender.id).run();

  return c.json({
    success: true,
    bid_id: bidId,
    lowest_bid: newLowest,
    extended,
    new_end_time: newEndTime,
    message: extended
      ? 'Teklifiniz alındı! Son 2 dakika içinde teklif verildiği için ihale süresi otomatik +2 dakika uzatıldı!'
      : 'Teklifiniz başarıyla kaydedildi!'
  });
});

// ============================================================================
// 7. COMPANY PROFILE & STOKPRATIK CARINET + DEPODANDIREKT CROSS-DB BRIDGE
// ============================================================================
app.get('/api/companies', async (c) => {
  await ensureSchema(c.env.DB);
  const sector = c.req.query('sector');
  let sql = `SELECT * FROM mw_companies WHERE 1=1`;
  const params: any[] = [];
  if (sector && sector !== 'all') {
    sql += ` AND sector = ?`;
    params.push(sector);
  }
  sql += ` ORDER BY trust_level DESC, created_at DESC LIMIT 50`;
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ success: true, companies: results || [] });
});

app.get('/api/companies/:slugOrId', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialStories(c.env.DB);
  const param = c.req.param('slugOrId');
  const company = await c.env.DB.prepare(
    `SELECT * FROM mw_companies WHERE slug = ? OR id = ? LIMIT 1`
  ).bind(param, param).first() as any;

  if (!company) return c.json({ success: false, message: 'İşletme bulunamadı.' }, 404);

  const { results: stories } = await c.env.DB.prepare(
    `SELECT * FROM mw_stories WHERE company_id = ? OR company_slug = ? ORDER BY created_at DESC LIMIT 12`
  ).bind(company.id, company.slug).all();

  const { results: listings } = await c.env.DB.prepare(
    `SELECT * FROM mw_listings WHERE company_id = ? AND status = 'active' ORDER BY created_at DESC`
  ).bind(company.id).all();

  const { results: tenders } = await c.env.DB.prepare(
    `SELECT * FROM mw_tenders WHERE company_id = ? ORDER BY created_at DESC`
  ).bind(company.id).all();

  const { results: posts } = await c.env.DB.prepare(
    `SELECT * FROM mw_posts WHERE company_id = ? ORDER BY created_at DESC`
  ).bind(company.id).all();

  const { results: endorsements } = await c.env.DB.prepare(
    `SELECT * FROM mw_endorsements WHERE to_company_id = ? ORDER BY created_at DESC`
  ).bind(company.id).all();

  // Pull live B2B / Wholesale catalog from StokPratik MASTER_DB or DepodanDirekt DB if linked!
  let b2bCatalog: any[] = [];
  if (company.sp_tenant_id && c.env.SP_DB) {
    try {
      const { results: spProducts } = await c.env.SP_DB.prepare(
        `SELECT id, name, sku, barcode, price, wholesale_price, stock, unit, category FROM products WHERE tenant_id = ? AND stock > 0 LIMIT 24`
      ).bind(company.sp_tenant_id).all();
      b2bCatalog = spProducts || [];
    } catch (_) {}
  }

  return c.json({
    success: true,
    company,
    stories: stories || [],
    listings: listings || [],
    tenders: tenders || [],
    posts: posts || [],
    endorsements: endorsements || [],
    b2b_catalog: b2bCatalog
  });
});

// ============================================================================
// 8. STOKPRATIK <-> MEETWORK WEBHOOK & IDLE STOCK RADAR BRIDGE
// ============================================================================
app.post('/api/bridge/stokpratik-sync', async (c) => {
  await ensureSchema(c.env.DB);
  const body = await c.req.json();
  const { action, tenant_id, company_name, product } = body;

  if (action === 'low_stock_rfq' && product) {
    // Automatically open an RFQ tender on MeetWork when stock drops in StokPratik
    const id = uid('tnd');
    const tenderNo = `SP-OTO-${Math.floor(100000 + Math.random() * 900000)}`;
    const slug = `${product.name || 'stok-ihalesi'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + tenderNo.toLowerCase();
    await c.env.DB.prepare(
      `INSERT INTO mw_tenders (id, tender_no, slug, buyer_name, title, category, tender_method, description, quantity, unit, end_time, sp_product_id)
       VALUES (?, ?, ?, ?, ?, ?, 'open_decrement', ?, ?, ?, datetime('now', '+5 days'), ?)`
    ).bind(
      id, tenderNo, slug, company_name || 'StokPratik Üyesi İşletme',
      `${product.name} Otomatik Tedarik İhalesi`, product.category || 'Sanayi & Üretim',
      `StokPratik kritik stok seviyesi tetiklemesi ile açılan otomatik alım talebi.`,
      String(product.reorder_qty || 100), product.unit || 'Adet', product.id || ''
    ).run();

    return c.json({ success: true, tender_no: tenderNo, message: 'StokPratik kritik stok talebi MeetWork E-İhale sisteminde yayınlandı.' });
  }

  if (action === 'idle_stock_listing' && product) {
    // Atıl Stok / Seri Sonu Eritme Radarı -> MeetWork İlan Pazarı
    const id = uid('lst');
    const listingNo = String(Math.floor(100000000 + Math.random() * 900000000));
    const slug = `${product.name || 'firsat'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + listingNo;
    await c.env.DB.prepare(
      `INSERT INTO mw_listings (id, listing_no, slug, seller_name, seller_city, trust_level, main_category, sub_category, listing_type, title, description, price, is_urgent, sp_product_id)
       VALUES (?, ?, ?, ?, 'İstanbul', 2, 'Sanayi & Makine', 'Seri Sonu & Fırsat Stok', 'Satılık', ?, ?, ?, 1, ?)`
    ).bind(
      id, listingNo, slug, company_name || 'StokPratik Doğrulanmış İşletme',
      `[SERİ SONU FIRSAT] ${product.name}`,
      `StokPratik Atıl Stok Radarı üzerinden doğrudan depodan indirimli satışa açılmıştır.`,
      Number(product.price || 0), product.id || ''
    ).run();

    return c.json({ success: true, listing_no: listingNo, message: 'Hareketsiz stok MeetWork İlan Pazarında Acil Fırsat olarak yayınlandı.' });
  }

  return c.json({ success: false, message: 'Bilinmeyen köprü aksiyonu.' }, 400);
});

// ============================================================================
// 9. SUPERADMIN YÖNETİM PANELİ API'LERİ (/api/superadmin/*)
// ============================================================================
app.get('/api/superadmin/overview', async (c) => {
  await ensureSchema(c.env.DB);
  const { results: companies } = await c.env.DB.prepare(`SELECT * FROM mw_companies ORDER BY created_at DESC LIMIT 100`).all();
  const { results: users } = await c.env.DB.prepare(`SELECT id, email, full_name, phone, role, company_id, match_credits, tender_credits, created_at FROM mw_users ORDER BY created_at DESC LIMIT 100`).all();
  const { results: listings } = await c.env.DB.prepare(`SELECT * FROM mw_listings ORDER BY created_at DESC LIMIT 100`).all();
  const { results: tenders } = await c.env.DB.prepare(`SELECT * FROM mw_tenders ORDER BY created_at DESC LIMIT 100`).all();
  const { results: posts } = await c.env.DB.prepare(`SELECT * FROM mw_posts ORDER BY created_at DESC LIMIT 50`).all();

  return c.json({
    success: true,
    stats: {
      total_companies: (companies || []).length,
      total_users: (users || []).length,
      total_listings: (listings || []).length,
      total_tenders: (tenders || []).length,
      total_posts: (posts || []).length
    },
    companies: companies || [],
    users: users || [],
    listings: listings || [],
    tenders: tenders || [],
    posts: posts || []
  });
});

app.post('/api/superadmin/company-update', async (c) => {
  await ensureSchema(c.env.DB);
  const { company_id, trust_level, membership_tier, match_credits, tender_credits } = await c.req.json();
  if (!company_id) return c.json({ success: false, message: 'company_id zorunludur.' }, 400);

  if (trust_level !== undefined || membership_tier !== undefined) {
    await c.env.DB.prepare(
      `UPDATE mw_companies SET trust_level = COALESCE(?, trust_level), membership_tier = COALESCE(?, membership_tier) WHERE id = ?`
    ).bind(trust_level !== undefined ? Number(trust_level) : null, membership_tier || null, company_id).run();
  }

  if (match_credits !== undefined || tender_credits !== undefined) {
    await c.env.DB.prepare(
      `UPDATE mw_users SET match_credits = COALESCE(?, match_credits), tender_credits = COALESCE(?, tender_credits) WHERE company_id = ?`
    ).bind(match_credits !== undefined ? Number(match_credits) : null, tender_credits !== undefined ? Number(tender_credits) : null, company_id).run();
  }

  return c.json({ success: true, message: 'İşletme rozet, paket ve kredi bilgileri güncellendi.' });
});

app.post('/api/superadmin/listing-toggle', async (c) => {
  await ensureSchema(c.env.DB);
  const { listing_id, is_vitrin, is_urgent, status } = await c.req.json();
  await c.env.DB.prepare(
    `UPDATE mw_listings SET is_vitrin = COALESCE(?, is_vitrin), is_urgent = COALESCE(?, is_urgent), status = COALESCE(?, status) WHERE id = ?`
  ).bind(is_vitrin !== undefined ? Number(is_vitrin) : null, is_urgent !== undefined ? Number(is_urgent) : null, status || null, listing_id).run();
  return c.json({ success: true, message: 'İlan durumu güncellendi.' });
});

app.delete('/api/superadmin/delete/:type/:id', async (c) => {
  await ensureSchema(c.env.DB);
  const type = c.req.param('type');
  const id = c.req.param('id');
  const tableMap: Record<string, string> = {
    listing: 'mw_listings',
    tender: 'mw_tenders',
    post: 'mw_posts',
    company: 'mw_companies'
  };
  const table = tableMap[type];
  if (!table) return c.json({ success: false, message: 'Geçersiz tablo.' }, 400);

  await c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return c.json({ success: true, message: 'Kayıt silindi.' });
});

app.post('/api/superadmin/bootstrap', async (c) => {
  await ensureSchema(c.env.DB);

  // 1. SuperAdmin Hesabı (yonetim@meetwork.com.tr / MeetWork2026!)
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description)
     VALUES ('comp_meetwork_hq', 'meetwork-global-yonetim', 'MeetWork Global & İŞTEP Yönetim Merkezi', '1234567890', 'Teknoloji, Yazılım & E-Ticaret', '["Metal & Çelik Üretim","Makine & Ekipman Üretimi","Otomotiv & Yan Sanayi","İnşaat, Yapı & Gayrimenkul","Toptan & Dış Ticaret (İhracat/İthalat)"]', 'İstanbul', 'Şişli', '05412465429', 'yonetim@meetwork.com.tr', 3, 1, 'gold', 'MeetWork B2B İş Ağı, Akıllı Eşleşme, E-İhale ve İlan Pazarı Resmi Yönetim Merkezi.')`
  ).run();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_users (id, email, password_hash, full_name, phone, title, company_id, role, match_credits, tender_credits)
     VALUES ('usr_superadmin', 'yonetim@meetwork.com.tr', 'MeetWork2026!', 'MeetWork SuperAdmin', '05412465429', 'Platform Yöneticisi', 'comp_meetwork_hq', 'superadmin', 999, 999)`
  ).run();

  // 2. Test Üye İşletme Hesabı (test@meetwork.com.tr / 123456) + Eşleşme Havuzu İçin 3 Gerçekçi İşletme
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description)
     VALUES ('comp_anadolu_celik', 'anadolu-celik-makine-sanayi', 'Anadolu Çelik & Makine San. Tic. A.Ş.', '9876543210', 'Metal & Çelik Üretim', '["Makine & Ekipman Üretimi","Otomotiv & Yan Sanayi","İnşaat, Yapı & Gayrimenkul","Lojistik, Nakliyat & Filo","Elektrik, Elektronik & Enerji"]', 'İstanbul', 'Tuzla OSB', '05321112233', 'test@meetwork.com.tr', 3, 1, 'gold', 'Paslanmaz sac işleme, CNC lazer kesim ve ağır sanayi çelik konstrüksiyon üreticisi.')`
  ).run();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_users (id, email, password_hash, full_name, phone, title, company_id, role, match_credits, tender_credits)
     VALUES ('usr_test_member', 'test@meetwork.com.tr', '123456', 'Ahmet Yılmaz (Test Üye)', '05321112233', 'Yönetim Kurulu Başkanı', 'comp_anadolu_celik', 'member', 10, 10)`
  ).run();

  // Eşleşme (2+1) testi için hedef ve sürpriz sektör işletmeleri
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description)
     VALUES ('comp_marmara_makine', 'marmara-endustriyel-makine', 'Marmara Endüstriyel Makine & Otomasyon Ltd. Şti.', '4567890123', 'Makine & Ekipman Üretimi', '["Metal & Çelik Üretim","Plastik, Kauçuk & Ambalaj"]', 'Bursa', 'Nilüfer OSB', '05412465429', 'info@marmaramakine.com.tr', 3, 1, 'gold', 'Endüstriyel üretim hatları, CNC otomasyon ve özel makine imalatı.')`
  ).run();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description)
     VALUES ('comp_vizyon_otomotiv', 'vizyon-oto-kaporta-yan-sanayi', 'Vizyon Otomotiv Kaporta & Yan Sanayi A.Ş.', '5678901234', 'Otomotiv & Yan Sanayi', '["Metal & Çelik Üretim","Makine & Ekipman Üretimi"]', 'Kocaeli', 'Gebze OSB', '05412465429', 'satinalma@vizyonoto.com.tr', 2, 1, 'pro', 'Otomotiv sac kalıp, kaporta parçaları ve ticari araç üst yapı üretimi.')`
  ).run();

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description)
     VALUES ('comp_ege_lojistik', 'ege-global-lojistik-filo', 'Ege Global Lojistik & Ticari Filo Yönetimi A.Ş.', '6789012345', 'Lojistik, Nakliyat & Filo', '["Toptan & Dış Ticaret (İhracat/İthalat)","Gıda, Tarım & İçecek"]', 'İzmir', 'Bornova', '05412465429', 'operasyon@egelojistik.com.tr', 2, 1, 'pro', 'Yurtiçi ve uluslararası ağır nakliyat, antrepo ve kurumsal ticari araç kiralama.')`
  ).run();

  return c.json({
    success: true,
    message: 'SuperAdmin ve Test Üye hesapları başarıyla hazırlandı!'
  });
});

export default app;
