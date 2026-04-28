import { readFileSync } from 'fs';
const c = readFileSync('src/pages/Academy.jsx', 'utf8');
let depth = 0;
let inStr = false;
let strChar = '';
let esc = false;
const lines = c.split('\n');

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (!inStr) {
            if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
            else if (ch === '{') { depth++; }
            else if (ch === '}') { depth--; if (depth < 0) { console.log(`EXTRA } at line ${lineIdx + 1}`); process.exit(1); } }
        } else {
            if (ch === strChar) { inStr = false; }
        }
    }
    if (strChar !== '`') { inStr = false; }
}

console.log('Final brace depth:', depth);
if (depth === 0) console.log('BRACES BALANCED - OK');
else console.log('UNBALANCED - missing', depth, 'closing brace(s)');
