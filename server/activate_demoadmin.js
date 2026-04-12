const pool = require('./db/pool');

async function fix() {
    // 1. Activate User
    await pool.query("UPDATE users SET is_active = true WHERE email = 'demoadmin@zentrix.com'");
    
    // 2. Activate Tenant and Enable all premium features
    const settings = {
        features: {
            whatsapp: true,
            marketing: true,
            voice_telemetry: true,
            custom_reports: true,
            automations: true,
            ai_scoring: true
        },
        telephony_secret: ' Zentrix@2026'
    };
    
    await pool.query("UPDATE tenants SET is_active = true, settings = $1 WHERE id = '6f023c0a-a505-4ae4-962a-038a944d500e'", [settings]);
    
    console.log('demoadmin active and premium features enabled for Maya Infratech');
    await pool.end();
}
fix();
