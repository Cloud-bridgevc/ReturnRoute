-- FICTIONAL seed data for local development. No real organisations or people.
BEGIN;

INSERT INTO organisations (id, name, kind) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Fernbrook Home (fictional)', 'retailer'),
  ('00000000-0000-0000-0000-000000000002', 'Northgate Fulfilment (fictional 3PL)', '3pl');

INSERT INTO sites (id, organisation_id, name, wms_system) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Leeds DC (fictional)', 'simulated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000001', 'Daventry Hub (fictional)', 'simulated');

INSERT INTO staff (id, organisation_id, name, email, role) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Priya Natarajan', 'priya@fernbrook.example', 'associate'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'Ama Mensah', 'ama@fernbrook.example', 'inspector'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000001', 'Dana Okafor', 'dana@fernbrook.example', 'supervisor');

INSERT INTO products (sku, organisation_id, gtin, name, brand, category, msrp, unit_cost, weight_kg, repairable, avg_repair_cost, contains_battery) VALUES
  ('NB-KTL-220',  '00000000-0000-0000-0000-000000000001', '5060000100221', 'Northbeam Pour-Over Kettle 1.2L', 'Northbeam', 'Small appliances', 89, 34, 1.4, true, 18, false),
  ('HX-ANC-700',  '00000000-0000-0000-0000-000000000001', '5060000100702', 'Halyx ANC Headphones 700', 'Halyx', 'Audio', 249, 102, 0.6, true, 42, true),
  ('LM-LMP-X2',   '00000000-0000-0000-0000-000000000001', '5060000100029', 'Lumora X2 Desk Lamp', 'Lumora', 'Home & lighting', 64, 22, 1.9, true, 15, false),
  ('TR-JKT-M-NV', '00000000-0000-0000-0000-000000000001', '5060000100340', 'Trailmark Shell Jacket (M, Navy)', 'Trailmark', 'Apparel', 140, 41, 0.5, false, 0, false),
  ('VK-BLD-900',  '00000000-0000-0000-0000-000000000001', '5060000100900', 'Velkin Pro Blender 900W', 'Velkin', 'Small appliances', 159, 63, 4.2, true, 38, false),
  ('OR-TAB-11',   '00000000-0000-0000-0000-000000000001', '5060000101128', 'Orrin Tab 11 (128GB)', 'Orrin', 'Electronics', 529, 301, 0.7, true, 96, true),
  ('PB-CHR-ERG',  '00000000-0000-0000-0000-000000000001', '5060000100318', 'Pellbrook Ergo Task Chair', 'Pellbrook', 'Furniture', 319, 118, 17.5, true, 35, false),
  ('SW-RUN-42',   '00000000-0000-0000-0000-000000000001', '5060000100042', 'Strideworks Trail Runner (EU 42)', 'Strideworks', 'Footwear', 115, 37, 0.9, false, 0, false),
  ('CF-ESP-01',   '00000000-0000-0000-0000-000000000001', '5060000100011', 'Cafforo Compact Espresso Machine', 'Cafforo', 'Small appliances', 379, 158, 6.8, true, 64, false),
  ('GL-SPK-MINI', '00000000-0000-0000-0000-000000000001', '5060000100049', 'Glimt Mini Bluetooth Speaker', 'Glimt', 'Audio', 49, 17, 0.3, false, 0, true);

INSERT INTO recovery_rule_sets (organisation_id, version, rules, published_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 3, '{
    "minSuggestionConfidence": 0.7,
    "restockGrades": ["A_NEW"],
    "resaleGrades": ["B_OPEN_BOX", "C_USED_GOOD"],
    "repairGrades": ["C_USED_GOOD", "D_DAMAGED_REPAIRABLE"],
    "maxRepairCostPctOfMsrp": 0.45,
    "highValueThreshold": 300,
    "batteryRequiresSafetyCheck": true,
    "requireVerifiedGrade": true,
    "recoveryRates": {"RESTOCK": 1.0, "REPAIR": 0.72, "RESALE": 0.58, "RECYCLE": 0},
    "resaleGradeDiscount": {"B_OPEN_BOX": 1.0, "C_USED_GOOD": 0.8},
    "costs": {"inspectionLabour": 3.5, "restockLabour": 2.2, "repairLabourPerHour": 24, "repairHours": 0.75,
              "resaleChannelFeePct": 0.12, "resalePrepCost": 4.5, "recyclingFeePerKg": 0.6,
              "materialCreditPerKg": 0.35, "outboundLogistics": 3.8},
    "routePriority": ["RESTOCK", "RESALE", "REPAIR", "RECYCLE", "FURTHER_INSPECTION"]
  }', '00000000-0000-0000-0000-0000000000b3');

-- Showcase: dented kettle awaiting condition verification.
INSERT INTO returns (id, organisation_id, site_id, rma, order_id, channel, customer_ref, carrier, scanned_barcode, sku, serial, identified_by, reason_text, stage)
VALUES ('RR-24017', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'RMA-880117', 'ORD-5309912', 'web', 'CUST-7Q2K',
        'ParcelNorth (fictional)', '5060000100221', 'NB-KTL-220', 'NBK22-0048813', '00000000-0000-0000-0000-0000000000b1',
        'Box was crushed when it arrived and the kettle has a dent in the base. The lid hinge is cracked so it won''t close.', 'verification');

INSERT INTO reason_classifications (return_id, category, confidence, signals, source)
VALUES ('RR-24017', 'damaged_in_transit', 0.90, ARRAY['Box was crushed', 'dent'], 'simulated');

WITH i AS (
  INSERT INTO inspections (return_id, inspector_id, notes, powers_on, accessories_complete, packaging_intact)
  VALUES ('RR-24017', '00000000-0000-0000-0000-0000000000b2',
          'Outer carton crushed on one corner. 12mm dent on base rim, kettle still heats and holds water with no leak. Lid hinge cracked — lid won''t latch.',
          true, true, false)
  RETURNING id
), m AS (
  INSERT INTO inspection_media (inspection_id, s3_bucket, s3_key, content_type, label)
  SELECT id, 'returnroute-demo-media', k, 'image/jpeg', l FROM i,
    (VALUES ('returns/RR-24017/base-dent.jpg', 'Base rim dent'), ('returns/RR-24017/lid-hinge.jpg', 'Lid hinge')) AS v(k, l)
)
INSERT INTO condition_suggestions (inspection_id, grade, confidence, findings, summary, source)
SELECT id, 'D_DAMAGED_REPAIRABLE', 0.85, ARRAY['Localised damage to a replaceable component (signal: "dent")'],
       'Evidence most consistent with grade D. Inspector must confirm before this is used.', 'simulated' FROM i;

INSERT INTO audit_events (return_id, actor_kind, actor, action) VALUES
  ('RR-24017', 'system', 'System', 'Return received'),
  ('RR-24017', 'human', 'Priya Natarajan', 'Product identified'),
  ('RR-24017', 'ai', 'ReturnRoute AI (simulated)', 'Condition suggested — advisory');

COMMIT;
