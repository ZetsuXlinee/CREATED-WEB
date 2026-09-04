// api/deploy.js (Vercel Serverless Function)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { webName, htmlContent } = req.body;

        if (!webName || !htmlContent) {
            return res.status(400).json({ success: false, message: 'Missing webName or htmlContent' });
        }

        const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
        if (!VERCEL_TOKEN) {
            return res.status(500).json({ success: false, message: 'Vercel token not configured' });
        }

        const headers = {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
        };

        // Cek domain availability
        try {
            const check = await fetch(`https://${webName}.vercel.app`);
            if (check.status === 200) {
                return res.status(409).json({ success: false, message: `Nama "${webName}" sudah digunakan.` });
            }
        } catch (e) {
            // Domain kosong — lanjut
        }

        // Buat project (kalau belum ada)
        await fetch('https://api.vercel.com/v9/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: webName,
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
                name: webName,
                project: webName,
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

        const url = `https://${webName}.vercel.app`;
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