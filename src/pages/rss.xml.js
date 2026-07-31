import fs from 'node:fs';
import path from 'node:path';

export async function GET(context) {
  const dataDir = path.join(process.cwd(), 'src/data/talepler');
  let talepler = [];

  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    talepler = files.map(file => {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      return JSON.parse(content);
    });
  }

  // En yeni talepler en üstte olsun
  talepler.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  
  // RSS feed için en fazla 100 talep al
  talepler = talepler.slice(0, 100);

  const siteUrl = context.site || 'https://meetwork.com.tr';

  const items = talepler.map(talep => `
    <item>
      <title><![CDATA[${talep.title}]]></title>
      <link>${siteUrl}/talepler/${talep.slug}</link>
      <guid isPermaLink="true">${siteUrl}/talepler/${talep.slug}</guid>
      <description><![CDATA[Yeni bir B2B iş fırsatı yayınlandı: ${talep.title}. İlan No: ${talep.id}. Bitiş Tarihi: ${new Date(talep.endDate).toLocaleDateString('tr-TR')}]]></description>
      <pubDate>${new Date(talep.publishDate).toUTCString()}</pubDate>
    </item>
  `).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>MeetWork - Güncel B2B İş Fırsatları</title>
    <link>${siteUrl}/talepler</link>
    <description>MeetWork platformundaki en güncel alım ve ihale talepleri.</description>
    <language>tr-TR</language>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    },
  });
}
