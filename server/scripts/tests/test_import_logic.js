const pool = require('./db/pool');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function testImport() {
    const testFile = path.join(__dirname, 'test_import.xlsx');
    const data = [
        ['Name', 'Phone', 'Email', 'City', 'Source', 'Stage'],
        ['Import Test User', '1234567890', 'import@test.com', 'Noida', 'Excel', 'New']
    ];
    
    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leads');
    xlsx.writeFile(wb, testFile);
    
    console.log('Created test Excel file.');

    try {
        const { rows: [tenant] } = await pool.query('SELECT id, max_leads FROM tenants LIMIT 1');
        const tenantId = tenant.id;

        const workbook = xlsx.readFile(testFile);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        console.log(`Processing ${rows.length} rows for tenant ${tenantId}...`);

        for (const row of rows) {
            const name = row['Name'];
            const phone = String(row['Phone']);
            
            // Clean up old test data
            await pool.query('DELETE FROM leads WHERE tenant_id=$1 AND phone=$2', [tenantId, phone]);

            await pool.query(
                `INSERT INTO leads (tenant_id, name, phone, email, city, source, stage, priority, score, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Medium', 50, 'Active', NOW())`,
                [tenantId, name, phone, row['Email'], row['City'], row['Source'], row['Stage']]
            );
            console.log(`Imported: ${name}`);
        }
        
        console.log('Import logic test SUCCESS');
    } catch (err) {
        console.error('Import test FAILED:', err);
    } finally {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
        pool.end();
    }
}

testImport();
