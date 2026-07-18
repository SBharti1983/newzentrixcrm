/**
 * Smoke test: connect to the digital-employee voice WS as Neha (?role=neha)
 * and verify the full pipeline: greeting → audio-in → cognitive loop → response.
 *
 * Run:  node tools/scripts/voice/neha_smoke.cjs
 *
 * Prerequisites:
 *  - digital-employee process running (ws on VOICE_WS_PORT, default 5062 here)
 *  - Neha persona seeded (add_neha_accountant.sql applied)
 *  - Maya Infratech tenant exists (UUID below)
 *
 * Audio contract: 16-bit PCM, 16kHz, mono, little-endian.
 * In passthrough ASR mode (no SARVAM/DEEPGRAM key), audio with RMS energy > 0.01
 * emits a synthetic "[audio detected]" final transcript that drives the loop.
 */
'use strict';

const WebSocket = require('ws');

const WS_URL = process.env.VOICE_WS_URL || 'ws://localhost:5062';
const TENANT_ID = process.env.TENANT_ID || '1bbc00c0-766f-498d-9814-b9fdeb56b24d'; // Maya Infratech
const PERSONA_ID = process.env.PERSONA_ID || '93fc4ca4-a613-421e-90ed-56a8b4c868ac'; // Neha ZEN-AI-002

const url = `${WS_URL}?role=neha&tenant_id=${TENANT_ID}&persona_id=${PERSONA_ID}&language=hinglish&caller_name=Rahul&caller_phone=%2B919999999999`;

const SAMPLE_RATE = 16000;
const DURATION_SEC = 1.5;          // burst of "speech"
const FRAME_BYTES = 320;            // 10ms @ 16kHz 16-bit mono
const ENDPOINTING_MS = 700;        // silence before ASR forces a final

let greetingBytes = 0;
let responseBytes = 0;
let messages = 0;
let firstByteAt = 0;
let connectedAt = 0;
let gotGreeting = false;
let gotResponse = false;
let done = false;

function log(msg) {
    console.log(`[smoke] ${msg}`);
}

// Build a PCM frame with non-trivial energy (a tone) so passthrough ASR fires.
function toneFrame(bytes) {
    const buf = Buffer.alloc(bytes);
    const freq = 440;
    for (let i = 0; i < bytes; i += 2) {
        const t = (i / 2) / SAMPLE_RATE;
        const sample = Math.round(Math.sin(2 * Math.PI * freq * t) * 0.3 * 32767);
        buf.writeInt16LE(sample, i);
    }
    return buf;
}

function silenceFrame(bytes) {
    return Buffer.alloc(bytes);
}

function finish(code) {
    if (done) return;
    done = true;
    console.log('\n=== Neha smoke test summary ===');
    console.log(`  connected:          ${connectedAt ? 'yes' : 'no'}`);
    console.log(`  greeting received:  ${gotGreeting ? 'yes' : 'no'}  (${greetingBytes} bytes)`);
    console.log(`  response received:  ${gotResponse ? 'yes' : 'no'}  (${responseBytes} bytes)`);
    console.log(`  total ws messages:  ${messages}`);
    if (firstByteAt && connectedAt) {
        console.log(`  first byte latency: ${firstByteAt - connectedAt} ms (greeting)`);
    }
    const pass = gotGreeting && gotResponse;
    console.log(`\n  RESULT: ${pass ? '✅ PASS — Neha greeted and responded' : '❌ FAIL'}`);
    process.exit(pass ? 0 : 1);
}

log(`Connecting to ${url.replace(/tenant_id=[^&]+/, 'tenant_id=***')}`);
const ws = new WebSocket(url);

ws.on('open', () => {
    connectedAt = Date.now();
    log('WebSocket connected — waiting for Neha greeting audio…');
});

ws.on('message', (data, isBinary) => {
    messages++;
    if (!firstByteAt) firstByteAt = Date.now();

    // Treat any binary frame as audio (TTS output). Text frames would be JSON
    // control messages (e.g. handoff) — log them.
    if (isBinary) {
        if (!gotGreeting) {
            greetingBytes += data.length;
            gotGreeting = true;
            log(`Greeting audio frame: ${data.length} bytes (Neha is speaking)`);

            // After the greeting starts, send a burst of "speech" to drive the
            // cognitive loop, then silence to trigger endpointing.
            setTimeout(() => {
                log('Sending 1.5s PCM burst to trigger ASR → NehaCognitiveLoop…');
                const frames = Math.round((SAMPLE_RATE * DURATION_SEC * 2) / FRAME_BYTES);
                let i = 0;
                const iv = setInterval(() => {
                    ws.send(toneFrame(FRAME_BYTES));
                    i++;
                    if (i >= frames) {
                        clearInterval(iv);
                        // Send a little silence to let endpointing fire a final.
                        const sil = Math.ceil(ENDPOINTING_MS / 10);
                        let s = 0;
                        const siv = setInterval(() => {
                            ws.send(silenceFrame(FRAME_BYTES));
                            s++;
                            if (s >= sil) clearInterval(siv);
                        }, 10);
                    }
                }, 10);
            }, 600);
        } else {
            responseBytes += data.length;
            if (!gotResponse) {
                gotResponse = true;
                log(`Response audio frame: ${data.length} bytes (Neha replied!)`);
            }
        }
    } else {
        log(`Control message: ${data.toString().slice(0, 200)}`);
    }
});

ws.on('error', (err) => {
    log(`WebSocket error: ${err.message}`);
    finish(1);
});

ws.on('close', (code, reason) => {
    log(`WebSocket closed: code=${code} reason=${reason.toString()}`);
    finish(1);
});

// Hard timeout — if nothing happens, fail.
setTimeout(() => {
    if (!done) {
        log('Timeout reached (15s) without full exchange.');
        finish(1);
    }
}, 15000);
