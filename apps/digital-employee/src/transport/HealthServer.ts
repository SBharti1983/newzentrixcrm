import http from 'http';
import { logger } from '@zentrix/logger';
import rohanMemory from '../memory/MemoryService';
import voiceAdapter from '../voice/RohanVoiceAdapter';
import { mountRohanBridge } from '../workflows/bridges/RohanBridge';

export function startHealthServer(port: number, host: string): http.Server {
    const healthServer = http.createServer((req, res) => {
        if (req.url === '/health') {
            const memoryHealth = rohanMemory.getHealthStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'digital-employee-voice',
                pid: process.pid,
                uptime_seconds: Math.floor(process.uptime()),
                active_sessions: voiceAdapter.getActiveSessionCount(),
                memory: memoryHealth,
                latency: voiceAdapter.getAggregateLatency(),
                timestamp: new Date().toISOString(),
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    healthServer.listen(port, host, () => {
        logger.info(`💚  Health check available at http://${host}:${port}/health`);
    });

    // Mount Rohan HTTP Bridge (for CRM API services)
    mountRohanBridge(healthServer);
    logger.info(`🔗  Rohan bridge available at http://${host}:${port}/rohan/*`);

    return healthServer;
}
