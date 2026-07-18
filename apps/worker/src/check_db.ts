import './env';
import { pool } from '@zentrix/database';

(async () => {
    try {
        const { rows } = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ai_employee_personas';
        `);
        console.log('Columns of ai_employee_personas:', rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
})();
