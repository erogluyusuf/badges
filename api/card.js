export default async function handler(req, res) {
    const { 
        username, repo, theme = 'dark',
        bg, titleColor, textColor,
        w = 450, h, 
        img, qr, customBadges,
        animate // YENİ: Animasyon Parametresi!
    } = req.query;

    if (!username || !repo) {
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.status(400).send(`<svg width="450" height="150" xmlns="http://www.w3.org/2000/svg"><rect width="450" height="150" fill="#f8d7da"/><text x="20" y="75" fill="#721c24" font-family="Arial" font-size="16">Hata: username ve repo eksik!</text></svg>`);
    }

    const escapeXML = (str) => {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    const fetchBase64 = async (url) => {
        if (!url) return null;
        try {
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
        const ghPromise = fetch(`https://api.github.com/repos/${username}/${repo}`, { headers: { 'User-Agent': 'Badges-App-Vercel' } }).then(r => r.ok ? r.json() : null);
        
        let qrData = '';
        if (qr === 'true') qrData = `https://github.com/${username}/${repo}`;
        else if (qr) qrData = qr;
        
        const qrPromise = qrData ? fetchBase64(`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}&margin=0`) : Promise.resolve(null);
        const imgPromise = img ? fetchBase64(img) : Promise.resolve(null);

        const [r, qrBase64, imgBase64] = await Promise.all([ghPromise, qrPromise, imgPromise]);
        if (!r) throw new Error('GitHub Reposu bulunamadi');

        const isDark = theme === 'dark';
        const cardBg = bg ? `#${bg}` : (isDark ? '#0d1117' : '#ffffff');
        const borderColor = isDark ? '#30363d' : '#e5e7eb';
        const tColor = titleColor ? `#${titleColor}` : (isDark ? '#58a6ff' : '#0969da');
        const pColor = textColor ? `#${textColor}` : (isDark ? '#8b949e' : '#57606a');
        
        const rawDesc = r.description ? (r.description.length > 55 ? r.description.substring(0, 55) + '...' : r.description) : 'Proje açıklaması bulunmuyor.';
        const safeDesc = escapeXML(rawDesc);
        const safeName = escapeXML(r.name);

        let externalBadges = [];
        if (customBadges) {
            const badgesArr = customBadges.split(',');
            const promises = badgesArr.map(async (b) => {
                const parts = b.split(':');
                if (parts.length >= 2) {
                    const label = encodeURIComponent(parts[0]);
                    const message = encodeURIComponent(parts[1]);
                    const color = parts[2] ? parts[2].replace('#', '') : '3b82f6';
                    const logo = parts[3] ? encodeURIComponent(parts[3]) : '';
                    
                    let url = `https://img.shields.io/badge/${label}-${message}-${color}?style=flat-square`;
                    if (logo) url += `&logo=${logo}&logoColor=white`;
                    
                    try {
                        const res = await fetch(url);
                        let svgText = await res.text();
                        svgText = svgText.replace(/<\?xml.*?\?>/g, '').trim();
                        const match = svgText.match(/width="([0-9.]+)"/);
                        const width = match ? parseFloat(match[1]) : 100;
                        return { svg: svgText, width };
                    } catch(e) { return null; }
                }
                return null;
            });
            externalBadges = (await Promise.all(promises)).filter(b => b !== null);
        }

        let currentX = 24;
        let currentY = 115;
        let cardWidth = parseInt(w) || 450;
        const rightMargin = (img || qr) ? 100 : 24; 
        const maxLineWidth = cardWidth - rightMargin;
        let badgesHtml = '';
        
        // YENİ: Animasyon sırası (Stagger effect) için sayaç
        let badgeIndex = 0; 
        const isAnimated = animate === 'true';

        const addInternalBadge = (label, value, dotColor) => {
            const safeText = escapeXML(`${label}: ${value}`);
            const width = safeText.length * 7.5 + 24; 
            if (currentX + width > maxLineWidth) { currentX = 24; currentY += 28; } 
            
            const badgeBg = isDark ? '#161b22' : '#f3f4f6';
            const badgeBorder = isDark ? '#30363d' : '#d1d5db';
            
            // Animasyon gecikmesini hesapla (0.4s'den başlar, her rozet için 0.1s artar)
            const animStyle = isAnimated ? `style="opacity: 0; animation: slideUp 0.6s ease-out forwards; animation-delay: ${0.4 + (badgeIndex * 0.1)}s;"` : '';
            
            const b = `
            <g transform="translate(${currentX}, ${currentY})" ${animStyle}>
                <rect width="${width}" height="22" rx="4" fill="${badgeBg}" stroke="${badgeBorder}"/>
                <circle cx="12" cy="11" r="4" fill="${dotColor}"/>
                <text x="22" y="15" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="11" font-weight="600" fill="${pColor}">${safeText}</text>
            </g>`;
            currentX += width + 10;
            badgesHtml += b;
            badgeIndex++;
        };

        if (r.language) addInternalBadge('Lang', r.language, '#f1e05a');
        addInternalBadge('Stars', r.stargazers_count, '#e3b341');
        if (r.forks_count > 0) addInternalBadge('Forks', r.forks_count, '#238636');

        externalBadges.forEach(b => {
            if (currentX + b.width > maxLineWidth) { currentX = 24; currentY += 28; }
            const animStyle = isAnimated ? `style="opacity: 0; animation: slideUp 0.6s ease-out forwards; animation-delay: ${0.4 + (badgeIndex * 0.1)}s;"` : '';
            badgesHtml += `<g transform="translate(${currentX}, ${currentY})" ${animStyle}>${b.svg}</g>`;
            currentX += b.width + 10;
            badgeIndex++;
        });

        let finalHeight = h ? parseInt(h) : (currentY + 35);
        if (!h && (img || qr) && finalHeight < 150) finalHeight = 150;

        let imagesHtml = '';
        if (imgBase64) {
            const imgAnim = isAnimated ? `style="opacity: 0; animation: fadeIn 1s ease-out forwards; animation-delay: 0.2s;"` : '';
            imagesHtml += `<g ${imgAnim}><image href="${imgBase64}" x="${cardWidth - 90}" y="20" width="70" height="70" preserveAspectRatio="xMidYMid meet"/></g>`;
        }
        if (qrBase64) {
            const qrAnim = isAnimated ? `style="opacity: 0; animation: fadeIn 1s ease-out forwards; animation-delay: 0.5s;"` : '';
            imagesHtml += `<g ${qrAnim}><image href="${qrBase64}" x="${cardWidth - 90}" y="${finalHeight - 90}" width="70" height="70" preserveAspectRatio="xMidYMid meet"/></g>`;
        }

        // YENİ: CSS Animasyon Sınıfları (Keyframes)
        const animationCss = isAnimated ? `
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes expandWidth {
                from { width: 0; opacity: 0; }
                to { width: ${cardWidth}px; opacity: 0.8; }
            }
            .anim-title { opacity: 0; animation: slideUp 0.6s ease-out forwards; animation-delay: 0.1s; }
            .anim-desc { opacity: 0; animation: slideUp 0.6s ease-out forwards; animation-delay: 0.2s; }
            .anim-line { animation: expandWidth 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        ` : '';

        const titleClass = isAnimated ? "title anim-title" : "title";
        const descClass = isAnimated ? "desc anim-desc" : "desc";
        const lineClass = isAnimated ? "anim-line" : "";
        const lineStyles = isAnimated ? `width="0"` : `width="${cardWidth}"`;

        const svg = `
        <svg width="${cardWidth}" height="${finalHeight}" viewBox="0 0 ${cardWidth} ${finalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
                .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 700; font-size: 20px; fill: ${tColor}; }
                .desc { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-weight: 400; font-size: 13px; fill: ${pColor}; }
                ${animationCss}
            </style>
            
            <rect x="0.5" y="0.5" width="${cardWidth - 1}" height="${finalHeight - 1}" rx="12" fill="${cardBg}" stroke="${borderColor}"/>
            
            <path class="${lineClass}" d="M0 12C0 5.37258 5.37258 0 12 0H${cardWidth}C${cardWidth - 6.627} 0 ${cardWidth} 5.37258 ${cardWidth} 12V16H0V12Z" fill="${tColor}" opacity="0.8"/>

            <text x="24" y="50" class="${titleClass}">${safeName}</text>
            <text x="24" y="80" class="${descClass}">${safeDesc}</text>
            
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