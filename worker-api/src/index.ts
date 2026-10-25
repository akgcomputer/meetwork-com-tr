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
    )`,
    `CREATE TABLE IF NOT EXISTS mw_grant_profiles (
      company_id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      org_type TEXT DEFAULT 'ltd_as',
      founded_year INTEGER DEFAULT 2021,
      nace_sector TEXT DEFAULT 'Teknoloji, Yazılım & E-Ticaret',
      city TEXT DEFAULT 'İstanbul',
      employee_range TEXT DEFAULT '10-49',
      revenue_range TEXT DEFAULT '5M-25M',
      balance_years INTEGER DEFAULT 4,
      has_export INTEGER DEFAULT 1,
      has_rd_software INTEGER DEFAULT 1,
      seeking_consortium_partner INTEGER DEFAULT 1,
      target_funding_types TEXT DEFAULT '["hibe","ab_fon","global","kredi","vergi_teknopark"]',
      project_summary TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_grant_programs (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      provider TEXT NOT NULL,
      scope TEXT DEFAULT 'yerel',
      funding_type TEXT DEFAULT 'hibe',
      eligible_org_types TEXT DEFAULT '["ltd_as","sahis"]',
      min_company_age INTEGER DEFAULT 0,
      max_company_age INTEGER DEFAULT 99,
      eligible_sectors TEXT DEFAULT '["all"]',
      requires_export INTEGER DEFAULT 0,
      requires_rd INTEGER DEFAULT 0,
      grant_rate TEXT NOT NULL,
      max_amount TEXT NOT NULL,
      deadline_info TEXT DEFAULT 'Sürekli Açık',
      official_url TEXT,
      description TEXT,
      requirements_checklist TEXT DEFAULT '[]',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mw_grant_applications (
      id TEXT PRIMARY KEY,
      application_no TEXT UNIQUE NOT NULL,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      program_id TEXT NOT NULL,
      program_title TEXT NOT NULL,
      provider TEXT,
      scope TEXT DEFAULT 'yerel',
      match_score INTEGER DEFAULT 95,
      project_title TEXT,
      project_notes TEXT,
      current_step TEXT DEFAULT 'Ön Analiz & Evrak Hazırlığı',
      checklist_progress TEXT DEFAULT '{}',
      admin_notes TEXT,
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

  const foundedYear = Number(body.founded_year || 2021);
  const balanceYears = Math.max(0, 2026 - foundedYear);
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_grant_profiles (
       company_id, company_name, org_type, founded_year, nace_sector, city,
       employee_range, revenue_range, balance_years, has_export, has_rd_software, seeking_consortium_partner
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    companyId,
    company_name.trim(),
    body.org_type || 'ltd_as',
    foundedYear,
    sector,
    city,
    body.employee_range || '10-49',
    body.revenue_range || '5M-25M',
    balanceYears,
    body.has_export !== undefined ? Number(body.has_export) : 1,
    body.has_rd_software !== undefined ? Number(body.has_rd_software) : (sector.includes('Yazılım') || sector.includes('Teknoloji') ? 1 : 0)
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
  await ensureInitialGrantEcosystem(c.env.DB);
  const param = c.req.param('slugOrId');
  const company = await c.env.DB.prepare(
    `SELECT * FROM mw_companies WHERE slug = ? OR id = ? OR ( ? = 'dd-internet-ve-e-ticaret-hizmetleri-meetwork' AND id = 'comp_meetwork_hq' ) LIMIT 1`
  ).bind(param, param, param).first() as any;

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

  const grantProfile = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_profiles WHERE company_id = ? LIMIT 1`
  ).bind(company.id).first() as any;

  const { results: grantApplications } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_applications WHERE company_id = ? ORDER BY created_at DESC`
  ).bind(company.id).all();

  const { results: allPrograms } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_programs WHERE status = 'active'`
  ).all();

  const effectiveProfile = grantProfile || {
    company_id: company.id,
    company_name: company.name,
    org_type: 'ltd_as',
    founded_year: company.id === 'comp_meetwork_hq' ? 2021 : 2020,
    nace_sector: company.sector || 'Teknoloji, Yazılım & E-Ticaret',
    city: company.city || 'İstanbul',
    employee_range: '10-49',
    revenue_range: '5M-25M',
    balance_years: 4,
    has_export: 1,
    has_rd_software: company.sector && company.sector.includes('Yazılım') ? 1 : 0,
    seeking_consortium_partner: 1
  };

  const matchResult = evaluateGrantMatches(effectiveProfile, allPrograms || []);

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
    b2b_catalog: b2bCatalog,
    grant_profile: effectiveProfile,
    grant_matches: matchResult.matched,
    grant_filtered_out: matchResult.filteredOut,
    grant_applications: grantApplications || []
  });
});

// ============================================================================
// 7B. AKILLI TEŞVİK, HİBE, AB FONU & KREDİ EŞLEŞTİRME MOTORU (/api/grants/*)
// ============================================================================
function evaluateGrantMatches(profile: any, programs: any[]) {
  const currentYear = 2026;
  const foundedYear = Number(profile.founded_year || 2021);
  const companyAge = Math.max(0, currentYear - foundedYear);
  const orgType = profile.org_type || 'ltd_as';
  const sector = String(profile.nace_sector || 'Teknoloji, Yazılım & E-Ticaret');
  const hasExport = Number(profile.has_export ?? 1) === 1;
  const hasRd = Number(profile.has_rd_software ?? 1) === 1;

  const matched: any[] = [];
  const filteredOut: any[] = [];

  for (const prog of programs) {
    let eligibleOrgs: string[] = ['ltd_as', 'sahis'];
    let eligibleSectors: string[] = ['all'];
    let checklist: string[] = [];
    try { eligibleOrgs = JSON.parse(prog.eligible_org_types || '["ltd_as"]'); } catch (_) {}
    try { eligibleSectors = JSON.parse(prog.eligible_sectors || '["all"]'); } catch (_) {}
    try { checklist = JSON.parse(prog.requirements_checklist || '[]'); } catch (_) {}

    // 1. Hukuki Statü Kontrolü (İşletme vs. STK/Dernek/Kooperatif)
    if (!eligibleOrgs.includes(orgType) && !eligibleOrgs.includes('all')) {
      filteredOut.push({
        ...prog,
        checklist,
        filter_reason: `Kurum statünüz (${orgType === 'stk_dernek' ? 'STK / Dernek / Vakıf' : orgType === 'kooperatif' ? 'Kooperatif / Oda' : 'Ticari Şirket'}) bu programın hedef kitlesi dışında kalmaktadır.`
      });
      continue;
    }

    // 2. Kuruluş Yılı / Şirket Yaşı Kontrolü
    const minAge = Number(prog.min_company_age || 0);
    const maxAge = Number(prog.max_company_age || 99);
    if (companyAge < minAge) {
      filteredOut.push({
        ...prog,
        checklist,
        filter_reason: `Kuruluş yılı (${foundedYear} - ${companyAge} yıllık) bu programın aradığı en az ${minAge} yıllık faaliyet/bilanço şartının altındadır.`
      });
      continue;
    }
    if (companyAge > maxAge) {
      filteredOut.push({
        ...prog,
        checklist,
        filter_reason: `Kuruluş yılı (${foundedYear} - ${companyAge} yıllık şirket) olduğu için 'Son ${maxAge} yıl içinde kurulmuş olma (Yeni Girişimci)' yaş sınırını aşmaktadır.`
      });
      continue;
    }

    // 3. Sektör ve Özel Şart Puanlaması
    const sectorMatches =
      eligibleSectors.includes('all') ||
      eligibleSectors.some((s) => sector.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sector.toLowerCase()));

    if (!sectorMatches) {
      filteredOut.push({
        ...prog,
        checklist,
        filter_reason: `Program öncelikli olarak (${eligibleSectors.join(', ')}) sektörlerini hedeflemektedir.`
      });
      continue;
    }

    if (Number(prog.requires_rd) === 1 && !hasRd && !sector.toLowerCase().includes('yazılım') && !sector.toLowerCase().includes('teknoloji')) {
      filteredOut.push({
        ...prog,
        checklist,
        filter_reason: `Program yazılım, Ar-Ge veya yenilikçi ürün geliştirme faaliyeti şartı aramaktadır.`
      });
      continue;
    }

    let score = 88;
    const matchReasons: string[] = [];

    if (minAge > 0) {
      score += 4;
      matchReasons.push(`✓ ${foundedYear} kuruluşlu (${companyAge} yıllık geçmiş & onaylı bilanço) şartını tam sağlıyor`);
    } else {
      matchReasons.push(`✓ ${foundedYear} kuruluş yılı kriterine uygun`);
    }

    if (!eligibleSectors.includes('all')) {
      score += 4;
      matchReasons.push(`✓ ${sector} NACE / faaliyet alanı öncelikli listede`);
    }

    if (Number(prog.requires_export) === 1 && hasExport) {
      score += 3;
      matchReasons.push(`✓ E-İhracat / 60+ ülke uluslararası açılım hedefiyle doğrudan örtüşüyor`);
    }

    if (Number(prog.requires_rd) === 1 && hasRd) {
      score += 3;
      matchReasons.push(`✓ Yazılım, yapay zekâ ve B2B dijital platform Ar-Ge niteliğine tam uyumlu`);
    }

    score = Math.min(99, score);

    matched.push({
      ...prog,
      checklist,
      match_score: score,
      match_reasons: matchReasons
    });
  }

  matched.sort((a, b) => b.match_score - a.match_score);
  return { matched, filteredOut };
}

async function ensureInitialGrantEcosystem(db: D1Database) {
  // 1. Ensure DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. is updated on comp_meetwork_hq
  await db.prepare(
    `INSERT OR REPLACE INTO mw_companies (id, slug, name, vkn, sector, sub_sector, target_sectors, city, district, phone, email, trust_level, carinet_enabled, membership_tier, description, website)
     VALUES (
       'comp_meetwork_hq',
       'meetwork-global-yonetim',
       'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
       '2720912021',
       'Teknoloji, Yazılım & E-Ticaret',
       'B2B Super-Network, Bulut ERP (StokPratik) & E-İhracat (DepodanDirekt)',
       '["Teknoloji, Yazılım & E-Ticaret","Metal & Çelik Üretim","Makine & Ekipman Üretimi","Toptan & Dış Ticaret (İhracat/İthalat)","Lojistik, Nakliyat & Filo"]',
       'İstanbul',
       'Şişli',
       '05412465429',
       'yonetim@meetwork.com.tr',
       3,
       1,
       'gold',
       '2021 kuruluşlu DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti.; MeetWork B2B Super-Network, StokPratik Bulut ERP & CariNet ve DepodanDirekt E-İhracat platformlarının geliştiricisi ve işletmecisidir.',
       'https://meetwork.com.tr'
     )`
  ).run();

  // 2. Ensure DD İnternet 2021 Grant Eligibility Profile
  await db.prepare(
    `INSERT OR IGNORE INTO mw_grant_profiles (
       company_id, company_name, org_type, founded_year, nace_sector, city,
       employee_range, revenue_range, balance_years, has_export, has_rd_software,
       seeking_consortium_partner, target_funding_types, project_summary
     ) VALUES (
       'comp_meetwork_hq',
       'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
       'ltd_as',
       2021,
       'Teknoloji, Yazılım & E-Ticaret',
       'İstanbul',
       '10-49',
       '5M-25M',
       5,
       1,
       1,
       1,
       '["hibe","ab_fon","global","kredi","vergi_teknopark"]',
       '2021 kuruluşlu DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. bünyesinde geliştirilen MeetWork (B2B Akıllı İş Eşleştirme, Canlı E-İhale ve Teşvik Eşleştirme Motoru), StokPratik (Bulut ERP & CariNet) ve DepodanDirekt (Toptan & E-İhracat Pazaryeri) bütünleşik ekosisteminin Ar-Ge, uluslararasılaşma ve kapasite büyütme yatırımları.'
     )`
  ).run();

  // Ensure Anadolu Çelik Grant Profile for testing industrial company
  await db.prepare(
    `INSERT OR IGNORE INTO mw_grant_profiles (
       company_id, company_name, org_type, founded_year, nace_sector, city,
       employee_range, revenue_range, balance_years, has_export, has_rd_software,
       seeking_consortium_partner, target_funding_types, project_summary
     ) VALUES (
       'comp_anadolu_celik',
       'Anadolu Çelik & Makine San. Tic. A.Ş.',
       'ltd_as',
       2018,
       'Metal & Çelik Üretim',
       'İstanbul',
       '50-249',
       '25M-100M',
       8,
       1,
       1,
       1,
       '["hibe","kredi","ab_fon"]',
       '5 eksenli CNC işleme parkuru kapasite artışı, yeşil sanayi dönüşümü ve Avrupa otomotiv yan sanayi ihracat pazarlama projesi.'
     )`
  ).run();

  // 3. Seed Grant, Fund & Credit Programs (Local + EU + Global)
  const progCount = await db.prepare(`SELECT COUNT(*) as cnt FROM mw_grant_programs`).first() as any;
  if (!progCount || Number(progCount.cnt) === 0) {
    const programs = [
      {
        id: 'prg_tubitak_1507',
        code: 'TUBITAK-1507',
        title: 'TÜBİTAK 1507 – KOBİ Ar-Ge Başlangıç Destek Programı',
        provider: 'TÜBİTAK TEYDEB',
        scope: 'yerel',
        funding_type: 'hibe',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 0,
        max_company_age: 99,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret","Makine & Ekipman Üretimi","Metal & Çelik Üretim","Otomotiv & Yan Sanayi","Elektrik, Elektronik & Enerji"]',
        requires_export: 0,
        requires_rd: 1,
        grant_rate: '%75 Geri Ödemesiz Hibe',
        max_amount: '3.500.000 TL (18 Ay)',
        deadline_info: 'Sürekli / Dönemsel Çağrı Açık (PRODİS)',
        official_url: 'https://eteydeb.tubitak.gov.tr/',
        description: 'Yazılım, yapay zekâ algoritmaları, bulut tabanlı B2B eşleştirme/e-ihale motorları ve yenilikçi ürün projelerinde personel, yazılım, bulut ve akademik danışmanlık giderlerinin %75’ini geri ödemesiz karşılar.',
        requirements_checklist: JSON.stringify([
          'TÜBİTAK PRODİS (eteydeb.tubitak.gov.tr) firma ve kullanıcı kaydının tamamlanması',
          'İş paketleri (İP): Yapay Zekâ Akıllı Eşleştirme, Dinamik E-İhale ve CariNet ERP Senkronizasyon algoritmalarının teknik kurgusu',
          'Proje ekibindeki yazılımcı/mühendis özgeçmişleri ve adam-ay bütçe tablosunun girilmesi',
          'Üniversiteden 1 akademisyen ile Ar-Ge danışmanlık protokolü (isteğe bağlı, puan artırıcı)'
        ])
      },
      {
        id: 'prg_ticaret_10962',
        code: 'TICARET-10962-BILISIM',
        title: 'Ticaret Bakanlığı – 10962 Sayılı Bilişim & Hizmet Sektörleri Atılım Programı (E-Turquality)',
        provider: 'T.C. Ticaret Bakanlığı & HİB',
        scope: 'yerel',
        funding_type: 'hibe',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 1,
        max_company_age: 99,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret","Toptan & Dış Ticaret (İhracat/İthalat)"]',
        requires_export: 1,
        requires_rd: 1,
        grant_rate: '%50 – %70 Geri Ödemesiz Hibe',
        max_amount: 'Yıllık 15.000.000 TL+ (Reklam, 5 Personel, Fuar & Marka)',
        deadline_info: 'Sürekli Açık (DYS Üzerinden)',
        official_url: 'https://kolaydestek.gov.tr/',
        description: '2026 yılında yürürlüğe giren 10962 sayılı Karar kapsamında; B2B SaaS, ERP ve dijital platformların yurt dışı dijital reklamlarını (%50-%70), 5 nitelikli personel maaşını, yurt dışı fuar/etkinlik ve marka tescil giderlerini destekler.',
        requirements_checklist: JSON.stringify([
          'Hizmet İhracatçıları Birliği (HİB - hib.org.tr) kurumsal üyeliğinin tamamlanması',
          'Ticaret Bakanlığı Destek Yönetim Sistemi (DYS) yararlanıcı kaydının açılması',
          'MeetWork, StokPratik ve DepodanDirekt için Yurt Dışı Dijital Pazarlama (Google/LinkedIn/Meta) bütçe planının sunulması',
          'Desteklenecek yazılımcı / iş geliştirme ve pazarlama personeli SGK ve sözleşme evraklarının yüklenmesi'
        ])
      },
      {
        id: 'prg_ab_eurostars_1509',
        code: 'EU-EUROSTARS-1509',
        title: 'EUREKA & Eurostars-3 / TÜBİTAK 1509 Uluslararası Ortaklı Ar-Ge Hibesi',
        provider: 'Avrupa Birliği EUREKA & TÜBİTAK 1509',
        scope: 'ab',
        funding_type: 'ab_fon',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 1,
        max_company_age: 99,
        eligible_sectors: '["all"]',
        requires_export: 1,
        requires_rd: 1,
        grant_rate: '%75 Geri Ödemesiz Hibe',
        max_amount: '25.000.000 TL (Ortak Başına Bütçe Tavanı)',
        deadline_info: 'Yılda 2 Çağrı (Mart & Eylül)',
        official_url: 'https://www.eurekanetwork.org/programmes/eurostars/',
        description: 'AB fonları arasında KOBİ kabul oranı en yüksek (~%28) programdır. Avrupa’dan 1 teknoloji/ticaret ortağı ile sınır ötesi B2B ticaret, yapay zekâ ve ERP entegrasyonu geliştiren Türk KOBİ’lerine %75 hibe sağlar.',
        requirements_checklist: JSON.stringify([
          'EU Funding & Tenders ve EUREKA portalında kurumsal profilin oluşturulması',
          'Avrupa’dan en az 1 KOBİ/teknoloji partneri ile 2’li konsorsiyum niyet mektubunun (MoU) imzalanması',
          'Uluslararası başvuru sonrası Türkiye bütçesi için TÜBİTAK 1509 PRODİS başvurusunun onaylanması'
        ])
      },
      {
        id: 'prg_ab_digital_europe',
        code: 'EU-DIGITAL-EUROPE',
        title: 'AB Dijital Avrupa Programı (Digital Europe Programme - DEP)',
        provider: 'Avrupa Komisyonu & Sanayi ve Teknoloji Bakanlığı',
        scope: 'ab',
        funding_type: 'ab_fon',
        eligible_org_types: '["ltd_as","stk_dernek","kooperatif"]',
        min_company_age: 1,
        max_company_age: 99,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret","Makine & Ekipman Üretimi","Metal & Çelik Üretim"]',
        requires_export: 0,
        requires_rd: 1,
        grant_rate: '%50 – %75 Euro Hibesi',
        max_amount: '150.000 € – 2.000.000 €',
        deadline_info: '2026 – 2027 Çağrıları Açık',
        official_url: 'https://dijitalavrupa.sanayi.gov.tr/',
        description: 'Türkiye’nin asosiye ülke olduğu 8,1 Milyar Euro bütçeli AB programıdır. Yapay zekâ (AI), ortak B2B veri alanları (Data Spaces) ve KOBİ dijital dönüşüm platformlarının yaygınlaştırılmasını Euro bazında fonlar.',
        requirements_checklist: JSON.stringify([
          'Avrupa Komisyonu EU Funding & Tenders Portalından 9 haneli PIC (Participant Identification Code) numarasının alınması',
          'Türkiye’deki Avrupa Dijital İnovasyon Merkezleri (ADİM / EDIH) ile ön değerlendirme eşleşmesi',
          'KOBİ Veri Alanları ve Yapay Zekâ Uyarlama çağrısına proje özetinin (Proposal) yüklenmesi'
        ])
      },
      {
        id: 'prg_ebrd_sme_star',
        code: 'GLOBAL-EBRD-SME',
        title: 'EBRD KOBİ Danışmanlık Hibesi & Star Venture Teknoloji Ölçeklendirme Programı',
        provider: 'EBRD (Avrupa İmar ve Kalkınma Bankası)',
        scope: 'global',
        funding_type: 'global',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 2,
        max_company_age: 10,
        eligible_sectors: '["all"]',
        requires_export: 1,
        requires_rd: 0,
        grant_rate: '%50 – %75 Euro Hibesi',
        max_amount: '10.000 € – 50.000 € Hibe + Küresel Mentorluk',
        deadline_info: 'Sürekli / Dönemsel Çağrı Açık',
        official_url: 'https://www.ebrd.com/small-business-support/turkiye.html',
        description: 'En az 2 yıllık faaliyet geçmişi ve mali tablosu olan (2021 kuruluşlu şirketlere tam uyumlu) KOBİ ve teknoloji girişimlerine; ihracat, dijital pazarlama, yazılım mimarisi ve kurumsal yönetim danışmanlığı için Euro bazında hibe sağlar.',
        requirements_checklist: JSON.stringify([
          'Son 2 yıla ait onaylı kurumlar vergisi beyannamesi ve bilanço/gelir tablosunun hazırlanması (2021 kuruluş avantajı)',
          'Danışmanlık alınacak alanın (Uluslararası Büyüme / Yazılım Mimarisi / İhracat Stratejisi) belirlenmesi',
          'EBRD Türkiye KOBİ Destek ekibi ile ön uygunluk görüşmesinin başlatılması'
        ])
      },
      {
        id: 'prg_ms_google_cloud',
        code: 'GLOBAL-CLOUD-AI-150K',
        title: 'Microsoft for Startups Founders Hub & Global Cloud / AI Altyapı Fonu',
        provider: 'Microsoft & Google Cloud Global',
        scope: 'global',
        funding_type: 'global',
        eligible_org_types: '["ltd_as","sahis"]',
        min_company_age: 0,
        max_company_age: 10,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret"]',
        requires_export: 0,
        requires_rd: 1,
        grant_rate: '%100 Altyapı & AI Hibesi (Özsermayesiz)',
        max_amount: '150.000 $ Azure + OpenAI GPT-4o & Bulut Kredisi',
        deadline_info: 'Sürekli Açık (Hemen Başvurulabilir)',
        official_url: 'https://foundershub.startups.microsoft.com/',
        description: 'Kendi yazılım tabanlı ürününü veya B2B SaaS platformunu (MeetWork, StokPratik, DepodanDirekt) geliştiren teknoloji şirketlerine yatırım şartı aranmaksızın 150.000 $’a kadar bulut sunucu ve yapay zekâ API hibesi verir.',
        requirements_checklist: JSON.stringify([
          'Kurumsal alan adı (meetwork.com.tr / stokpratik.com.tr) ve LinkedIn şirket sayfasının doğrulanması',
          'MeetWork AI Eşleştirme ve StokPratik Bulut ERP ürün mimarisi tanıtım metninin girilmesi',
          'İlk aşama (5.000 $ - 25.000 $) aktivasyonu sonrası 150.000 $ üst kademeye geçiş talebi'
        ])
      },
      {
        id: 'prg_kosgeb_kapasite',
        code: 'KOSGEB-KAPASITE-20M',
        title: 'KOSGEB Kapasite Geliştirme Destek Programı (Yazılım, Bilişim & İmalat)',
        provider: 'KOSGEB',
        scope: 'yerel',
        funding_type: 'kredi',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 2,
        max_company_age: 99,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret","Metal & Çelik Üretim","Makine & Ekipman Üretimi","Otomotiv & Yan Sanayi","Plastik, Kauçuk & Ambalaj","Gıda, Tarım & İçecek"]',
        requires_export: 0,
        requires_rd: 0,
        grant_rate: '20 Puan Kredi Faiz/Kâr Payı Hibesi',
        max_amount: '20.000.000 TL Kredi Üst Limiti (36 Ay Vade)',
        deadline_info: '2026 Dönem Çağrıları Açık',
        official_url: 'https://edevlet.kosgeb.gov.tr/',
        description: 'Bilanço esasına göre defter tutan, geçmiş mali yılı onaylı (2021 kuruluşlu şirketlere tam uyumlu) yazılım, bilişim ve imalat KOBİ’lerinin personel, yazılım, makine ve işletme sermayesi kredilerinde 20 puan faiz yükünü geri ödemesiz karşılar.',
        requirements_checklist: JSON.stringify([
          'e-Devlet KOSGEB KOBİ Bilgi Sistemi (KBS) üzerinde güncel KOBİ Beyannamesinin onaylanması',
          'NACE Rev.2 kodunun (62.01 Yazılım / Bilişim veya İmalat) uygunluğunun kontrolü',
          'Anlaşmalı bankalar üzerinden 24-36 ay vadeli yatırım ve kapasite proje başvurusunun girilmesi'
        ])
      },
      {
        id: 'prg_kosgeb_yerli_yazilim',
        code: 'KOSGEB-YERLI-YAZILIM-SATIS',
        title: 'KOSGEB Dijital Dönüşüm & Yerli Malı Yazılım Tedarikçisi Satış Kaldıracı',
        provider: 'KOSGEB & Sanayi ve Teknoloji Bakanlığı',
        scope: 'yerel',
        funding_type: 'vergi_teknopark',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 1,
        max_company_age: 99,
        eligible_sectors: '["Teknoloji, Yazılım & E-Ticaret"]',
        requires_export: 0,
        requires_rd: 1,
        grant_rate: 'Müşteriye %60 – %75 Hibe (+%15 Yerli Malı Avantajı)',
        max_amount: 'Sınırsız B2B Yazılım Satış Çarpanı',
        deadline_info: 'Sürekli Açık',
        official_url: 'https://www.kosgeb.gov.tr/',
        description: 'StokPratik ERP, CariNet ve MeetWork yazılımları için Ticaret/Sanayi Odasından "Yazılım Yerli Malı Belgesi" alınarak; müşterilerinizin sizden satın alacağı yazılım faturalarının %75’ini KOSGEB’den hibe olarak geri almasını sağlar.',
        requirements_checklist: JSON.stringify([
          'Bağlı olunan Ticaret/Sanayi Odasından StokPratik ERP ve MeetWork için "Yerli Malı Belgesi" başvurusu',
          'KOSGEB Dijital Dönüşüm yerli yazılım envanterine ürün kaydının yapılması',
          'MeetWork üyesi fabrikalara "%75 KOSGEB Destekli ERP & B2B Paketi" satış kampanyasının başlatılması'
        ])
      },
      {
        id: 'prg_kosgeb_yeni_girisimci',
        code: 'KOSGEB-IS-GELISTIRME',
        title: 'KOSGEB Girişimci Destek Programı – İş Geliştirme Desteği (0-3 Yaş Şirketler)',
        provider: 'KOSGEB',
        scope: 'yerel',
        funding_type: 'hibe',
        eligible_org_types: '["ltd_as","sahis"]',
        min_company_age: 0,
        max_company_age: 3,
        eligible_sectors: '["all"]',
        requires_export: 0,
        requires_rd: 0,
        grant_rate: '%80 Destek Oranı (Faizsiz Geri Ödemeli)',
        max_amount: '2.250.000 TL – 2.500.000 TL',
        deadline_info: 'Yılda 3 Dönem Çağrı',
        official_url: 'https://www.kosgeb.gov.tr/',
        description: 'Sadece son 3 yıl içinde yeni kurulmuş işletmelere yöneliktir. (2021 kuruluşlu şirketler yaş kriterinden dolayı bu programa başvuramaz; yerine 20 Milyon TL üst limitli KOSGEB Kapasite Geliştirme programına başvururlar).',
        requirements_checklist: JSON.stringify([
          'Şirket kuruluş tarihinin başvuru tarihi itibarıyla 3 yılı aşmamış olması',
          'İleri Girişimcilik Eğitimi sertifikasının tamamlanmış olması'
        ])
      },
      {
        id: 'prg_ticaret_5973_eihracat',
        code: 'TICARET-5973-EIHRACAT',
        title: 'Ticaret Bakanlığı – 5973 Sayılı E-İhracat & Dijital Pazaryeri Destekleri',
        provider: 'T.C. Ticaret Bakanlığı',
        scope: 'yerel',
        funding_type: 'hibe',
        eligible_org_types: '["ltd_as"]',
        min_company_age: 1,
        max_company_age: 99,
        eligible_sectors: '["all"]',
        requires_export: 1,
        requires_rd: 0,
        grant_rate: '%50 – %70 Geri Ödemesiz Hibe',
        max_amount: 'Yıllık 10.000.000 TL+ (Dijital Pazarlama & Pazaryeri)',
        deadline_info: 'Sürekli Açık (DYS)',
        official_url: 'https://kolaydestek.gov.tr/',
        description: 'DepodanDirekt ve ihracatçı KOBİ’ler için yurt dışı pazaryeri entegrasyonu, dijital reklam, sipariş karşılama (fulfillment) ve yurt dışı tanıtım giderlerinin %50 ila %70’ini geri ödemesiz karşılar.',
        requirements_checklist: JSON.stringify([
          'İlgili İhracatçı Birliğine üyelik ve DYS kaydı',
          'Hedef ülkelerdeki dijital pazarlama ve e-ihracat platform gider faturalarının DYS’ye sunulması'
        ])
      },
      {
        id: 'prg_tkdk_ipard3',
        code: 'TKDK-IPARD-III',
        title: 'TKDK – IPARD III Tarım, Gıda, Yenilenebilir Enerji & Kooperatif Hibesi',
        provider: 'TKDK & Avrupa Birliği (IPARD)',
        scope: 'ab',
        funding_type: 'hibe',
        eligible_org_types: '["ltd_as","sahis","kooperatif"]',
        min_company_age: 0,
        max_company_age: 99,
        eligible_sectors: '["Gıda, Tarım & İçecek","Elektrik, Elektronik & Enerji","Makine & Ekipman Üretimi"]',
        requires_export: 0,
        requires_rd: 0,
        grant_rate: '%50 – %75 Geri Ödemesiz Hibe',
        max_amount: '500.000 € – 3.000.000 €',
        deadline_info: '81 İlde Dönemsel Çağrı Açık',
        official_url: 'https://www.tkdk.gov.tr/',
        description: '81 ilde gıda işleme, soğuk hava deposu, kırsal üretim, zanaatkârlık, GES/yenilenebilir enerji yatırımları ve üretici kooperatiflerine %50-%75 geri ödemesiz hibe sağlar.',
        requirements_checklist: JSON.stringify([
          'TKDK İl Koordinatörlüğü üzerinden yatırım yeri ve tedarikçi proforma tekliflerinin hazırlanması',
          'Teknik proje ve iş planı dosyasının çağrı takviminde sunulması'
        ])
      },
      {
        id: 'prg_stk_ab_stgm',
        code: 'STK-AB-SIVILDUSUN-IPA',
        title: 'AB Sivil Düşün, STGM & Kalkınma Ajansı (SOGEP) STK / Dernek / Vakıf / Oda Fonları',
        provider: 'Avrupa Birliği, STGM & Kalkınma Ajansları',
        scope: 'ab',
        funding_type: 'stk_fon',
        eligible_org_types: '["stk_dernek","kooperatif"]',
        min_company_age: 0,
        max_company_age: 99,
        eligible_sectors: '["all"]',
        requires_export: 0,
        requires_rd: 0,
        grant_rate: '%80 – %100 Geri Ödemesiz Hibe',
        max_amount: '15.000 € – 250.000 €',
        deadline_info: 'Sürekli / Dönemsel Çağrı Açık',
        official_url: 'https://www.stgm.org.tr/fon-kaynaklari',
        description: 'Dernekler, vakıflar, kooperatifler, meslek odaları ve iş dünyası STK’larının istihdam, dijitalleşme, kadın/genç girişimciliği ve sektörel B2B eşleştirme projelerine %80-%100 hibe verir (MeetWork teknoloji çözüm ortağı olarak bütçelenebilir).',
        requirements_checklist: JSON.stringify([
          'Dernek / Vakıf / Kooperatif tüzüğü ve yönetim kurulu başvuru kararının hazırlanması',
          'Sivil Düşün Bilgi Sistemi (SDBİS) veya Kalkınma Ajansı KAYS kaydının açılması',
          'Dijital B2B eşleştirme ve etkinlik altyapısı için MeetWork çözüm ortaklığı protokolünün eklenmesi'
        ])
      }
    ];

    for (const p of programs) {
      await db.prepare(
        `INSERT OR IGNORE INTO mw_grant_programs (
           id, code, title, provider, scope, funding_type, eligible_org_types,
           min_company_age, max_company_age, eligible_sectors, requires_export, requires_rd,
           grant_rate, max_amount, deadline_info, official_url, description, requirements_checklist
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        p.id, p.code, p.title, p.provider, p.scope, p.funding_type, p.eligible_org_types,
        p.min_company_age, p.max_company_age, p.eligible_sectors, p.requires_export, p.requires_rd,
        p.grant_rate, p.max_amount, p.deadline_info, p.official_url, p.description, p.requirements_checklist
      ).run();
    }
  }

  // 4. Pre-Seed Active Grant Applications for DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (2021)
  const appCount = await db.prepare(`SELECT COUNT(*) as cnt FROM mw_grant_applications WHERE company_id = 'comp_meetwork_hq'`).first() as any;
  if (!appCount || Number(appCount.cnt) === 0) {
    const ddApps = [
      {
        id: 'gapp_dd_1',
        application_no: 'MW-FON-2026-001',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_ms_google_cloud',
        program_title: 'Microsoft for Startups Founders Hub & Global Cloud / AI Altyapı Fonu (150.000 $)',
        provider: 'Microsoft & Google Cloud Global',
        scope: 'global',
        match_score: 98,
        project_title: 'MeetWork AI Eşleştirme, Teşvik Robotu ve StokPratik Bulut Altyapı Ölçeklendirme',
        project_notes: '2021 kuruluşlu DD İnternet Ltd. Şti. kurumsal alan adı ve canlı B2B SaaS ürünleri (meetwork.com.tr & stokpratik.com.tr) ile doğrudan başvuru.',
        current_step: 'Resmi Kayıt (DYS / PRODİS / PIC)',
        checklist_progress: JSON.stringify({ 0: true, 1: true, 2: false })
      },
      {
        id: 'gapp_dd_2',
        application_no: 'MW-FON-2026-002',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_ticaret_10962',
        program_title: 'Ticaret Bakanlığı – 10962 Sayılı Bilişim & Hizmet Sektörleri Atılım Programı (%50-%70 Hibe)',
        provider: 'T.C. Ticaret Bakanlığı & HİB',
        scope: 'yerel',
        match_score: 98,
        project_title: 'MeetWork Global, StokPratik ve DepodanDirekt 60 Ülke Dijital Reklam & Yazılım Personeli Desteği',
        project_notes: 'HİB üyeliği ve DYS tanımlaması ile yurt dışı reklamların %70 hibe kapsamına alınması ve 5 personel maaş desteği.',
        current_step: 'Ön Analiz & Evrak Hazırlığı',
        checklist_progress: JSON.stringify({ 0: true, 1: false, 2: false, 3: false })
      },
      {
        id: 'gapp_dd_3',
        application_no: 'MW-FON-2026-003',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_tubitak_1507',
        program_title: 'TÜBİTAK 1507 – KOBİ Ar-Ge Başlangıç Destek Programı (3.500.000 TL / %75 Hibe)',
        provider: 'TÜBİTAK TEYDEB',
        scope: 'yerel',
        match_score: 96,
        project_title: 'Yapay Zekâ ve Çok Kriterli Karar Verme Tabanlı B2B Akıllı İş Eşleştirme, Dinamik E-İhale ve CariNet ERP Entegrasyon Motoru',
        project_notes: 'PRODİS üzerinden 18 aylık Ar-Ge projesi olarak yazılımcı maaşları ve bulut/test giderlerinin %75 hibe ile fonlanması.',
        current_step: 'Proje Dosyası Yazılıyor',
        checklist_progress: JSON.stringify({ 0: true, 1: true, 2: false, 3: false })
      },
      {
        id: 'gapp_dd_4',
        application_no: 'MW-FON-2026-004',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_ebrd_sme_star',
        program_title: 'EBRD KOBİ Danışmanlık Hibesi & Star Venture (10.000 € – 50.000 € Euro Hibesi)',
        provider: 'EBRD (Avrupa İmar ve Kalkınma Bankası)',
        scope: 'global',
        match_score: 96,
        project_title: 'DD İnternet (2021) Uluslararası Büyüme, İhracat Stratejisi ve Bulut Mimarisi Danışmanlık Hibesi',
        project_notes: '2021 kuruluşlu şirketimizin 5 yıllık onaylı bilançoları ile EBRD %70 hibe destekli danışmanlık ve Star Venture başvurusu.',
        current_step: 'Ön Analiz & Evrak Hazırlığı',
        checklist_progress: JSON.stringify({ 0: true, 1: false, 2: false })
      },
      {
        id: 'gapp_dd_5',
        application_no: 'MW-FON-2026-005',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_ab_digital_europe',
        program_title: 'AB Dijital Avrupa Programı (Digital Europe) & Eurostars-3 Konsorsiyum Kaydı',
        provider: 'Avrupa Komisyonu & TÜBİTAK',
        scope: 'ab',
        match_score: 95,
        project_title: 'Avrupa B2B KOBİ Veri Alanı (Data Space) ve Akıllı Tedarik Zinciri Eşleştirme Ağı',
        project_notes: 'EU Funding & Tenders Portal üzerinden DD İnternet Ltd. Şti. adına 9 haneli PIC numarasının alınması ve AB konsorsiyum ortaklığı.',
        current_step: 'Resmi Kayıt (DYS / PRODİS / PIC)',
        checklist_progress: JSON.stringify({ 0: true, 1: false, 2: false })
      },
      {
        id: 'gapp_dd_6',
        application_no: 'MW-FON-2026-006',
        company_id: 'comp_meetwork_hq',
        company_name: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork)',
        contact_name: 'DD İnternet Yönetim',
        contact_phone: '05412465429',
        contact_email: 'yonetim@meetwork.com.tr',
        program_id: 'prg_kosgeb_yerli_yazilim',
        program_title: 'KOSGEB Kapasite Geliştirme (20M TL) & Yerli Malı Yazılım Tedarikçisi Kaydı',
        provider: 'KOSGEB & Ticaret Odası',
        scope: 'yerel',
        match_score: 95,
        project_title: 'StokPratik ERP ve MeetWork Yazılımlarının Müşterilere %75 KOSGEB Desteğiyle Satışı',
        project_notes: 'Yazılım Yerli Malı Belgesi alınarak MeetWork üyesi işletmelere devlet destekli ERP ve kurumsal üyelik satışı.',
        current_step: 'Ön Analiz & Evrak Hazırlığı',
        checklist_progress: JSON.stringify({ 0: true, 1: false, 2: false })
      }
    ];

    for (const appItem of ddApps) {
      await db.prepare(
        `INSERT OR IGNORE INTO mw_grant_applications (
           id, application_no, company_id, company_name, contact_name, contact_phone, contact_email,
           program_id, program_title, provider, scope, match_score, project_title, project_notes,
           current_step, checklist_progress
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        appItem.id, appItem.application_no, appItem.company_id, appItem.company_name,
        appItem.contact_name, appItem.contact_phone, appItem.contact_email,
        appItem.program_id, appItem.program_title, appItem.provider, appItem.scope,
        appItem.match_score, appItem.project_title, appItem.project_notes,
        appItem.current_step, appItem.checklist_progress
      ).run();
    }
  }
}

app.get('/api/grants/match', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialGrantEcosystem(c.env.DB);

  const companyId = c.req.query('company_id') || '';
  if (!companyId || companyId === 'guest') {
    return c.json({
      success: false,
      requires_auth: true,
      message: 'Teşvik, hibe ve kredi eşleşmeleri işletmeye özeldir. Lütfen işletme hesabınızla giriş yapın.'
    }, 401);
  }

  const savedProfile = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_profiles WHERE company_id = ? LIMIT 1`
  ).bind(companyId).first() as any;

  const companyRow = await c.env.DB.prepare(
    `SELECT * FROM mw_companies WHERE id = ? OR slug = ? LIMIT 1`
  ).bind(companyId, companyId).first() as any;

  const resolvedCompanyId = companyRow ? companyRow.id : companyId;

  const customProfile = {
    company_id: resolvedCompanyId,
    company_name: c.req.query('company_name') || (savedProfile && savedProfile.company_name) || (companyRow && companyRow.name) || 'İşletmem',
    org_type: c.req.query('org_type') || (savedProfile && savedProfile.org_type) || 'ltd_as',
    founded_year: Number(c.req.query('founded_year') || (savedProfile && savedProfile.founded_year) || 2021),
    nace_sector: c.req.query('nace_sector') || (savedProfile && savedProfile.nace_sector) || (companyRow && companyRow.sector) || 'Teknoloji, Yazılım & E-Ticaret',
    city: c.req.query('city') || (savedProfile && savedProfile.city) || (companyRow && companyRow.city) || 'İstanbul',
    employee_range: c.req.query('employee_range') || (savedProfile && savedProfile.employee_range) || '10-49',
    revenue_range: c.req.query('revenue_range') || (savedProfile && savedProfile.revenue_range) || '5M-25M',
    balance_years: Number(c.req.query('balance_years') || (savedProfile && savedProfile.balance_years) || 5),
    has_export: c.req.query('has_export') !== undefined ? Number(c.req.query('has_export')) : Number(savedProfile ? savedProfile.has_export : 1),
    has_rd_software: c.req.query('has_rd_software') !== undefined ? Number(c.req.query('has_rd_software')) : Number(savedProfile ? savedProfile.has_rd_software : 1),
    seeking_consortium_partner: c.req.query('seeking_consortium_partner') !== undefined ? Number(c.req.query('seeking_consortium_partner')) : Number(savedProfile ? savedProfile.seeking_consortium_partner : 1),
    project_summary: c.req.query('project_summary') || (savedProfile && savedProfile.project_summary) || ''
  };

  const { results: programs } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_programs WHERE status = 'active'`
  ).all();

  const { matched, filteredOut } = evaluateGrantMatches(customProfile, programs || []);

  const { results: applications } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_applications WHERE company_id = ? ORDER BY created_at DESC`
  ).bind(resolvedCompanyId).all();

  return c.json({
    success: true,
    profile: customProfile,
    matched,
    filtered_out: filteredOut,
    applications: applications || []
  });
});

app.post('/api/grants/profile', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialGrantEcosystem(c.env.DB);
  const body = await c.req.json();
  const companyId = body.company_id || '';
  if (!companyId || companyId === 'guest') {
    return c.json({ success: false, message: 'Lütfen önce işletme hesabınızla giriş yapın.' }, 401);
  }
  const foundedYear = Number(body.founded_year || 2021);
  const balanceYears = Math.max(0, 2026 - foundedYear);

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_grant_profiles (
       company_id, company_name, org_type, founded_year, nace_sector, city,
       employee_range, revenue_range, balance_years, has_export, has_rd_software,
       seeking_consortium_partner, project_summary, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    companyId,
    body.company_name || 'MeetWork Üye İşletme',
    body.org_type || 'ltd_as',
    foundedYear,
    body.nace_sector || 'Teknoloji, Yazılım & E-Ticaret',
    body.city || 'İstanbul',
    body.employee_range || '10-49',
    body.revenue_range || '5M-25M',
    balanceYears,
    body.has_export ? 1 : 0,
    body.has_rd_software ? 1 : 0,
    body.seeking_consortium_partner ? 1 : 0,
    body.project_summary || ''
  ).run();

  const { results: programs } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_programs WHERE status = 'active'`
  ).all();

  const profileObj = {
    company_id: companyId,
    company_name: body.company_name || 'MeetWork Üye İşletme',
    org_type: body.org_type || 'ltd_as',
    founded_year: foundedYear,
    nace_sector: body.nace_sector || 'Teknoloji, Yazılım & E-Ticaret',
    city: body.city || 'İstanbul',
    employee_range: body.employee_range || '10-49',
    revenue_range: body.revenue_range || '5M-25M',
    balance_years: balanceYears,
    has_export: body.has_export ? 1 : 0,
    has_rd_software: body.has_rd_software ? 1 : 0,
    seeking_consortium_partner: body.seeking_consortium_partner ? 1 : 0,
    project_summary: body.project_summary || ''
  };

  const { matched, filteredOut } = evaluateGrantMatches(profileObj, programs || []);
  const { results: applications } = await c.env.DB.prepare(
    `SELECT * FROM mw_grant_applications WHERE company_id = ? ORDER BY created_at DESC`
  ).bind(companyId).all();

  return c.json({
    success: true,
    message: 'İşletme / STK teşvik, hibe ve fon uygunluk profili güncellendi!',
    profile: profileObj,
    matched,
    filtered_out: filteredOut,
    applications: applications || []
  });
});

app.post('/api/grants/apply', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialGrantEcosystem(c.env.DB);
  const body = await c.req.json();
  if (!body.company_id || body.company_id === 'guest') {
    return c.json({ success: false, message: 'Başvuru başlatmak için lütfen işletme hesabınızla giriş yapın.' }, 401);
  }
  const id = uid('gapp');
  const appNo = `MW-FON-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  await c.env.DB.prepare(
    `INSERT INTO mw_grant_applications (
       id, application_no, company_id, company_name, contact_name, contact_phone, contact_email,
       program_id, program_title, provider, scope, match_score, project_title, project_notes,
       current_step, checklist_progress
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ön Analiz & Evrak Hazırlığı', '{}')`
  ).bind(
    id,
    appNo,
    body.company_id,
    body.company_name || 'MeetWork Üye İşletme',
    body.contact_name || 'Firma Yetkilisi',
    body.contact_phone || '',
    body.contact_email || '',
    body.program_id || 'prg_tubitak_1507',
    body.program_title || 'Hibe & Teşvik Programı',
    body.provider || 'Resmi Kurum',
    body.scope || 'yerel',
    Number(body.match_score || 95),
    body.project_title || 'Kurumsal Gelişim, Ar-Ge ve Ticaret Projesi',
    body.project_notes || ''
  ).run();

  return c.json({
    success: true,
    application_no: appNo,
    message: `Başvuru ve danışmanlık talebiniz (#${appNo}) oluşturuldu ve Başvuru Takip Masanıza eklendi!`
  });
});

app.put('/api/grants/application/:id', async (c) => {
  await ensureSchema(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const nextStep = body.current_step || body.status_step || null;

  await c.env.DB.prepare(
    `UPDATE mw_grant_applications
     SET current_step = COALESCE(?, current_step),
         checklist_progress = COALESCE(?, checklist_progress),
         project_notes = COALESCE(?, project_notes),
         admin_notes = COALESCE(?, admin_notes)
     WHERE id = ?`
  ).bind(
    nextStep,
    body.checklist_progress ? (typeof body.checklist_progress === 'string' ? body.checklist_progress : JSON.stringify(body.checklist_progress)) : null,
    body.project_notes || null,
    body.admin_notes || null,
    id
  ).run();

  return c.json({ success: true, message: 'Başvuru adımı ve kontrol listesi güncellendi.' });
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
  await ensureInitialGrantEcosystem(c.env.DB);
  const { results: companies } = await c.env.DB.prepare(`SELECT * FROM mw_companies ORDER BY created_at DESC LIMIT 100`).all();
  const { results: users } = await c.env.DB.prepare(`SELECT id, email, full_name, phone, role, company_id, match_credits, tender_credits, created_at FROM mw_users ORDER BY created_at DESC LIMIT 100`).all();
  const { results: listings } = await c.env.DB.prepare(`SELECT * FROM mw_listings ORDER BY created_at DESC LIMIT 100`).all();
  const { results: tenders } = await c.env.DB.prepare(`SELECT * FROM mw_tenders ORDER BY created_at DESC LIMIT 100`).all();
  const { results: posts } = await c.env.DB.prepare(`SELECT * FROM mw_posts ORDER BY created_at DESC LIMIT 50`).all();
  const { results: grantApplications } = await c.env.DB.prepare(`SELECT * FROM mw_grant_applications ORDER BY created_at DESC LIMIT 100`).all();

  return c.json({
    success: true,
    stats: {
      total_companies: (companies || []).length,
      total_users: (users || []).length,
      total_listings: (listings || []).length,
      total_tenders: (tenders || []).length,
      total_posts: (posts || []).length,
      total_grant_applications: (grantApplications || []).length
    },
    companies: companies || [],
    users: users || [],
    listings: listings || [],
    tenders: tenders || [],
    posts: posts || [],
    grant_applications: grantApplications || []
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
    company: 'mw_companies',
    grant_app: 'mw_grant_applications',
    grant_application: 'mw_grant_applications'
  };
  const table = tableMap[type];
  if (!table) return c.json({ success: false, message: 'Geçersiz tablo.' }, 400);

  await c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return c.json({ success: true, message: 'Kayıt silindi.' });
});

app.post('/api/superadmin/bootstrap', async (c) => {
  await ensureSchema(c.env.DB);
  await ensureInitialGrantEcosystem(c.env.DB);

  // 1. SuperAdmin & DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. Hesabı (yonetim@meetwork.com.tr / MeetWork2026!)
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO mw_users (id, email, password_hash, full_name, phone, title, company_id, role, match_credits, tender_credits)
     VALUES ('usr_superadmin', 'yonetim@meetwork.com.tr', 'MeetWork2026!', 'DD İnternet & MeetWork Yönetimi', '05412465429', 'Yönetim Kurulu / SuperAdmin', 'comp_meetwork_hq', 'superadmin', 999, 999)`
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

  // Eşleşme (Akıllı Eşleşme) testi için hedef ve sürpriz sektör işletmeleri
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
    message: 'DD İnternet ve E-Ticaret Hizmetleri Ltd. Şti. (MeetWork) hesabı, Hibe/Fon havuzu ve Test Üye hesapları başarıyla hazırlandı!'
  });
});

export default app;
