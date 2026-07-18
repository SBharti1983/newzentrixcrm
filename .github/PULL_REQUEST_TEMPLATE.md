## 📝 Description
Provide a clear description of the changes introduced by this pull request.

## 🏗️ Architectural Impact
Please confirm if this PR aligns with the **ZentrixCRM Architectural Rules**:
- [ ] **Layered Dependencies:** Does this respect `Apps -> Packages -> Core -> Nothing` importing flows?
- [ ] **Vertical Slices:** Are changes self-contained within modules under `apps/api/src/modules/`?
- [ ] **No background schedulers in API:** Scheduled intervals offloaded to `apps/worker`?
- [ ] **Telemetry:** Winston log lines correlate with OTel trace context if applicable?

## 🧪 Verification Plan
Describe how these changes were tested:
- [ ] Staged Unit test script executed successfully?
- [ ] Turborepo workspace compilation build succeeds (`npm run build`)?

## 📸 Screenshots / Recordings (if applicable)
Add visual recordings or screenshots for UI modifications.
