export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { webName, htmlContent } = req.body;

        if (!webName || !htmlContent) {
            return res.status(400).json({ success: false, message: 'Missing webName or htmlContent' });
        }

        const cleanName = webName.toLowerCase().replace(/[^a-z0-9-_]/g, '');
        if (cleanName.length < 3) {
            return res.status(400).json({ success: false, message: 'Nama minimal 3 karakter' });
        }

        // ===== HARCODE TOKEN DI SINI =====
        const VERCEL_TOKEN = "vcp_5zxncIXrWoafpx4S0jiXZiTx7kr7sKUJbgyB2NOckPnvjiNiPR3wd3IO"; // ← GANTI DENGAN TOKEN BARU!

        // ===== HAPUS ATAU KOMENTAR BAGIAN INI =====
        // if (!VERCEL_TOKEN) {
        //     return res.status(500).json({ success: false, message: 'Vercel token not configured' });
        // }

        const headers = {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
        };

        // Cek domain availability
        try {
            const check = await fetch(`https://${cleanName}.vercel.app`);
            if (check.status === 200) {
                return res.status(409).json({ success: false, message: `Nama "${cleanName}" sudah digunakan.` });
            }
        } catch (e) {}

        // Buat project (kalau belum ada)
        await fetch('https://api.vercel.com/v9/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: cleanName,
                framework: null,
                buildCommand: null,
                outputDirectory: null,
                devCommand: null,
                installCommand: null
            })
        }).catch(() => {});

        // Deploy
        const deploy = await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: cleanName,
                project: cleanName,
                target: 'production',
                files: [{
                    file: 'index.html',
                    data: Buffer.from(htmlContent).toString('base64'),
                    encoding: 'base64'
                }],
                projectSettings: {
                    framework: null,
                    buildCommand: null,
                    outputDirectory: null,
                    devCommand: null,
                    installCommand: null
                }
            })
        });

        const result = await deploy.json();

        if (!result || !result.url) {
            console.error('Deploy error:', result);
            return res.status(500).json({
                success: false,
                message: result?.error?.message || 'Deploy failed'
            });
        }

        const url = `https://${cleanName}.vercel.app`;
        const preview = result.url.startsWith('http') ? result.url : `https://${result.url}`;

        return res.status(200).json({
            success: true,
            url: url,
            preview: preview,
            deployId: result.id || 'N/A'
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }
}
