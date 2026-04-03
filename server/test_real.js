const pool = require('./db/pool');
const fs = require('fs');
async function run() {
  try {
    const res = await pool.query(\SELECT
        COUNT(*) FILTER (WHERE stage = 'Nurture' OR stage = 'Nurturing') as total_nurture,
        (
            SELECT COUNT(*)
            FROM activity_log
            WHERE tenant_id = \\'7e9fed76-474f-49cc-a82c-5b50cea329ce\\'
              AND entity_type = \\'lead\\'
              AND action = \\'updated\\'
              AND (old_data->>\\'stage\\' ILIKE \\'Nurture%\\')
              AND (new_data->>\\'stage\\' NOT ILIKE \\'Nurture%\\' OR new_data->>\\'stage\\' IS NULL)
              AND created_at >= date_trunc(\\'month\\', NOW())
        ) as reactivated_this_month
    FROM leads\);
    fs.writeFileSync('real_out.txt', JSON.stringify(res.rows));
  } catch(e) {
    fs.writeFileSync('real_out.txt', e.toString());
  }
  process.exit(0);
}
run();
