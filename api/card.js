export default async function handler(req, res) {
    // 1. Parametreleri al
    const { username, repo, theme = 'dark' } = req.query;

    // Parametre yoksa uyarı SVG'si gönder
    if (!username || !repo) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(400).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">Hata: username ve repo parametreleri eksik!</text></svg>`);
    }

    try {
        // 2. Yerleşik fetch ile güvenli istek at (User-Agent zorunlu!)
        const response = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
            headers: {
                'User-Agent': 'Badges-App-Vercel-Serverless'
            }
        });
        
        if (!response.ok) {
            throw new Error('GitHub API hatasi veya repo bulunamadi');
        }
        
        const r = await response.json();

        // 3. Tema Renklerini Ayarla
        const isDark = theme === 'dark';
        const cardBg = isDark ? '#0d1117' : '#ffffff';
        const borderColor = isDark ? '#30363d' : '#e5e7eb';
        const titleColor = isDark ? '#58a6ff' : '#0969da';
        const textColor = isDark ? '#8b949e' : '#57606a';
        const iconColor = isDark ? '#8b949e' : '#57606a';

        // Açıklama çok uzunsa kırp
        const desc = r.description ? (r.description.length > 55 ? r.description.substring(0, 55) + '...' : r.description) : 'Açıklama bulunmuyor.';
        const lang = r.language || 'Unknown';

        // 4. Saf SVG Şablonu
        const svg = `
        <svg width="450" height="160" viewBox="0 0 450 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
                .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 600; font-size: 20px; fill: ${titleColor}; }
                .desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 400; font-size: 13px; fill: ${textColor}; }
                .stats { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 400; font-size: 12px; fill: ${textColor}; }
            </style>
            
            <rect x="0.5" y="0.5" width="449" height="159" rx="10" fill="${cardBg}" stroke="${borderColor}"/>
            <text x="24" y="42" class="title">${r.name}</text>
            <text x="24" y="75" class="desc">${desc}</text>
            
            <g transform="translate(24, 120)">
                <circle cx="6" cy="6" r="6" fill="#f1e05a"/>
                <text x="18" y="10" class="stats">${lang}</text>
                
                <g transform="translate(110, -2)">
                    <path fill="${iconColor}" fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                    <text x="18" y="12" class="stats">${r.stargazers_count}</text>
                </g>
                
                <g transform="translate(180, -2)">
                    <path fill="${iconColor}" fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"></path>
                    <text x="16" y="12" class="stats">${r.forks_count}</text>
                </g>
            </g>
        </svg>`;

        // 5. Başlıkları Ayarla
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=7200');
        res.status(200).send(svg);

    } catch (error) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.status(500).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">API Hatasi: ${error.message}</text></svg>`);
    }
}