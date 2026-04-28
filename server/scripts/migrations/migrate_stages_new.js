const pool = require('./db/pool');
(async () => {
    try {
        await pool.query("UPDATE leads SET stage = 'New Lead' WHERE stage = 'New'");
        await pool.query("UPDATE leads SET stage = 'Connected' WHERE stage = 'Contacted'");
        await pool.query("UPDATE leads SET stage = 'Site Visit Done' WHERE stage = 'Site Visit'");
        await pool.query("UPDATE leads SET stage = 'Lost' WHERE stage = 'Disqualified'");
        console.log('Stages updated');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
