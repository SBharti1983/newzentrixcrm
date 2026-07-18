/**
 * Call Recordings Controller and Routes
 */

import express from 'express';
import { logger } from '@zentrix/logger';

const router = express.Router();

/**
 * GET /api/v1/telephony/recordings
 * Fetch log of call audio recordings
 */
router.get('/', (req, res) => {
    logger.info('[Telephony Recordings] Listing audio recordings');
    res.json({
        success: true,
        recordings: [
            {
                id: 'rec-1',
                callId: 'call-1',
                durationSeconds: 120,
                recordingUrl: 'https://storage.zentrix.in/records/rec-1.wav',
                createdAt: new Date().toISOString()
            }
        ]
    });
});

export default router;
