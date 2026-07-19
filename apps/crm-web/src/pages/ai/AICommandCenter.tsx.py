import os

filepath = r"c:\Users\Sikandar Bharti\Desktop\ZentrixCRM\apps\crm-web\src\pages\ai\AICommandCenter.tsx"

with open(filepath, "rb") as f:
    content = f.read().decode("utf-8", errors="ignore")

# Let's normalize all lines to CRLF first or match using dynamic line splits
lines = content.splitlines()

# We look for a line containing "Outbound Wave (Rohan AI)"
target_idx = -1
for i, line in enumerate(lines):
    if "Outbound Wave (Rohan AI)" in line and i < len(lines) - 10:
        target_idx = i
        break

if target_idx != -1:
    print(f"Found target line at index {target_idx}: {lines[target_idx]}")
    # Let's verify if the lines below match the structure
    # L[target_idx] is: <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase" }}>Outbound Wave (Rohan AI)</span>
    # L[target_idx+1]: <div style={{ display: "flex", gap: "2px", alignItems: "center", height: "18px" }}>
    # L[target_idx+2]: {[8, 18, 10, ...
    # L[target_idx+8]: </div>
    # L[target_idx+9]: </div>
    # L[target_idx+10]: {/* Real-time Transcript Stream Box
    
    # We want to replace L[target_idx-2] (which is Outbound Wave comment or parent div) to L[target_idx+9]
    # Let's check L[target_idx-2]:
    print(f"L[target_idx-2]: {lines[target_idx-2]}")
    print(f"L[target_idx+9]: {lines[target_idx+9]}")
    
    # We will replace from L[target_idx-2] to L[target_idx+9] inclusive
    # Let's rebuild the target lines
    old_lines = lines[target_idx-2:target_idx+10]
    for idx, l in enumerate(old_lines):
        print(f"Old[{idx}]: {l}")
        
    # New lines structure
    new_sublines = [
        "                                                         {/* Right channel (Rohan AI) */}",
        "                                                         <div style={{ display: \"flex\", flexDirection: \"column\", gap: \"2px\" }}>",
        "                                                             <span style={{ fontSize: \"0.6rem\", fontWeight: 800, color: \"var(--text-secondary)\", textTransform: \"uppercase\" }}>Outbound Wave (Rohan AI)</span>",
        "                                                             <div style={{ display: \"flex\", gap: \"2px\", alignItems: \"center\", height: \"18px\" }}>",
        "                                                                 {[8, 18, 10, 14, 22, 6, 12, 16, 8].map((h, idx) => (",
        "                                                                     <div key={idx} style={{",
        "                                                                         flex: 1, borderRadius: \"1px\", background: \"#8b5cf6\",",
        "                                                                         animation: `eq-bounce 0.${4 + (idx % 4)}s ease-in-out infinite alternate`,",
        "                                                                         height: `${h * 0.7}px`, opacity: 0.8,",
        "                                                                         transformOrigin: \"bottom\"",
        "                                                                     }} />",
        "                                                                 ))}",
        "                                                             </div>",
        "                                                         </div>",
        "                                                     </div>",
        "",
        "                                                     {/* Audio Gateway Telemetry Stats */}",
        "                                                     <div style={{ display: \"flex\", justifyContent: \"space-between\", background: \"rgba(248,250,252,0.6)\", padding: \"4px 6px\", borderRadius: \"5px\", fontSize: \"0.6rem\", color: \"var(--text-secondary)\" }}>",
        "                                                         <span>📡 WS Jitter: <strong>{listenerJitter}ms</strong></span>",
        "                                                         <span>⚡ Latency: <strong>{listenerLatency}ms</strong></span>",
        "                                                         <span>🚫 Packet Loss: <strong>0.0%</strong></span>",
        "                                                     </div>",
        "                                                 </div>",
        "                                             ) : (",
        "                                                 <span style={{ fontSize: \"0.7rem\", color: \"var(--text-secondary)\", fontStyle: \"italic\", marginTop: \"2px\" }}>",
        "                                                     Duplex audio stream muted. Click Listen In Live to establish supervisor monitoring link.",
        "                                                 </span>",
        "                                             )}"
    ]
    
    # Splice in the new lines
    lines[target_idx-2:target_idx+10] = new_sublines
    
    # Save the file with original line endings (CRLF or LF depending on file)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("Success: Replacement applied successfully!")
else:
    print("Error: Target index not found!")
