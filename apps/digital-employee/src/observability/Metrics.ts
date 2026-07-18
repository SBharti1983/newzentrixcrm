interface MetricData {
    callsInbound: number;
    callsOutbound: number;
    whatsappMsgs: number;
    escalations: number;
    leadsQualified: number;
    siteVisitsBooked: number;
    totalCallDurationSec: number;
    totalCallCount: number;
    totalResponseLatencyMs: number;
    totalResponseCount: number;
}

export class Metrics {
    private static data: MetricData = {
        callsInbound: 0,
        callsOutbound: 0,
        whatsappMsgs: 0,
        escalations: 0,
        leadsQualified: 0,
        siteVisitsBooked: 0,
        totalCallDurationSec: 0,
        totalCallCount: 0,
        totalResponseLatencyMs: 0,
        totalResponseCount: 0
    };

    static incrementCallsInbound() {
        this.data.callsInbound++;
    }

    static incrementCallsOutbound() {
        this.data.callsOutbound++;
    }

    static incrementWhatsappMsgs() {
        this.data.whatsappMsgs++;
    }

    static incrementEscalations() {
        this.data.escalations++;
    }

    static incrementLeadsQualified() {
        this.data.leadsQualified++;
    }

    static incrementSiteVisitsBooked() {
        this.data.siteVisitsBooked++;
    }

    static recordCallDuration(durationSec: number) {
        this.data.totalCallDurationSec += durationSec;
        this.data.totalCallCount++;
    }

    static recordResponseLatency(latencyMs: number) {
        this.data.totalResponseLatencyMs += latencyMs;
        this.data.totalResponseCount++;
    }

    static getMetricsSummary() {
        const avgCallDuration = this.data.totalCallCount > 0 
            ? this.data.totalCallDurationSec / this.data.totalCallCount 
            : 0;
        const avgResponseLatency = this.data.totalResponseCount > 0 
            ? this.data.totalResponseLatencyMs / this.data.totalResponseCount 
            : 0;

        return {
            calls_inbound: this.data.callsInbound,
            calls_outbound: this.data.callsOutbound,
            whatsapp_msgs: this.data.whatsappMsgs,
            escalations: this.data.escalations,
            leads_qualified: this.data.leadsQualified,
            site_visits_booked: this.data.siteVisitsBooked,
            avg_call_duration_sec: Math.round(avgCallDuration * 100) / 100,
            avg_response_latency_ms: Math.round(avgResponseLatency * 100) / 100
        };
    }

    static reset() {
        this.data = {
            callsInbound: 0,
            callsOutbound: 0,
            whatsappMsgs: 0,
            escalations: 0,
            leadsQualified: 0,
            siteVisitsBooked: 0,
            totalCallDurationSec: 0,
            totalCallCount: 0,
            totalResponseLatencyMs: 0,
            totalResponseCount: 0
        };
    }
}
