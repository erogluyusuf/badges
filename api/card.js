const axios = require('axios');

module.exports = async (req, res) => {
    const { username, repo, theme = 'light' } = req.query;
    try {
        const repoRes = await axios.get(`https://api.github.com/repos/${username}/${repo}`);
        const r = repoRes.data;
        const isDark = theme === 'dark';
        const cardBg = isDark ? '#161b22' : '#ffffff';
        const textColor = isDark ? '#f0f6fc' : '#1f2937';
        
        const svg = `
        <svg width="450" height="150" viewBox="0 0 450 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="450" height="150" rx="10" fill="${cardBg}" stroke="#e5e7eb"/>
            <text x="20" y="40" font-family="Arial" font-weight="bold" font-size="20" fill="${textColor}">${r.name}</text>
            <text x="20" y="70" font-family="Arial" font-size="14" fill="${textColor}" opacity="0.7">${r.description || ''}</text>
            <image href="https://img.shields.io/badge/Stars-${r.stargazers_count}-yellow" x="20" y="100" height="20"/>
        </svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(svg);
    } catch (e) { res.status(500).send('Error'); }
};
