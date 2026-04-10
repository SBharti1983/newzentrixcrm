/**
 * END-TO-END TEST: Device-Local Recording → CRM Upload → Gemini Transcription
 * 
 * This simulates what the Android SyncWorker does in Phase 1 (file upload mode):
 * 1. Login to get a JWT token
 * 2. Find a lead with a phone number
 * 3. Create an interaction record for the call
 * 4. Upload a test audio file to /api/telephony/upload-recording
 * 5. Verify the transcript appears in the database
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API = 'http://localhost:5050/api';

async function test() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ZENTRIX CRM — Inline Transcription Pipeline Test');
    console.log('═══════════════════════════════════════════════════\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginRes = await axios.post(`${API}/auth/login`, {
        email: 'demoadmin@zentrix.com',
        password: 'Test@1234'
    });
    const token = loginRes.data.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('  ✅ Logged in as demoadmin\n');

    // Step 2: Find a lead
    console.log('Step 2: Finding a lead...');
    const leadsRes = await axios.get(`${API}/leads?limit=1`, { headers });
    const lead = leadsRes.data.data[0];
    console.log(`  ✅ Lead: ${lead.name} (${lead.phone})\n`);

    // Step 3: Create a test audio file (a simple WAV with silence)
    // In real flow, this would be the .mp4 from CallRecorder
    console.log('Step 3: Creating test audio...');
    const testAudioPath = path.join(__dirname, 'test_call_recording.wav');
    
    // Generate a minimal valid WAV file (8kHz, mono, 2 seconds of silence)
    const sampleRate = 8000;
    const duration = 2;
    const numSamples = sampleRate * duration;
    const dataSize = numSamples * 2; // 16-bit samples
    const headerSize = 44;
    const totalSize = headerSize + dataSize;
    
    const wavBuffer = Buffer.alloc(totalSize);
    // RIFF header
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(totalSize - 8, 4);
    wavBuffer.write('WAVE', 8);
    // fmt chunk
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16); // chunk size
    wavBuffer.writeUInt16LE(1, 20);  // PCM
    wavBuffer.writeUInt16LE(1, 22);  // mono
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    wavBuffer.writeUInt16LE(2, 32);  // block align
    wavBuffer.writeUInt16LE(16, 34); // bits per sample
    // data chunk
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(dataSize, 40);
    // audio data (silence = zeros, already filled by Buffer.alloc)
    
    fs.writeFileSync(testAudioPath, wavBuffer);
    console.log(`  ✅ Test WAV created: ${totalSize} bytes\n`);

    // Step 4: Upload to CRM (simulating Android SyncWorker)
    console.log('Step 4: Uploading recording to CRM backend...');
    console.log('  (This simulates Android SyncWorker → POST /upload-recording)\n');
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(testAudioPath), {
        filename: 'CALL_6202077242_20260410_001500.wav',
        contentType: 'audio/wav'
    });
    form.append('phoneNumber', lead.phone || '6202077242');
    form.append('leadId', lead.id);
    form.append('disposition', 'Connected');
    form.append('timestamp', String(Date.now()));

    try {
        const uploadRes = await axios.post(`${API}/telephony/upload-recording`, form, {
            headers: {
                ...headers,
                ...form.getHeaders()
            },
            timeout: 120000 // 2 min for AI processing
        });

        console.log('  ✅ Upload Response:');
        console.log(`     Success: ${uploadRes.data.success}`);
        console.log(`     Sentiment: ${uploadRes.data.sentiment}`);
        console.log(`     Recording URL: ${uploadRes.data.recordingUrl || 'None (Firebase disabled)'}`);
        console.log(`     Interaction ID: ${uploadRes.data.interactionId || 'N/A'}`);
        
        if (uploadRes.data.transcript && uploadRes.data.transcript.length > 0) {
            console.log(`     Transcript lines: ${uploadRes.data.transcript.length}`);
            uploadRes.data.transcript.slice(0, 3).forEach(t => {
                console.log(`       [${t.speaker}] ${t.text.substring(0, 80)}...`);
            });
        } else {
            console.log('     Transcript: Empty (silent audio — expected for test file)');
        }
    } catch (uploadErr) {
        console.error('  ❌ Upload failed:', uploadErr.response?.data || uploadErr.message);
    }

    // Step 5: Verify on the lead timeline
    console.log('\nStep 5: Verifying lead timeline...');
    const leadDetail = await axios.get(`${API}/leads/${lead.id}`, { headers });
    const interactions = leadDetail.data.interactions || [];
    const latestCall = interactions.find(i => i.type === 'Call');
    
    if (latestCall) {
        console.log(`  ✅ Latest Call Interaction found:`);
        console.log(`     ID: ${latestCall.id}`);
        console.log(`     Recording URL: ${latestCall.recording_url || 'None'}`);
        console.log(`     Transcript: ${latestCall.transcript ? latestCall.transcript.substring(0, 100) + '...' : 'Empty'}`);
        console.log(`     Sentiment: ${latestCall.sentiment || 'N/A'}`);
        
        // Step 6: Test .txt download
        console.log('\nStep 6: Testing transcript .txt download...');
        try {
            const txtRes = await axios.get(`${API}/telephony/transcript/${latestCall.id}`, {
                headers,
                responseType: 'text'
            });
            console.log(`  ✅ Download works! (${txtRes.data.length} bytes)`);
            console.log(`     Content-Disposition: ${txtRes.headers['content-disposition']}`);
        } catch (dlErr) {
            console.error('  ❌ Download failed:', dlErr.response?.data || dlErr.message);
        }
    } else {
        console.log('  ⚠ No Call interactions found on this lead');
    }

    // Cleanup
    if (fs.existsSync(testAudioPath)) fs.unlinkSync(testAudioPath);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════');
}

test().catch(e => {
    console.error('\n❌ TEST FAILED:', e.response?.data || e.message);
    process.exit(1);
});
