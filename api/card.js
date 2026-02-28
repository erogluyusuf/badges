export default async function handler(req, res) {
    // 1. Tüm Özelleştirme Parametrelerini Al
    const { 
        username, repo, theme = 'dark',
        bg, titleColor, textColor,
        w = 450, h = 160, // Özel genişlik ve yükseklik
        img,              // Özel Logo URL'si
        qr,               // QR Kod verisi (true veya özel link)
        customBadges      // Özel Rozetler (Format: Etiket:Değer:Renk,Etiket:Değer:Renk)
    } = req.query;

    if (!username || !repo) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(400).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">Hata: username ve repo eksik!</text></svg>`);
    }

    // --- YARDIMCI FONKSİYON: Resmi indirip Base64'e çevirir (README uyumluluğu için şart!) ---
    const fetchBase64 = async (url) => {
        if (!url) return null;
        try {
            // Github blob linkini raw linkine çevirme zekası
            let safeUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            const response = await fetch(safeUrl);
            if (!response.ok) return null;
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mime = response.headers.get('content-type') || 'image/png';
            return `data:${mime};base64,${base64}`;
        } catch (e) { return null; }
    };

    try {
        // 2. Verileri Paralel Olarak Çek (Hız için aynı anda indiriyoruz)
        const ghPromise = fetch(`https://api.github.com/repos/${username}/${repo}`, { headers: { 'User-Agent': 'Badges-App-Vercel' } }).then(r => r.ok ? r.json() : null);
        
        let qrData = '';
        if (qr === 'true') qrData = `https://github.com/${username}/${repo}`;
        else if (qr) qrData = qr; // Kullanıcı özel link verdiyse onu al
        
        const qrPromise = qrData ? fetchBase64(`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}&margin=0`) : Promise.resolve(null);
        const imgPromise = img ? fetchBase64(img) : Promise.resolve(null);

        // Tüm indirmelerin bitmesini bekle
        const [r, qrBase64, imgBase64] = await Promise.all([ghPromise, qrPromise, imgPromise]);

        if (!r) throw new Error('GitHub Reposu bulunamadi');

        // 3. Renk ve Tema Ayarları
        const isDark = theme === 'dark';
        const cardBg = bg ? `#${bg}` : (isDark ? '#0d1117' : '#ffffff');
        const borderColor = isDark ? '#30363d' : '#e5e7eb';
        const tColor = titleColor ? `#${titleColor}` : (isDark ? '#58a6ff' : '#0969da');
        const pColor = textColor ? `#${textColor}` : (isDark ? '#8b949e' : '#57606a');
        const badgeBg = isDark ? '#161b22' : '#f3f4f6';
        const badgeBorder = isDark ? '#30363d' : '#d1d5db';

        const desc = r.description ? (r.description.length > 55 ? r.description.substring(0, 55) + '...' : r.description) : 'Proje açıklaması bulunmuyor.';

        // 4. Rozetleri (Badges) Çizdirme Motoru
        let badgesHtml = '';
        let currentX = 24;
        let currentY = 115;
        
        const addBadge = (label, value, dotColor) => {
            const text = `${label}: ${value}`;
            const width = text.length * 7.5 + 24; 
            // Satır sonuna gelirse alt satıra geç (Sağdaki resimlere yer bırak)
            if (currentX + width > w - 100) { 
                currentX = 24; currentY += 28; 
            }
            const b = `
            <g transform="translate(${currentX}, ${currentY})">
                <rect width="${width}" height="22" rx="4" fill="${badgeBg}" stroke="${badgeBorder}"/>
                <circle cx="12" cy="11" r="4" fill="${dotColor}"/>
                <text x="22" y="15" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="600" fill="${pColor}">${text}</text>
            </g>`;
            currentX += width + 10;
            badgesHtml += b;
        };

        // Kullanıcının özel rozetlerini ekle
        if (customBadges) {
            customBadges.split(',').forEach(badge => {
                const parts = badge.split(':');
                if (parts.length >= 2) addBadge(parts[0], parts[1], parts[2] ? `#${parts[2]}` : '#3b82f6');
            });
        }
        
        // Standart GitHub istatistiklerini ekle
        if (r.language) addBadge('Lang', r.language, '#f1e05a');
        addBadge('Stars', r.stargazers_count, '#e3b341');
        if (r.forks_count > 0) addBadge('Forks', r.forks_count, '#238636');

        // 5. Görselleri (Logo & QR) Konumlandırma
        let imagesHtml = '';
        if (imgBase64) {
            // Sağ üste logo ekle
            imagesHtml += `<image href="${imgBase64}" x="${w - 90}" y="20" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>`;
        }
        if (qrBase64) {
            // Sağ alta QR kod ekle
            imagesHtml += `<image href="${qrBase64}" x="${w - 90}" y="${h - 90}" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>`;
            // QR altına minik bir çerçeve/gölge efekti de eklenebilir
        }

        // 6. Nihai SVG Kodunu Oluştur
        const svg = `
        <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
                .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 20px; fill: ${tColor}; }
                .desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 400; font-size: 13px; fill: ${pColor}; }
            </style>
            
            <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${cardBg}" stroke="${borderColor}"/>
            <path d="M0 12C0 5.37258 5.37258 0 12 0H${w}C${w - 6.627} 0 ${w} 5.37258 ${w} 12V16H0V12Z" fill="${tColor}" opacity="0.8"/>

            <text x="24" y="50" class="title">${r.name}</text>
            <text x="24" y="80" class="desc">${desc}</text>
            
            ${badgesHtml}
            
            ${imagesHtml}
        </svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=7200, s-maxage=7200');
        res.status(200).send(svg);

    } catch (error) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.status(500).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">API Hatasi: ${error.message}</text></svg>`);
    }
}