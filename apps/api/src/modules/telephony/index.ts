/**
 * Telephony Domain Slice Router Aggregator
 */

import express from 'express';
import inboundRoutes from './inbound/InboundRoutes';
import accountsRoutes from './accounts/AccountsRoutes';
import outboundRoutes from './outbound/OutboundRoutes';
import recordingsRoutes from './recordings/RecordingsRoutes';
import campaignsRoutes from './campaigns/CampaignsRoutes';
import sipRoutes from './sip/SipRoutes';
import webhookRoutes from './webhook/WebhookRoutes';

const telephonyRouter = express.Router();

telephonyRouter.use('/inbound', inboundRoutes);
telephonyRouter.use('/accounts', accountsRoutes);
telephonyRouter.use('/outbound', outboundRoutes);
telephonyRouter.use('/recordings', recordingsRoutes);
telephonyRouter.use('/campaigns', campaignsRoutes);
telephonyRouter.use('/sip', sipRoutes);
telephonyRouter.use('/webhook', webhookRoutes);

export default telephonyRouter;
