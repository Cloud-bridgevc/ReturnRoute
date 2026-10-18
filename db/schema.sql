-- ReturnRoute PostgreSQL schema (PostgreSQL 16+)
-- Design principle: AI output is stored as *suggestions*. Consequential records
-- (decisions, warehouse tasks, inventory adjustments, refund decisions) can only
-- exist with a named human approver, enforced by NOT NULL foreign keys and checks.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE staff_role       AS ENUM ('associate', 'inspector', 'supervisor');
CREATE TYPE return_stage     AS ENUM ('intake', 'inspection', 'verification', 'approval', 'tasked', 'closed');
CREATE TYPE condition_grade  AS ENUM ('A_NEW', 'B_OPEN_BOX', 'C_USED_GOOD', 'D_DAMAGED_REPAIRABLE', 'E_NOT_REPAIRABLE', 'X_UNCERTAIN');
CREATE TYPE recovery_route   AS ENUM ('RESTOCK', 'REPAIR', 'RESALE', 'RECYCLE', 'FURTHER_INSPECTION');
CREATE TYPE reason_category  AS ENUM ('damaged_in_transit', 'defective', 'wrong_item', 'not_as_described', 'size_fit', 'changed_mind', 'missing_parts', 'late_delivery');
CREATE TYPE ai_source        AS ENUM ('bedrock', 'simulated');
CREATE TYPE task_status      AS ENUM ('queued', 'in_progress', 'done', 'cancelled');
CREATE TYPE refund_decision  AS ENUM ('approved', 'partial', 'declined', 'deferred');

-- ── Tenancy & reference data ───────────────────────────────────────────────
CREATE TABLE organisations (            -- retailer or 3PL client
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('retailer', '3pl', 'marketplace')),
  hubspot_company_id text UNIQUE,       -- CRM link (see docs/HUBSPOT.md)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  name          text NOT NULL,
  wms_system    text,                   -- e.g. 'simulated'
  UNIQUE (organisation_id, name)
);

CREATE TABLE staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  role          staff_role NOT NULL,
  active        boolean NOT NULL DEFAULT true
);

CREATE TABLE products (
  sku           text PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  gtin          text UNIQUE,
  name          text NOT NULL,
  brand         text NOT NULL,
  category      text NOT NULL,
  msrp          numeric(10,2) NOT NULL CHECK (msrp >= 0),
  unit_cost     numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  weight_kg     numeric(6,2) NOT NULL,
  repairable    boolean NOT NULL DEFAULT false,
  avg_repair_cost numeric(10,2) NOT NULL DEFAULT 0,
  contains_battery boolean NOT NULL DEFAULT false
);

-- Inventory is owned by the WMS; this is a read model refreshed from it.
CREATE TABLE inventory_levels (
  sku           text NOT NULL REFERENCES products(sku),
  site_id       uuid NOT NULL REFERENCES sites(id),
  stock_grade   text NOT NULL,          -- 'A', 'B', 'REFURB'
  on_hand       integer NOT NULL DEFAULT 0,
  synced_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, site_id, stock_grade)
);

-- ── Business rules (versioned, immutable once published) ───────────────────
CREATE TABLE recovery_rule_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  version       integer NOT NULL,
  rules         jsonb NOT NULL,         -- shape: RecoveryRules in web/src/lib/domain/types.ts
  published_by  uuid NOT NULL REFERENCES staff(id),
  published_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, version)
);

-- ── Returns ────────────────────────────────────────────────────────────────
CREATE TABLE returns (
  id            text PRIMARY KEY,       -- e.g. RR-24017
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  site_id       uuid NOT NULL REFERENCES sites(id),
  rma           text NOT NULL,
  order_id      text NOT NULL,
  channel       text NOT NULL CHECK (channel IN ('web', 'marketplace', 'store')),
  customer_ref  text NOT NULL,          -- pseudonymous; no PII stored here
  carrier       text,
  scanned_barcode text,
  sku           text REFERENCES products(sku),
  serial        text,
  identified_by uuid REFERENCES staff(id),
  reason_text   text NOT NULL,
  stage         return_stage NOT NULL DEFAULT 'intake',
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  received_at   timestamptz NOT NULL DEFAULT now(),
  realised_value numeric(10,2),
  UNIQUE (organisation_id, rma),
  CHECK (stage = 'intake' OR sku IS NOT NULL)
);
CREATE INDEX returns_stage_idx ON returns (organisation_id, stage, stage_entered_at);

CREATE TABLE reason_classifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     text NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  category      reason_category NOT NULL,
  confidence    numeric(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  signals       text[] NOT NULL DEFAULT '{}',
  source        ai_source NOT NULL,
  model_id      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Inspection ─────────────────────────────────────────────────────────────
CREATE TABLE inspections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     text NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  inspector_id  uuid NOT NULL REFERENCES staff(id),
  notes         text NOT NULL,
  powers_on     boolean,
  accessories_complete boolean,
  packaging_intact boolean,
  battery_safe  boolean,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inspection_media (       -- objects live in S3; we store keys only
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  s3_bucket     text NOT NULL,
  s3_key        text NOT NULL,
  content_type  text NOT NULL,
  label         text,
  sha256        text,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

-- AI suggestion: advisory by construction (no route, no action columns).
CREATE TABLE condition_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  grade         condition_grade NOT NULL,
  confidence    numeric(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  findings      text[] NOT NULL,
  summary       text NOT NULL,
  source        ai_source NOT NULL,
  model_id      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Human verification of condition. Required before any non-quarantine route.
CREATE TABLE condition_verifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  suggestion_id uuid REFERENCES condition_suggestions(id),
  grade         condition_grade NOT NULL,
  verified_by   uuid NOT NULL REFERENCES staff(id),
  note          text,
  verified_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Recommendation → decision → tasks ──────────────────────────────────────
CREATE TABLE recommendations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     text NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  verification_id uuid REFERENCES condition_verifications(id),
  rule_set_id   uuid NOT NULL REFERENCES recovery_rule_sets(id),
  route         recovery_route NOT NULL,
  options       jsonb NOT NULL,         -- per-route value analysis
  rationale     text[] NOT NULL,
  rule_trace    jsonb NOT NULL,
  approval_level staff_role NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Only quarantine can be recommended without a human-verified grade.
  CHECK (route = 'FURTHER_INSPECTION' OR verification_id IS NOT NULL)
);

CREATE TABLE decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id     text NOT NULL UNIQUE REFERENCES returns(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL REFERENCES recommendations(id),
  route         recovery_route NOT NULL,
  decided_by    uuid NOT NULL REFERENCES staff(id),
  decided_role  staff_role NOT NULL,
  overridden    boolean NOT NULL,
  note          text,
  decided_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT overridden OR length(coalesce(note, '')) > 0),
  CHECK (route <> 'RECYCLE' OR decided_role = 'supervisor'),
  CHECK (decided_role <> 'associate')
);

-- Recorded for the retailer's OMS; ReturnRoute never issues payments.
CREATE TABLE refund_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id   uuid NOT NULL UNIQUE REFERENCES decisions(id),
  outcome       refund_decision NOT NULL,
  decided_by    uuid NOT NULL REFERENCES staff(id),
  exported_to_oms_at timestamptz
);

CREATE TABLE warehouse_tasks (
  id            text PRIMARY KEY,       -- e.g. WT-8674
  decision_id   uuid NOT NULL REFERENCES decisions(id),
  task_type     text NOT NULL CHECK (task_type IN ('PUTAWAY', 'REPAIR_BENCH', 'RELIST_SECONDARY', 'RECYCLE_BIN', 'QUARANTINE_INSPECT')),
  location      text NOT NULL,
  assignee_id   uuid REFERENCES staff(id),
  status        task_status NOT NULL DEFAULT 'queued',
  wms_ref       text,                   -- 'SIM-WMS-…' when simulated
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

-- Binding inventory changes: only from an approved decision + completed task.
CREATE TABLE inventory_adjustments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id   uuid NOT NULL REFERENCES decisions(id),
  task_id       text NOT NULL REFERENCES warehouse_tasks(id),
  sku           text NOT NULL REFERENCES products(sku),
  site_id       uuid NOT NULL REFERENCES sites(id),
  stock_grade   text NOT NULL,
  delta         integer NOT NULL,
  approved_by   uuid NOT NULL REFERENCES staff(id),
  posted_to_wms_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION enforce_task_done_before_adjustment() RETURNS trigger AS $$
BEGIN
  IF (SELECT status FROM warehouse_tasks WHERE id = NEW.task_id) <> 'done' THEN
    RAISE EXCEPTION 'Inventory adjustment requires a completed warehouse task (%)', NEW.task_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_adjustment_guard BEFORE INSERT ON inventory_adjustments
  FOR EACH ROW EXECUTE FUNCTION enforce_task_done_before_adjustment();

-- ── Audit (append-only) ────────────────────────────────────────────────────
CREATE TABLE audit_events (
  id            bigserial PRIMARY KEY,
  return_id     text REFERENCES returns(id) ON DELETE CASCADE,
  actor_kind    text NOT NULL CHECK (actor_kind IN ('human', 'ai', 'system')),
  actor         text NOT NULL,
  action        text NOT NULL,
  detail        jsonb,
  at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_return_idx ON audit_events (return_id, at);
REVOKE UPDATE, DELETE ON audit_events FROM PUBLIC;

-- ── Analytics views ────────────────────────────────────────────────────────
CREATE VIEW v_stage_dwell AS
SELECT organisation_id, stage, count(*) AS open_count,
       avg(extract(epoch FROM now() - stage_entered_at) / 3600)::numeric(8,1) AS avg_hours
FROM returns WHERE stage <> 'closed' GROUP BY organisation_id, stage;

CREATE VIEW v_recovery_by_route AS
SELECT r.organisation_id, d.route, count(*) AS returns,
       sum((SELECT (o->>'netValue')::numeric FROM jsonb_array_elements(rec.options) o WHERE o->>'route' = d.route::text)) AS expected_net,
       sum(r.realised_value) AS realised_net
FROM decisions d JOIN returns r ON r.id = d.return_id JOIN recommendations rec ON rec.id = d.recommendation_id
GROUP BY r.organisation_id, d.route;

CREATE VIEW v_ai_agreement AS
SELECT date_trunc('week', v.verified_at) AS week, count(*) AS verified,
       count(*) FILTER (WHERE v.grade = s.grade) AS agreed
FROM condition_verifications v JOIN condition_suggestions s ON s.id = v.suggestion_id
GROUP BY 1;
