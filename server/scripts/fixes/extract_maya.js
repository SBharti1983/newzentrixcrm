const https = require('https');

const options = {
  hostname: 'mayainfratech.in',
  port: 443,
  path: '/',
  method: 'GET',
  rejectUnauthorized: false, // Bypass SSL validation
  headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive'
  }
};

const req = https.request(options, (res) => {
    let data = '';
    
    // Check for redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log("Redirected to:", res.headers.location);
    }
    
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Find src attributes using a more flexible regex
        const matches = [...data.matchAll(/src="([^"]+)"/ig)];
        let logoUrl = null;
        for(let m of matches) {
            let url = m[1].toLowerCase();
            if(url.includes('logo') || url.includes('header')) {
                // If it looks like an image
                if (url.match(/\.(png|jpg|jpeg|svg|webp)/)) {
                    logoUrl = m[1];
                    break;
                }
            }
        }
        
        // try looking for img tag with logo in class or alt
        if(!logoUrl) {
            const imgMatches = [...data.matchAll(/<img[^>]+>/ig)];
            for(let m of imgMatches) {
                let img = m[0].toLowerCase();
                if(img.includes('logo')) {
                    const srcMatch = img.match(/src="([^"]+)"/i);
                    if(srcMatch) {
                        logoUrl = srcMatch[1];
                        break;
                    }
                }
            }
        }

        if(logoUrl && !logoUrl.startsWith('http')) {
            if(logoUrl.startsWith('/')) {
                logoUrl = 'https://mayainfratech.in' + logoUrl;
            } else {
                logoUrl = 'https://mayainfratech.in/' + logoUrl;
            }
        }
        
        let descMatch = data.match(/<meta[^>]+name="description"[^>]+content="([^">]+)"/i);
        if (!descMatch) {
            descMatch = data.match(/<meta[^>]+property="og:description"[^>]+content="([^">]+)"/i);
        }
        const description = descMatch ? descMatch[1] : null;
        
        const colors = data.match(/#[0-9a-fA-F]{6}/g) || [];
        const colorCounts = {};
        let primaryColor = '#1e3a73'; // fallback
        if (colors.length > 0) {
            colors.forEach(c => {
                const lower = c.toLowerCase();
                colorCounts[lower] = (colorCounts[lower] || 0) + 1;
            });
            delete colorCounts['#ffffff'];
            delete colorCounts['#000000'];
            delete colorCounts['#fff'];
            delete colorCounts['#000'];
            let max = 0;
            for(const [c, count] of Object.entries(colorCounts)) {
                if(count > max) {
                    max = count;
                    primaryColor = c;
                }
            }
        }

        console.log(JSON.stringify({
            status: res.statusCode,
            contentLength: data.length,
            logoUrl,
            description: description || 'Maya Infratech is a premier real estate development company.',
            primaryColor
        }, null, 2));
    });
});

req.on('error', err => {
    console.log("Error:", err.message);
});

req.end();
