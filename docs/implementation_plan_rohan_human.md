# Implementation Plan — Rohan Human-Mimicry Enhancements (WhatsApp, CRM Automations & Reflection Loop)

To make the AI Rohan Sales Agent mimic a real-world human employee exactly, this plan outlines the implementation of the three remaining architectural layers:
1. **WhatsApp Chatbot Brain (`/rohan/chat` endpoint)**: A state-of-the-art text messaging engine in `apps/digital-employee` leveraging full pgvector memory context and reasoning chain-of-thought (CoT).
2. **Autonomous CRM Automation Triggers (`automationEngine.ts`)**: Triggers immediate CRM pipeline shifts, task schedulers, and follow-ups based on the conversation's Track B output.
3. **Offline Post-Call Reflection Loop (`reflectionJob.ts`)**: A background cron/worker job that analyzes call metrics and reasons step-by-step to optimize response guidelines and agent behavior.

---

## 🏗️ Technical Approach

### 1. WhatsApp Chatbot Brain (`/rohan/chat`)
- **Path:** [NEW] `apps/digital-employee/src/services/RohanChatbotService.ts`
- **Path:** [MODIFY] `apps/digital-employee/src/rohanBridge.ts`
- **Logic:**
  - Create a new POST endpoint `/rohan/chat` inside the Rohan Bridge.
  - On incoming WhatsApp message:
    1. Retrieve the short-term Redis buffer and long-term pgvector memories.
    2. Invoke Rohan's Two-Track Cognitive Loop: Track A compiles a natural Hinglish response, Track B extracts metadata (intents, budget, timeline, sentiment).
    3. Update the CRM database state dynamically based on the reasoning output.
    4. Persist the new conversation turn back to the pgvector database.

### 2. Autonomous CRM Automation Engine
- **Path:** [NEW] `apps/api/src/modules/automation/workflows/RohanAutomationEngine.ts`
- **Logic:**
  - Track B reasoning outputs sometimes flag actions like `schedule_visit`, `send_document`, or `escalate_to_human`.
  - The `RohanAutomationEngine` subscribes to the event bus and maps these flags to automated CRM workflows:
    - If `schedule_visit` ➔ Creates a task event and sends a calendar invite link to the lead.
    - If `send_document` ➔ Automatically compiles the project brochure PDF and triggers a WhatsApp media message.
    - If `escalate_to_human` ➔ Flags `ai_escalation_events` table and alerts the sales team via WebSockets.

### 3. Offline Post-Call Reflection Loop
- **Path:** [NEW] `apps/worker/src/jobs/reflectionJob.ts`
- **Path:** [MODIFY] `apps/worker/src/index.ts`
- **Logic:**
  - Add a background cron task inside the worker process running nightly.
  - The `reflectionJob` queries completed call recordings/transcripts with low sentiment scores (`sentiment < 0.2`) or high latency.
  - Uses a reasoning LLM prompt to run a "self-reflection review":
    - *What went wrong in this call?*
    - *Was the client objecting to the location, price, or developer credibility?*
    - *How should Rohan refine his Hinglish greeting to prevent early drop-off?*
  - Automatically updates the cached persona prompt guidelines in the `ai_employee_personas` database records to enhance the agent's performance dynamically over time.

---

## 📂 Proposed Changes

### [NEW] [RohanChatbotService.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/digital-employee/src/services/RohanChatbotService.ts)
- Implement text message generation and logic for WhatsApp.
- Load context from `RohanMemory` and identity parameters from `RohanPersonaEngine`.

### [MODIFY] [rohanBridge.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/digital-employee/src/rohanBridge.ts)
- Mount the POST `/rohan/chat` endpoint to handle text queries.

### [NEW] [RohanAutomationEngine.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/api/src/modules/automation/workflows/RohanAutomationEngine.ts)
- Event listener that executes structured CRM triggers based on reasoning loops.

### [NEW] [reflectionJob.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/worker/src/jobs/reflectionJob.ts)
- Background worker task conducting LLM reflection analyses on call history logs.

### [MODIFY] [index.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/apps/worker/src/index.ts)
- Register and trigger the `reflectionJob` cron interval task.

---

## 📡 Verification Plan

### Automated Tests
- Create unit test [rohanHuman.test.ts](file:///c:/Users/Sikandar%20Bharti/Desktop/ZentrixCRM/tests/unit/rohanHuman.test.ts) mapping mockup calls to verify text reasoning outputs.
- Run `npm run build` across workspace packages to ensure compilation is 100% successful.

### Manual Verification
1. Simulate a WhatsApp message arrival via HTTP POST `/rohan/chat` and verify the Hinglish response and CRM lead score updates.
2. Trigger a mock price objection and check if the CRM automatically registers an escalation event alert.
3. Force-trigger the reflection loop job and verify that the updated guidelines field in the database was modified successfully.
