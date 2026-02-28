export default async function handler(req, res) {
    // URL'den ekstra özellikleri de alabiliyoruz artık (bg, text, stroke vb.)
    const { 
        username, 
        repo, 
        theme = 'dark',
        bg,          // Özel arkaplan (örn: bg=1f2937)
        titleColor,  // Özel başlık rengi (örn: titleColor=3b82f6)
        textColor    // Özel metin rengi
    } = req.query;

    if (!username || !repo) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(400).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">Hata: username ve repo eksik!</text></svg>`);
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
            headers: { 'User-Agent': 'Badges-App-Vercel-Serverless' }
        });
        
        if (!response.ok) throw new Error('Repo bulunamadi');
        const r = await response.json();

        // Renk Paleti (Kullanıcı URL'den verirse onu, yoksa temayı kullanır)
        const isDark = theme === 'dark';
        const fallbackBg = isDark ? '#0d1117' : '#ffffff';
        const cardBg = bg ? `#${bg}` : fallbackBg;
        
        const borderColor = isDark ? '#30363d' : '#e5e7eb';
        const tColor = titleColor ? `#${titleColor}` : (isDark ? '#58a6ff' : '#0969da');
        const pColor = textColor ? `#${textColor}` : (isDark ? '#8b949e' : '#57606a');
        
        // Kalkan (Badge) renkleri
        const badgeBg = isDark ? '#161b22' : '#f3f4f6';
        const badgeBorder = isDark ? '#30363d' : '#d1d5db';

        const desc = r.description ? (r.description.length > 60 ? r.description.substring(0, 60) + '...' : r.description) : 'Proje açıklaması bulunmuyor.';

        // Dinamik Kalkan Çizici Fonksiyon (Dış resim kullanmadan kalkan yapar)
        let currentX = 24;
        const drawBadge = (label, value, dotColor) => {
            const text = `${label}: ${value}`;
            // Yazı uzunluğuna göre kalkan genişliğini otomatik hesapla
            const width = text.length * 7.5 + 24; 
            const badgeSvg = `
            <g transform="translate(${currentX}, 115)">
                <rect width="${width}" height="22" rx="4" fill="${badgeBg}" stroke="${badgeBorder}"/>
                <circle cx="12" cy="11" r="4" fill="${dotColor}"/>
                <text x="22" y="15" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="600" fill="${pColor}">${text}</text>
            </g>`;
            currentX += width + 10; // Bir sonraki kalkan için X eksenini kaydır
            return badgeSvg;
        };

        let badgesHtml = '';
        if (r.language) badgesHtml += drawBadge('Lang', r.language, '#f1e05a');
        badgesHtml += drawBadge('Stars', r.stargazers_count, '#e3b341');
        if (r.forks_count > 0) badgesHtml += drawBadge('Forks', r.forks_count, '#238636');
        if (r.open_issues_count > 0) badgesHtml += drawBadge('Issues', r.open_issues_count, '#da3633');

        // Saf SVG Şablonu
        const svg = `
        <svg width="450" height="160" viewBox="0 0 450 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
                .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 20px; fill: ${tColor}; }
                .desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 400; font-size: 13px; fill: ${pColor}; }
            </style>
            
            <rect x="0.5" y="0.5" width="449" height="159" rx="12" fill="${cardBg}" stroke="${borderColor}"/>
            
            <path d="M0 12C0 5.37258 5.37258 0 12 0H438C444.627 0 450 5.37258 450 12V16H0V12Z" fill="${tColor}" opacity="0.8"/>

            <text x="24" y="50" class="title">${r.name}</text>
            <text x="24" y="80" class="desc">${desc}</text>
            
            ${badgesHtml}
        </svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=7200');
        res.status(200).send(svg);

    } catch (error) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.status(500).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">API Hatasi: ${error.message}</text></svg>`);
    }
}