# PROJECT.md — SETU

## 1. Identity
- **Project name:** SETU
- **Tagline:** Offline Crisis Supply Reconciliation & Redistribution
- **One-line pitch:** SETU is an offline crisis supply reconciliation system that resolves conflicting field updates after connectivity loss, establishes what supplies are actually confirmed, and helps responders redirect scarce resources to the locations that need them most.

## 2. Hackathon Context (source: wemakedevs.org/aws/first-commit)
- **Event:** First Commit — Event 1 of the Bharat Builds Tour, by WeMakeDevs × AWS
- **Dates:** Sept 17–20, 2026 (Thu–Sun), hybrid
- **Format:** Online the full four days, anywhere in India. Optional in-person day Sat Sept 19 at Polaris School of Technology, Bangalore (8 AM–8 PM). Everyone finishes together online.
- **Schedule:**
  - Thu Sept 17 — Kickoff. Clock starts, teams form, repos created.
  - Fri Sept 18 — Full build day, AWS mentors on call.
  - Sat Sept 19 — Bangalore venue opens (optional): workshops, project feedback, Amazon team present. Online continues as normal.
  - Sun Sept 20 — Submission deadline. Late submission = zero score, no exceptions.
- **Team:** Building solo (1 of the allowed 1–4 team sizes).
- **Theme:** Fully open. "Build something that solves a real problem: one you deal with yourself, one people around you face every day, a service that could work better, or a clunky way of doing things nobody has bothered to fix yet." Any sector.
- **Tracks:** Nothing chosen at entry — Ship It, Build It, and Best UI are all decided by what the project turns out to be; one submission is considered for all three simultaneously.
  - **Build It:** open-source AWS stack, local machine (Strands, Cedar, SAM Local, PartyRock, OpenSearch). No AWS account needed.
  - **Ship It (our target):** deployed live on AWS with a URL. Free credits cover the weekend. Architecture and cost decisions are part of the score. This is where the grand prize is decided.
  - **Best UI:** open to a project from either track — "the best-designed thing at the event, the one that is a pleasure to use and not only a pleasure to describe." Judged on design and usability.
- **Judging criteria (from site, "What judges look for"):**
  1. **Idea and Impact** — does it solve a real problem, and what changes for the people on the other side of it? A small problem solved well beats a big one solved vaguely.
  2. **Built on AWS** — using an AWS open-source project or AWS services is mandatory to win any prize.
  3. **Learning** — four days should leave you knowing something you didn't before (a first deploy, a first agent, a service you'd never touched). State what you learned; it counts toward score.
  4. **Execution** — does it work? Not perfect, not polished. One feature that runs beats five that almost do.
  5. **Demo video** — 3 minutes, recorded, showing what it does, who it's for, and where AWS fits. No live demo — the video is what judges see.
  - Local and deployed projects are scored with the same care; cloud usage counts only in Ship It.
- **Other rules:** copying someone else's work or passing an old project off as new disqualifies the whole team. Panel decisions are final, scores aren't published or discussed.
- **Prizes (context only, not a build driver):** Ship It 1st ₹2,00,000 + $3,000 AWS credits. Best UI 3rd ₹1,00,000 + $1,000 AWS credits, open to either track. Top 10 students get fast-track Amazon interviews.

## 3. Constraints (binding, do not renegotiate mid-build)
- **Solo build.** No teammate.
- **AWS scope.** The Ship It service set includes Lambda, API Gateway, DynamoDB, S3, Bedrock, Amplify Hosting/App Runner, Cognito, EventBridge, and Step Functions. We will use the services that directly support the demonstrated flow; optional services must never block the working core. This follows the event guidance to remove a service if it cannot be tied to the demo.
- **Real offline layer required.** IndexedDB + Service Worker background sync must be genuinely built and tested (network actually killed in devtools), not simulated with a UI toggle alone. This is an explicit personal learning goal, not just a demo requirement.
- **Rule of one:** one end-to-end capability built completely beats five things half-built. Build a thin vertical slice first, then deepen it. Frontend and backend work may proceed in parallel after their contracts are fixed, but integration is verified before adding more scope.
- **Stack:** Next.js, TypeScript, Tailwind, Framer Motion, shadcn ui,websocket.io, Zod (existing preferred tools), deployed on Amplify.

## 4. Problem Statement (condensed — full original brief is the source of truth)
During disasters, relief operations fragment when connectivity fails. Different actors (camps, warehouses, drivers) keep recording events independently and disagree once reconnected: a warehouse says supply was dispatched, a driver says the route was diverted, a camp says nothing arrived. The problem is not "no data" — it's **multiple disconnected sources returning with different, conflicting versions of reality**. Blindly trusting the newest update risks double-counting undelivered supplies, sending duplicates, or misallocating scarce resources.

SETU answers two questions:
1. What actually happened? (reconciliation)
2. Where should the next scarce supply go? (redistribution)

## 5. Core Differentiation (memorize for judge Q&A)
Existing systems (Sahana Eden, KoboToolbox) already do offline collection, inventory, and logistics coordination. SETU does **not** claim to replace them or claim offline collection itself is novel.

> "We are not building another disaster dashboard. We are building the reconciliation layer between fragmented field realities."

The innovation is specifically what happens **after** synchronization: conflict detection + state reconciliation + scarcity-aware redistribution — not before it.

## 6. What NOT to build
Generic disaster chatbot, generic emergency map, weather prediction, generic truck routing, generic inventory management, donation management, volunteer management, social-media alerts, full GIS, IoT hardware, real emergency integrations, large multilingual platform. Stay narrow.

## 7. AI Design Principle (non-negotiable)
Bedrock is never the source of truth for numbers. All arithmetic (stock levels, shortage windows, redistribution quantities, conflict detection) is deterministic code (Lambda). Bedrock's only job is explaining the deterministic result in plain language — it must echo given figures exactly, never recompute or restate them differently.
