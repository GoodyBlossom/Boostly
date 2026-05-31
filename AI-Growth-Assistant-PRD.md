# Project Requirement Document (PRD)
## Boostly — AI Growth Assistant for SMEs

| Field | Value |
|-------|-------|
| **Product name** | Boostly |
| **Document version** | 1.1 |
| **Status** | MVP Planning (frontend prototype in repo) |
| **Last updated** | May 22, 2026 |
| **Primary market** | Nigeria (SMEs) |
| **Primary platforms (MVP)** | Instagram, WhatsApp |
| **Target users** | Small and local businesses (restaurants, fashion, services) |
| **Frontend** | `index.html`, `app.js` (mobile-first landing + generator shell) |

---

## 1. Product Positioning

### Problem
SMEs know they need social media to drive orders, but they lack time, marketing skills, and budget for agencies or full-time social managers. Content is inconsistent, off-brand, or never posted—and there is no clear link between posts and customer actions (DMs, orders, bookings).

### Solution (one sentence)
An **AI growth assistant** that turns a business’s basics (what they sell, who they serve, tone) into **ready-to-post content**, **promo visuals**, **short promo videos**, and **simple posting guidance** for Instagram and WhatsApp—so owners can attract customers without marketing expertise.

### Positioning statement
> *For local and small businesses who struggle to stay visible on social media, [Product Name] is an AI growth assistant that creates scroll-stopping posts, flyers, and short promo videos with platform-specific guidance—unlike generic design tools or expensive agencies, it is built for non-marketers who need content that drives orders, not vanity metrics.*

### What this is NOT (MVP)
- Not a full marketing automation suite (no multi-channel ad buying, CRM, or email journeys).
- Not an enterprise social listening or analytics platform.
- Not custom-trained AI models in v1.

### Success metrics (MVP)
| Metric | Target (indicative) |
|--------|---------------------|
| Time to first usable post | &lt; 10 minutes from signup |
| Weekly active creators | % of users who generate ≥1 asset/week |
| Content used off-platform | User downloads/shares or copies caption |
| Retention (4-week) | Directional improvement vs. baseline interviews |
| Qualitative | “I posted more” / “I got more DMs or orders” (survey) |

---

## 2. MVP Scope

### In scope (must-have)

| Capability | MVP behavior | Why it matters |
|------------|--------------|----------------|
| **Business profile** | Name, category, location (optional), products/services, price band, brand tone, 2–3 reference photos or logo | Grounds all AI outputs |
| **AI audience targeting (light)** | Suggests 1–2 customer personas + pain points + hooks (text), not ad-platform API targeting | Helps non-experts “who am I talking to?” |
| **Caption + post ideas** | 3–5 post concepts per request; captions with CTA (order, DM, visit) | Core daily value |
| **Promo visual / flyer** | Template-based layouts + AI copy + optional AI background/image edit | Shareable asset without Canva skills |
| **Short promo video** | 15–30s vertical; slideshow or template + text overlays + stock/music (licensed) | Reels/WhatsApp Status demand |
| **Platform guidance** | When to post, format tips, hashtag suggestions (IG), WhatsApp Status/broadcast tips | Reduces “what do I do with this?” |
| **Export & share** | Download image/video; copy caption; optional “open Instagram” deep link (no auto-post required) | Avoids Meta API complexity at launch |
| **Mobile-friendly web app** | Responsive UI; large taps; minimal typing | SME users are phone-first |

### Out of scope (explicitly defer)

| Deferred | Rationale |
|----------|-----------|
| Auto-posting to Instagram/WhatsApp | API approval, compliance, breakage risk |
| Paid ads creation / Meta Ads API | Scope, budget, expertise |
| TikTok, Facebook, LinkedIn | Prove IG + WhatsApp first |
| Full brand kit / DAM | Enterprise complexity |
| Team roles, approvals, agencies | Not SME MVP |
| Custom model training / fine-tuning | Cost and time |
| Influencer marketplace, UGC rights | Legal and ops overhead |
| Deep analytics / attribution | Needs volume and integrations |
| WhatsApp Business API chatbot | Different product surface |
| Multi-language (beyond 1 primary + optional English) | Add after PMF in one locale |

### MVP feature boundaries (simple rule)
**If it does not help a user create and share one piece of content this week, it is out.**

---

## 3. Recommended Tech Stack

Design for **fast launch**, **low ops**, and **swap-friendly APIs** (no lock-in to one LLM vendor).

| Layer | Recommendation | Notes |
|-------|----------------|-------|
| **Frontend** | Next.js (App Router) + Tailwind + shadcn/ui | SSR/SEO for landing; PWA optional later |
| **Mobile** | Responsive web first; native app only after retention proof | Saves 6+ months |
| **Backend** | Next.js API routes or small Node (Fastify) service | Monolith OK for MVP |
| **Auth** | Clerk or Supabase Auth | Phone/email; social login optional |
| **Database** | PostgreSQL (Supabase or Neon) | Profiles, generations, usage limits |
| **File storage** | S3-compatible (Supabase Storage, Cloudflare R2) | Images, rendered videos |
| **Queue / jobs** | Inngest, BullMQ, or Supabase Edge + cron | Video render, webhooks |
| **Payments** | Stripe (subscriptions + usage caps) | Launch when content quality validated |
| **Hosting** | Vercel (web) + serverless workers for heavy jobs | Scale later to dedicated workers |
| **Observability** | Sentry + simple product analytics (PostHog or Plausible) | Errors + funnel |

### Why not build more?
- Avoid Kubernetes, microservices, and event buses until **10k+ MAU** or clear bottlenecks.
- Avoid self-hosted LLMs until unit economics force it.

---

## 4. AI Architecture

### Principle
**Orchestrate existing APIs** (LLM, image, video) with a **thin application layer** that enforces brand context, templates, and guardrails—not custom models.

### High-level flow

```
User Profile + Request
        │
        ▼
┌───────────────────┐
│ Context Builder   │  ← business profile, platform, goal (promo / awareness)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ LLM Orchestrator  │  ← structured prompts → JSON (caption, hooks, hashtags, shot list)
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
 Text        Image         Video pipeline
 outputs     branch        (template + assets)
    │           │             │
    └─────┬─────┴─────────────┘
          ▼
   Asset Store + Preview UI
```

### Component map

| Function | MVP approach | API examples (swap as needed) |
|----------|--------------|----------------------------------|
| **Strategy / personas / captions** | Single LLM with JSON schema output; system prompt includes guardrails (no false claims, local compliance) | OpenAI GPT-4o mini, Anthropic Haiku, Google Gemini Flash |
| **Image / flyer** | Template HTML/CSS or Figma-like layout engine + AI headline/subcopy; optional background gen | OpenAI Images, Flux via Replicate, Ideogram for text-in-image |
| **Image edit** | Logo overlay, crop, brand colors on template | Sharp (server), no AI required for MVP |
| **Short video** | **Template-first**: N scenes (image + text + transition) → ffmpeg render; optional AI voiceover | Remotion or ffmpeg; ElevenLabs TTS optional |
| **Music** | Licensed stock loop (Epidemic Sound API or bundled royalty-free pack) | Avoid copyright risk |
| **Moderation** | LLM safety + blocklist for regulated claims (medical, financial) | OpenAI Moderation API |
| **Caching** | Hash(profile + prompt + template_id) → reuse similar generations | Cuts cost 30–50% |

### Prompt and output contract
- All LLM calls return **structured JSON** (Zod-validated): `{ headline, body, cta, hashtags[], persona_summary, visual_brief }`.
- **Visual brief** feeds image/video pipeline—not free-form prose only.
- Store prompts + outputs for **regeneration** and quality iteration (not for training custom models in MVP).

### Cost control (critical for SME pricing)
| Control | Implementation |
|---------|----------------|
| Per-user generation caps | Free: 5–10 assets/month; paid tiers higher |
| Cheaper models for drafts | Haiku / GPT-4o mini; premium tier for “polish” pass |
| Template video vs. full AI video | Slideshow template = cents; generative video = dollars |
| Async rendering | Video jobs queued; user notified when ready |

---

## 5. User Flow

### Primary journey: “Create this week’s promo”

```
1. Sign up (email / phone)
2. Onboarding wizard (3–5 screens)
   - Business type, what you sell, city/area (optional)
   - Upload logo or 1–3 photos
   - Pick vibe: friendly / premium / bold
   - Choose goal: more orders / more foot traffic / event promo
3. Home → "Create content"
4. Select: Instagram post | WhatsApp Status | Story/Reel
5. AI suggests 3 concepts → user picks one
6. Edit screen: tweak caption, CTA, colors (limited)
7. Generate visual and/or 15–30s video (async if video)
8. Preview → Download / Copy caption
9. Guidance card: "Post Tuesday 6pm, use these 5 hashtags, pin CTA in bio"
10. Optional: "Remind me Thursday" (email/WhatsApp notification — no API post)
```

### Secondary journeys (MVP)
- **Regenerate** one section (caption only, new visual, new video).
- **Content library** — last 20 generations, re-download.
- **Quick promo** — “Weekend special” one-tap template.

### UX principles
- Default choices; never empty canvas.
- Show **preview** before any payment wall.
- Use **business language** (“Get more orders”) not marketing jargon (“CTR optimization”).
- Maximum **3 taps** from home to generating.

---

## 6. Risks and Overengineering Warnings

### Product risks
| Risk | Mitigation |
|------|------------|
| Generic AI slop | Strong profile context + locale/category templates + human-editable fields |
| No measurable ROI | Ask outcome in onboarding; track self-reported wins; case studies |
| Platform policy changes | Export-first; no dependency on posting APIs in MVP |
| Copyright (music/images) | Licensed assets only; terms prohibit copyrighted uploads for AI remix |

### Technical overengineering traps (avoid)
| Trap | Do instead |
|------|------------|
| Instagram Graph API + scheduling | Manual share + copy; add API in V2 if users demand |
| WhatsApp Business API for MVP | Guidance + downloadable assets; Status is manual upload |
| Custom fine-tuned LLM | Prompt + templates + eval set of 50 golden businesses |
| Real-time generative video (Sora-class) | Template slideshow + text animation |
| Multi-tenant RBAC, SSO | Single owner account per business |
| Microservices | Monolith + job queue |
| Built-in Canva clone | 5–10 locked templates per vertical |
| “AI does everything” autonomous agent | Wizard + explicit user picks at each step |

### Budget killers to defer
- Native iOS/Android apps
- 24/7 human content review (use moderation API + report button)
- Multi-region infra (single region until traction)

---

## 7. Suggested Roadmap

### Phase 0 — Validation (2–4 weeks, pre-code)
- 15–20 SME interviews (restaurants, fashion, services).
- Wizard of Oz: manual Canva + ChatGPT; measure willingness to pay.
- Define 3 vertical template packs (food, fashion, services).

### Phase 1 — MVP (8–12 weeks)
| Week block | Deliverable |
|------------|-------------|
| 1–2 | Profile onboarding, LLM captions + personas, 3 IG templates |
| 3–4 | Flyer/image export, content library, copy/download |
| 5–6 | Video template pipeline (ffmpeg/Remotion), async jobs |
| 7–8 | WhatsApp guidance pack, hashtags, posting tips |
| 9–10 | Stripe billing, usage limits, analytics events |
| 11–12 | Beta with 30–50 businesses; fix quality and mobile UX |

**MVP exit criteria:** ≥40% of beta users create 2+ assets in week 2; ≥25% report posting or sharing.

### Phase 2 — V2 (3–6 months post-MVP)
- Scheduling reminders + calendar view.
- More templates per vertical; seasonal packs (Ramadan, Christmas, back-to-school).
- Brand consistency (saved colors/fonts).
- Optional: Instagram Content Publishing API (business accounts only).
- Referral program; simple affiliate for local agencies.
- Second locale/language if initial market is non-English.

### Phase 3 — Scale
- TikTok export format; Facebook Page if data supports.
- WhatsApp Business catalog integration (orders).
- Performance insights (best post time from user logs, not full analytics suite).
- API partnerships (POS, booking systems) only where retention proves need.
- Dedicated render workers; CDN; tiered AI quality.

---

## 8. Monetization Ideas

| Model | MVP fit | Notes |
|-------|---------|-------|
| **Freemium** | High | Free: limited generations/month + watermark optional |
| **Subscription** | Primary | Tiers: Starter / Growth / Pro by assets and video length |
| **Pay-per-pack** | Optional | “Ramadan campaign pack”, “Grand opening” — good for seasonal SMEs |
| **Annual discount** | V2 | Cash flow for small team |
| **White-label for agencies** | Scale | Not MVP; high support load |

### Indicative pricing (adjust per market)
- **Free:** 5 generations/month, captions only or watermarked images.
- **Starter (~$15–25/mo):** 30 assets, basic video, 1 business.
- **Growth (~$40–60/mo):** unlimited captions, 20 videos, priority render.
- **Pro:** multi-location, brand kit — only if validated.

**Rule:** Price on **outputs that drive orders** (posts/week), not on “AI tokens” visible to users.

---

## 9. Competitive Advantage

| Competitor type | Gap you fill |
|-----------------|--------------|
| Canva / Adobe Express | SMEs still need **what to say** and **when to post**; design-first not growth-first |
| ChatGPT alone | No brand memory, templates, video pipeline, or platform playbooks |
| Social agencies | Too expensive; you offer **80% of output at 5% of cost** |
| Generic SMM tools (Buffer, Hootsuite) | Scheduling without **creation**; wrong entry point for non-posters |
| Local agency freelancers | Inconsistent; you offer **always-on** generation |

### Defensible wedges (build early)
1. **Vertical templates** tuned to restaurants/fashion/services (not generic).
2. **Profile memory** — every generation improves from same business context.
3. **WhatsApp + Instagram together** — rare combo focused on emerging markets / local commerce.
4. **Outcome-oriented UX** — “weekend special to fill tables” not “create carousel.”
5. **Quality dataset** — golden prompts per vertical from real beta users (moat over time).

---

## 10. Final Recommendation

### Build this MVP
A **mobile-first web app** where a business completes a **5-minute onboarding**, picks **Instagram or WhatsApp**, receives **3 AI post concepts**, edits lightly, and exports a **flyer image** and/or **15–30s template video** with **copy-paste caption and posting checklist**—no auto-posting, no ads API, no custom models.

### Core team split (minimum)
| Role | Focus |
|------|--------|
| 1 full-stack engineer | Next.js, auth, billing, job queue |
| 1 product/design (can be founder) | Vertical templates, onboarding, copy |
| Founder | SME sales, beta cohort, prompt quality |

### Technical north star
**Template-heavy, API-orchestrated AI** with structured outputs and async video jobs. Measure **content shipped**, not model sophistication.

### Go / no-go before scaling spend
- 30+ beta users with **repeat weekly use**.
- Qualitative proof of **orders or DMs** attributed to content (even anecdotal).
- Unit cost per paid user **&lt; 30%** of ARPU after video included.

### Single sentence for investors and team
> *We are not building marketing automation—we are building the fastest path from “I have a business” to “I have something worth posting that might get me a customer this week.”*

---

## Appendix A — MVP User Stories (summary)

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-01 | business owner | to describe my business in simple steps | AI knows my voice and offer |
| US-02 | business owner | suggested customer types and hooks | I know who I am speaking to |
| US-03 | business owner | 3 post ideas with captions | I do not stare at a blank screen |
| US-04 | business owner | a promo image with my offer | I can share on IG or WhatsApp |
| US-05 | business owner | a short vertical video | I can post a Reel or Status |
| US-06 | business owner | posting tips for my platform | I know when and how to post |
| US-07 | business owner | to download and copy content | I can post without technical setup |

---

## Appendix B — Non-functional requirements

| Requirement | Target |
|-------------|--------|
| Mobile usability | Core flows usable on 360px width |
| Generation latency (text/image) | &lt; 15s p95 |
| Video render | &lt; 3 min p95; async with notification |
| Uptime | 99% (managed hosting) |
| Data privacy | GDPR-ready basics; delete account + assets |
| Accessibility | WCAG 2.1 AA aspirational for V2; readable contrast in MVP |

---

## Appendix C — Open decisions (resolve in discovery)

1. Primary launch geography and language.
2. Watermark on free tier yes/no.
3. Video: voiceover on or off in MVP.
4. Human review for flagged industries (food claims, health services).
5. Product name and domain.

---

*End of PRD v1.0*
