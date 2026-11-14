# AI Disclosure & Prompt Audit Log

**Official Deliverable Template | Maintained in GitHub Repository**

**Course:** ITMSD1 – Introduction to Mobile Design and Tools (1st Sem 2026-2027)  
**Participating Classes:** Section C & Section F (Inter-Class Hackathon)

**Team Information:**  
Team ID: **F-17** | Team Name: **TwoFactor**

**Project Details:**  
Project Title: **StudyMate: A Mobile Application for Academic Peer Matching and Collaborative Learning**  
UN SDG Track: **SDG 4: Quality Education**

---

## Instructions for Students

1. Maintain this log continuously throughout all 4 weeks of the hackathon. Place this completed file (or markdown export) in the root of your GitHub repository.
2. Record every instance where your team utilizes Generative AI tools (Gemini, GitHub Copilot, ChatGPT, Claude, Figma AI, v0, etc.) for non-trivial assistance.
3. Transparency is rewarded: AI usage is fully permitted and encouraged, but honest documentation is worth 15% of your final Demo Day grade.
4. Review the completed benchmark examples below before logging your team's entries.

---

## 1. Reference Benchmark Examples

> These examples are supplied by the official course template for reference only. They are **not** Team TwoFactor entries. Team TwoFactor's own entries begin in Section 2.


## 2. Team AI Disclosure Audit Log

Record all team AI interactions below. Add additional rows as needed throughout the 4-week development period. Exact user prompts are reproduced in [Appendix A](#appendix-a-complete-prompt-log); prompt numbers below refer to that appendix.

| # | Date & Milestone | Tool & Version | Member | Prompt & AI Output Summary | Human Edits & Learnings |
|---|------------------|----------------|--------|----------------------------|-------------------------|
| 1 | 2026-10-24<br>Week 1: Ideation & Scope | OpenCode AI coding agent | [Member Name] | **Prompt #1:** Build StudyMate end-to-end with React Native, Expo, TypeScript, Expo Router, and Supabase; no free-text chat; library-only in-person sessions; weighted matching; block/report. **Output:** route map, data model outline, matching rules, guided-chat constraints, and MVP task breakdown. | Narrowed V1 to one university; removed free-text chat; enforced library-only in-person sessions; verified the generated Expo Router structure. **Learning:** converting a broad concept into a testable MVP scope. |
| 2 | 2026-10-25<br>Week 1: Supabase Auth & Environment | OpenCode AI coding agent | [Member Name] | **Prompts #2–#5, #14, #27–#28:** blank home screen, running SQL, "Database error querying schema", failed login, and missing anon key. **Output:** Supabase client/env setup, auth-flow fixes, SQL migration steps, and troubleshooting guidance. | Configured the publishable key, seeded demo users, and restarted Expo after `.env` changes. **Learning:** Supabase auth failures often come from environment/config issues, not the UI. |
| 3 | 2026-10-26<br>Week 2: Data Model, RLS & Realtime | OpenCode AI coding agent | [Member Name] | **Prompt #4 and follow-ups:** replace the local store with Supabase PostgreSQL, RLS, and Realtime. **Output:** migrations, tables, policies, triggers, and realtime subscriptions for messages, sessions, and matches. | Added the `handle_study_decision` trigger, `public_profiles` view, and realtime publication; tested policies as each user role. **Learning:** RLS must be tested as the actual authenticated user, not only from the SQL editor. |
| 4 | 2026-10-27<br>Week 2: Matching & Mutual Consent | OpenCode AI coding agent | [Member Name] | **Prompt #1 and follow-ups:** weighted matching deck and mutual-match rule. **Output:** scoring function, deck filtering, and decision persistence. | Excluded self-matches; filtered blocked/decided users; required both sides to choose Study before creating a match. **Learning:** mutual consent is a data rule, not just a UI state. |
| 5 | 2026-10-28<br>Week 3: Guided Chat & Templates | OpenCode AI coding agent | [Member Name] | **Prompts #1 and #15:** predefined-template chat with no free-text input. **Output:** template keys, message insert flow, optimistic UI, and realtime reconciliation. | Seeded `message_templates`; deduplicated optimistic and realtime rows; surfaced database errors to the user. **Learning:** realtime plus optimistic UI needs explicit reconciliation logic. |
| 6 | 2026-10-29<br>Week 3: Sessions, Safety & Moderation | OpenCode AI coding agent | [Member Name] | **Prompt #1:** session scheduling, University Library safety acknowledgement, and block/report enforcement. **Output:** session proposal/accept flow, safety gate, and report snapshot. | Enforced library-only in-person sessions; made blocking mutual; sent confirmation messages after acceptance. **Learning:** safety requirements must be enforced in both schema and UI. |
| 7 | 2026-10-30<br>Week 3: Peer Feedback & Learning Progress | OpenCode AI coding agent | [Member Name] | **Prompt #16:** implement Peer Feedback (§12) and Learning Progress (§13). **Output:** feedback sheet, progress tracking, and supporting data flow. | Integrated the features with the existing store; kept demo data resettable. **Learning:** new features map cleanly onto existing domain models when the data model is stable. |
| 8 | 2026-10-31<br>Week 3: In-App Notifications | OpenCode AI coding agent | [Member Name] | **Prompt #17:** automatic in-app popup for new matches and updates. **Output:** realtime popup on match insert. | Kept notifications in-app only (no OS push while the app is closed); tested while the app was open. **Learning:** realtime subscriptions only fire while a connection is active. |
| 9 | 2026-11-01<br>Week 4: Figma UI Alignment | OpenCode AI coding agent | [Member Name] | **Prompts #21–#22:** align onboarding and login screens with the provided Figma layout. **Output:** design-token styling and screen layout changes. | Matched spacing, typography, and colors to Figma; preserved cross-platform behavior. **Learning:** translate Figma values into a shared theme instead of hard-coding per screen. |
| 10 | 2026-11-02<br>Week 4: AI Tutor Integration | OpenCode AI coding agent + OpenRouter / Google Gemini | [Member Name] | **Prompts #18, #24–#25:** AI Tutor with generated quizzes, flashcards, and planner; user supplied a Google AI key. **Output:** provider integration, JSON parsing, formatted result UI, and fallback models. | Switched to OpenRouter as primary with free-model fallbacks; rendered readable quiz/flashcard/summary results; removed Apple/Google login (#26). **Learning:** never hard-code secrets; use environment configuration and provider fallbacks. |
| 11 | 2026-11-03<br>Week 4: Guided Reply Suggestions | OpenCode AI coding agent | [Member Name] | **Follow-up work on guided messaging:** make suggested replies context-aware. **Output:** rule-based `suggestReplies` engine using intent, subject, availability, and session status, with 3–5 predefined replies and fallbacks. | Kept replies rule-based (no extra AI call); refreshed suggestions after every interaction; fixed reschedule-intent priority. **Learning:** deterministic rules can cover most conversational context without another AI dependency. |
| 12 | 2026-11-04<br>Week 4: Documentation & Prompt Log | OpenCode AI coding agent | [Member Name] | **Prompts #15 and #29:** keep a running AI disclosure/prompt log. **Output:** the initial prompt list in `AI_DISCLOSURE_LOG.md`. | Consolidated repeated prompts; redacted secrets; noted image attachments. **Learning:** log prompts continuously rather than reconstructing them at the end. |
| 13 | 2026-11-12<br>Week 4: Tutor Upload Button Bug | OpenCode AI coding agent | [Member Name] | **Prompt #31:** after uploading a file, the Generate Quiz / Generate Flashcards / Summarize Note buttons could not be pressed. **Output:** state validation, extraction-status messaging, and corrected button enablement. | Trimmed extracted text before enabling buttons; added clear "text extracted" / "no usable text" status and an explanation under the buttons. **Learning:** a disabled control must explain why it is disabled. |
| 14 | 2026-11-12<br>Week 4: File Extraction | OpenCode AI coding agent | [Member Name] | **Prompts #32–#33:** uploads reported "No readable text" and the app kept telling users to export to `.txt`. **Output:** improved DOCX/PPTX/XLSX/EPUB/PDF extractors with XML normalization, mammoth fallbacks, entity decoding, and best-effort PDF parsing. | Removed the forced `.txt` instruction; accepted short but valid extracted text; surfaced the real failure reason. **Learning:** not every document contains extractable text; scanned images require OCR. |
| 15 | 2026-11-13<br>Week 4: Web File Reading | OpenCode AI coding agent | [Member Name] | **Prompts #34–#36:** DOCX still failed even though the text was selectable. **Output:** diagnostics showed `expo-file-system.readAsStringAsync` is unavailable on web; added cross-platform file readers. | Switched web reads to `fetch(uri)`, `arrayBuffer()`, and `text()`; kept `expo-file-system` on native; added a DOCX debug summary to failures. **Learning:** Expo APIs are platform-specific; verify web support before relying on native modules. |
| 16 | 2026-11-14<br>Week 4: Final Documentation | OpenCode AI coding agent | [Member Name] | **Prompt #37:** convert the disclosure log to the official template and add the new prompts. **Output:** template-aligned markdown with the audit table and complete prompt appendix. | Filled in course/team/project metadata; preserved prompts except for redacted secrets; added prompts #30–#37. **Learning:** the disclosure log is part of the deliverable, not an afterthought. |
| 17 |  |  |  |  |  |
| 18 |  |  |  |  |  |
| 19 |  |  |  |  |  |
| 20 |  |  |  |  |  |

---

## 3. Academic Honesty & Transparency Declaration

We hereby declare that all entries recorded in this AI Disclosure Log represent a truthful, accurate, and comprehensive accounting of the artificial intelligence tools used during this hackathon. All designs, architectures, and code submitted have been verified, understood, and can be fully explained and defended individually by our team members during the Demo Day oral defense.

| Team Member Name | Signature | Date |
|------------------|-----------|------|
| Member 1: Kinlee Dionio | KINLEE DIONIO | 2026-11-10 |
| Member 2: James Abelgas | JAMES ABELGAS | 2026-11-10 |
| Member 3: ________________________ | ________________________ | YYYY-MM-DD |

---

## Appendix A: Complete Prompt Log (formerly `AI_DISCLOSURE_PROMPTS.md`)

> This appendix preserves the team's actual user prompts in chronological order. Repeated prompts are consolidated where noted, image attachments are marked, and secrets (API keys, project URLs) are redacted. Prompt numbers match the references in Section 2.

### Earlier prompts (2026-10-24 to 2026-11-04)

1. "Build and wire **StudyMate** (university peer-to-peer study-matching mobile app) to a working state, connect to Supabase, and get it running on Expo Go/web.
   - Stack: React Native + Expo + TypeScript + Expo Router + Supabase (Auth, PostgreSQL, RLS, Realtime)
   - No free-text chat (predefined templates only), enforced by schema/UI
   - In-person sessions only at University Library with safety acknowledgement
   - Block/report mutual enforcement, matching with weighted scoring
   - V1 limited to one university, no GPS/live location, no AI/groups/payments
   - Must run on physical phone via Expo Go + web"

2. "still the same" *(referring to the blank/home screen issue)*

3. "does it really just loads? the dashboard/home page" *(with attached screenshot of the blank home screen)*

4. "everything is run at sql editor"

5. "still the same" *(after running the SQL)*

6. "give me the expo go"

7. *[Image attached — Bad Gateway error]*

8. "Database error querying schema"

9. "Database error querying schema i cant login"

10. "now it works"

11. "what's next"

12. "continue" *(repeated 5 times)*

13. "why"

14. "I could not Login There is an Error Fetch failed: A server with the specified hostname could not be found" *(followed by a pasted error explanation and a Supabase project URL — redacted)*

15. "could you keep track of the prompts i made for the AI discloser compiled file"

16. "implement Peer Feedback (§12) and Learning Progress (§13) features"

17. "yes i want it to pop up automatically..."

18. "add AI Tutor / AI-generated quizzes / AI flashcards / AI study planner"

19. "Commit the working tree changes..."

20. "continue doing everything that needs to be done..."

21. "what about the onboarding and login ui i think it did not follow the ui i have on figma"

22. "Yes Please do Proceed on Using the figma Layout Design"

23. "Try again"

24. "here is the google api: for the the AI: [REDACTED]"

25. "Try again"

26. "Could you remove the Apple Login and Google Login at the Login Page?"

27. "I could not Login There is an Error Fetch failed: A server with the specified hostname could not be found"

28. "how do i get the anon key?"

29. "i would like to record my prompts and compile it into the AI_DISCLOSURE_PROMPTS.md"

### New prompts added in this update (2026-11-12 to 2026-11-14)

30. "yeah it now works"

31. "I found a problem in Tutor Page ive already uploaded a file but i can't click any of the Button, Generate Quiz, Generate Flashcard, Summarize Note"

32. "PLease fix Everything i uploaded seems to be No readable text was extracted from this file. Try exporting to .txt for best results. Please fix that it don't to export to txt"

33. "still no readable"

34. "Could not extract readable text from this .docx. If it is scanned/image-based, it cannot be read in-app. pleasse fix this Could not extract readable text from this .docx. If it is scanned/image-based, it cannot be read in-app."

35. "yes"

36. "yes yes select/copy the text After reloading/restarting Expo Go with the updated app, does the same .docx still fail with the same message? yes"

37. "Use the AI_Disclosure_Log_Template.docx template as the template for the AI_DISCLOSURE_LOG.md and also update the prompt add the new prompts"

---

## Appendix B: Notes on AI Use

- **Primary development assistant:** OpenCode AI coding agent (used for code generation, debugging, architecture suggestions, and documentation).
- **Runtime AI feature in the app:** OpenRouter with free-model fallbacks, plus Google Gemini as an alternative provider for the AI Tutor.
- **Verification:** Every AI-generated change was reviewed, run locally, and tested against the app's Supabase backend and Expo Go/web targets.
- **Redactions:** API keys and backend project URLs are intentionally omitted from this public repository.
- **Consolidation:** Repeated "continue"/"Try again" prompts are grouped where they refer to the same task.
- **Summarized follow-ups:** Some guided-messaging, realtime-sync, and session-flow follow-ups are summarized in the Section 2 audit table rather than reproduced verbatim because the exact prompt text was not preserved. Prompts #30–#37 are the new prompts added in this update.

*Last updated: 2026-11-14*
