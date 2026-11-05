# ReturnRoute

ReturnRoute is an AI-native returns processing and product recovery platform for e-commerce retailers and fulfilment operators. It classifies return reasons and suggests condition grades from inspection notes and images. It then recommends **restock, repair, resale, recycling or further inspection** using configurable business rules, with a value comparison and a rule trace for every recommendation.

> **Demonstration build.** All products, brands, retailers, customers, staff and records are fictional. The warehouse (WMS) integration is simulated. AI outputs are advisory: they never authorise a refund, discard a product or make an inventory adjustment. Every consequential action needs a person and has to pass explicit business rules.

## What's here

| Path | Contents |
|---|---|
| `web/` | Next.js 16 app: public website, interactive routing demo, operations dashboard, Bedrock adapter, Lambda handlers |
| `web/src/lib/engine/` | Recovery recommendation engine and value analysis, plus the simulated AI classifiers |
| `web/src/lambdas/` | Workflow Lambdas: classify reason, assess condition, recommend route, approve route, create warehouse task, presign upload |
| `db/` | PostgreSQL schema (safeguards enforced by constraints and a trigger) and fictional seed data |
| `infra/template.yaml` | AWS SAM template: S3, RDS PostgreSQL, Lambda, EventBridge, HTTP API, KMS |
| `docs/ARCHITECTURE.md` | Architecture, workflow, safeguards and Bedrock usage |
| `docs/HUBSPOT.md` | CRM plan: objects, pipelines, workflows and integration |

## Run the demo

```bash
cd web && npm install && npm run dev
```

Open http://localhost:3000. You'll find:

- **Public site.** Home page with the interactive routing demo, plus `/use-cases`, `/pricing` and `/request-demo`.
- **Dashboard** at `/app`: intake, inspection queue, condition verification, approvals, warehouse tasks, recovery value reports, analytics and business rules.
  - Use the top bar to switch between associate, inspector and supervisor and see the approval rules in action.
  - **Reset** restores the fictional seed data.

**Suggested walkthrough:**
1. Open **RR-24017** (the dented kettle) from the overview banner.
2. Confirm the AI's grade D.
3. Review the *Repair & refurbish* recommendation, its value comparison and its rule trace.
4. Approve it, then complete the warehouse task.

Then try **RR-24021** (headphones with a possible battery swelling). The engine holds them at *Further inspection* even after their grade is verified.

### Live AI via Amazon Bedrock (optional)

```bash
cd web && cp .env.example .env.local   # then set the AWS region and turn on Bedrock
```

With `RETURNROUTE_AI_MODE=bedrock` and AWS credentials that have Bedrock access, the `/api/ai/*` routes call Claude on Bedrock. Without them, the deterministic simulated classifiers are used.

## Deploy the backend (outline)

```bash
cd infra && sam build && sam deploy --guided
psql "$DATABASE_URL" -f ../db/schema.sql
psql "$DATABASE_URL" -f ../db/seed.sql   # fictional data, dev only
```

See `docs/ARCHITECTURE.md` for the required VPC endpoints and the Cognito authoriser. The template passes `cfn-lint`, but it has not been deployed.

## Launch readiness (glow-up)

- Home page (`web/`): problem section with three sourced statistics, what-we-solve, comparison table, AI section, team (founder cards), roadmap and FAQ, with scroll-reveal motion that respects reduced motion. Sections live in `web/src/components/Glow.tsx` (generated markup), styles in `web/src/app/glow.css`, motion in `web/public/glow.js`.
- New routes: `/privacy`, `/terms` (review drafts); new `sitemap.ts` and `robots.ts`; `metadataBase` set to returnroute.site. Footer credits the founders.
- Ship assets: `opengraph-image.png`, `twitter-image.png`, `apple-icon.png`, `public/manifest.webmanifest`, icons, founders JSON-LD.
- Dashboard: fixed a small top-bar overflow on phones.

### Content to confirm before launch
- **Founders:** Ademide Daniel (Founder/CEO, confirmed) and Halima Bello (Co-founder/CTO, still a placeholder) — edit in `web/src/components/Glow.tsx`, the footer in `web/src/components/site/chrome.tsx` and the JSON-LD in `web/src/app/layout.tsx`.
- Contact email `hello@returnroute.site` is a placeholder — create the forward or replace it.
- Statistics (NRF & Happy Returns 2024) — re-check figures and links.
- Privacy notice and terms need operator details and governing law.
