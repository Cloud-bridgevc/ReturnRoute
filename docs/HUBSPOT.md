# HubSpot CRM plan

This plan covers how ReturnRoute uses HubSpot for retailers, fulfilment providers (3PLs), sales opportunities and onboarding. **Nothing in the current build connects to HubSpot.** The demo form validates input and returns the CRM fields it *would* set.

## Objects and custom properties

| Object | Use | Key custom properties |
|---|---|---|
| **Company** | One per retailer, 3PL or marketplace | `rr_segment` (Retailer / Fulfilment provider / Marketplace), `rr_monthly_returns` (band), `rr_categories` (multi-select), `rr_wms_platform`, `rr_sites_count`, `rr_org_id` (ReturnRoute `organisations.id`, once a customer) |
| **Contact** | Buyers, ops leads, IT | `rr_role` (Returns ops / Warehouse / IT / Finance / Exec), `rr_demo_interest` |
| **Deal** | New business and expansion | `rr_plan` (Starter / Growth / Enterprise), `rr_est_monthly_returns`, `rr_est_recovery_uplift_gbp`, `rr_pilot_site`, `rr_integration_scope` |
| **Ticket** | Onboarding and support | `rr_onboarding_phase`, `rr_blocker_type` |
| **Custom object: 3PL Client** (Enterprise) | A 3PL's own retailer clients, each with its own rule set | `rr_client_rules_version`, `rr_client_go_live` |

Associations: Company ↔ Contacts, Company ↔ Deals, a 3PL Company ↔ its 3PL Client records, Deal ↔ onboarding Tickets.

## Pipelines

**New Business (Deals)**

| Stage | Entry criteria | Automation |
|---|---|---|
| Demo requested | Website form submitted | Create Contact and Company, set the segment, assign the owner by round robin within the segment |
| Discovery | First call held | Task: collect returns volume, categories, WMS and current disposition rules |
| Returns analysis | Sample SKU and returns data received | Task for solutions: model the recovery uplift and fill in `rr_est_recovery_uplift_gbp` |
| Pilot | One site live on fictional or anonymised data | Create an onboarding Ticket in the *Pilot* phase |
| Proposal | Pilot review complete | Quote built from the plan and volume |
| Closed won / lost | — | Won: create the Onboarding pipeline Ticket and send `rr_org_id` back. Lost: capture the reason and start a 6-month nurture |

**Onboarding (Tickets)**: Kick-off → Rules workshop → Integration (WMS/OMS) → User training → Parallel run → Go-live → 30-day review.

## Workflows

1. **Demo request routing.** Trigger: form submission.
   - Set `rr_segment` from the company type.
   - Above 10k returns a month, set lead status to *Sales qualified* and notify the segment owner in Slack.
   - Below that, enrol the contact in the education nurture.
2. **Retailer track.** Segment = Retailer. Sequence: the recovery value case study, then the routing demo video, then an ROI calculator.
3. **Fulfilment provider track.** Segment = Fulfilment provider. Content on per-client rules and client reporting. The Deal is created with `rr_plan = Enterprise` as its default.
4. **Stalled deal alert.** The Deal has sat in *Returns analysis* for more than 14 days. Create a task for the owner and escalate to the sales lead.
5. **Onboarding handoff.** Closed won creates the onboarding Ticket, assigns the CSM, schedules the kick-off and sends a welcome email.
6. **Product-qualified expansion** (after go-live). ReturnRoute sends usage events via the HubSpot API: monthly returns processed and recovery value. When volume exceeds 80% of the plan limit for 2 consecutive months, an expansion Deal is created.
7. **Health score.** A weekly sync of AI/inspector agreement, average approval dwell time and open support Tickets produces `rr_health_score`. A score below the threshold creates a CSM task.

## Integration design

- **Inbound:** the website form posts to `/api/demo-request`, which validates the fields with zod. In production it then calls the HubSpot Forms Submission API using the portal ID and form GUID, so HubSpot's consent and attribution tracking still applies.
- **Outbound usage sync:** a nightly Lambda reads `v_recovery_by_route` and the returns counts for each organisation. It updates Company properties through a HubSpot private-app token stored in Secrets Manager. Only aggregates are sent: no customer-level or return-level data leaves ReturnRoute.
- **Identity mapping:** `organisations.hubspot_company_id` ↔ the `rr_org_id` Company property.
- **Consent:** GDPR consent checkboxes sit on the form, and marketing emails go only to contacts with legitimate interest or consent recorded in HubSpot.

## Reporting dashboards in HubSpot

- Pipeline by segment: Retailer vs Fulfilment provider vs Marketplace.
- Demo → Pilot → Won conversion by monthly returns band.
- Time in each onboarding phase.
- Expansion pipeline from product-qualified signals.
