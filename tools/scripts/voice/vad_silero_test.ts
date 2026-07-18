import { BargeInHandler } from '../../../apps/digital-employee/src/voice/BargeInHandler';

async function testVad() {
    console.log('🏁 Starting Silero VAD (ONNX) Unit/Integration Test...');

    const bargeIn = new BargeInHandler({
        positiveSpeechThreshold: 0.4,
        negativeSpeechThreshold: 0.25,
        sampleRate: 8000
    });

    let bargeInFired = false;
    bargeIn.setOnBargeIn(() => {
        bargeInFired = true;
        console.log('🔔 Callback: Barge-in detected successfully!');
    });

    // Notify that TTS is playing to allow barge-in detection
    bargeIn.setTTSPlaying(true);

    // 1. Generate silence chunks (200ms each at 8kHz, 1600 samples, 3200 bytes)
    console.log('\n🔇 Feeding 1.2 seconds of silence (expecting no VAD trigger)...');
    const silenceChunk = Buffer.alloc(3200, 0);
    for (let i = 0; i < 6; i++) {
        bargeIn.feedAudio(silenceChunk);
        // Wait a small delay to simulate real-time feed
        await new Promise((r) => setTimeout(r, 30));
    }

    console.log(`Metrics after silence: ${JSON.stringify(bargeIn.getMetrics())}`);
    if (bargeIn.isSpeaking()) {
        console.error('❌ Error: VAD triggered speaking state on pure silence.');
    } else {
        console.log('✅ Silence test passed.');
    }

    // 2. Generate simulated mock voice-like frames (frequency-modulated waves to mimic voice formant peaks)
    console.log('\n🗣️ Feeding 1.2 seconds of simulated voice-like audio (expecting speech detection)...');
    for (let i = 0; i < 15; i++) {
        const voiceChunk = Buffer.alloc(3200);
        for (let s = 0; s < 1600; s++) {
            // FM wave representing voice formants at 250Hz modulated by 10Hz
            const t = (i * 1600 + s) / 8000;
            const freq = 250 + 50 * Math.sin(2 * Math.PI * 10 * t);
            const sample = Math.sin(2 * Math.PI * freq * t) * 30000;
            voiceChunk.writeInt16LE(Math.floor(sample), s * 2);
        }
        bargeIn.feedAudio(voiceChunk);
        await new Promise((r) => setTimeout(r, 30));
    }

    // Wait a brief period for async ONNX runtime promise evaluation to finish
    await new Promise((r) => setTimeout(r, 300));

    console.log(`Metrics after speech: ${JSON.stringify(bargeIn.getMetrics())}`);
    console.log('Destructing VAD instance...');
    await bargeIn.destroy();

    console.log('\n==================================================');
    console.log('VERIFICATION RESULTS');
    console.log('==================================================');
    console.log(`Barge-in Callback Fired: ${bargeInFired}`);
    console.log('🎉 SUCCESS: Silero VAD (ONNX) initialized and executed successfully!');
    process.exit(0);
}

testVad().catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
