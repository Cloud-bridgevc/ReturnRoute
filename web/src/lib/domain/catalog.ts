import type { ConditionGrade, Product, ReasonCategory, RecoveryRoute, ReturnStage, RecoveryRules, TaskType } from "./types";

// FICTIONAL product catalogue. Brands and products are invented for demonstration.
export const PRODUCTS: Product[] = [
  { sku: "NB-KTL-220", name: "Northbeam Pour-Over Kettle 1.2L", category: "Small appliances", brand: "Northbeam", msrp: 89, unitCost: 34, weightKg: 1.4, repairable: true, avgRepairCost: 18, containsBattery: false, gtin: "5060000100221" },
  { sku: "HX-ANC-700", name: "Halyx ANC Headphones 700", category: "Audio", brand: "Halyx", msrp: 249, unitCost: 102, weightKg: 0.6, repairable: true, avgRepairCost: 42, containsBattery: true, gtin: "5060000100702" },
  { sku: "LM-LMP-X2", name: "Lumora X2 Desk Lamp", category: "Home & lighting", brand: "Lumora", msrp: 64, unitCost: 22, weightKg: 1.9, repairable: true, avgRepairCost: 15, containsBattery: false, gtin: "5060000100029" },
  { sku: "TR-JKT-M-NV", name: "Trailmark Shell Jacket (M, Navy)", category: "Apparel", brand: "Trailmark", msrp: 140, unitCost: 41, weightKg: 0.5, repairable: false, avgRepairCost: 0, containsBattery: false, gtin: "5060000100340" },
  { sku: "VK-BLD-900", name: "Velkin Pro Blender 900W", category: "Small appliances", brand: "Velkin", msrp: 159, unitCost: 63, weightKg: 4.2, repairable: true, avgRepairCost: 38, containsBattery: false, gtin: "5060000100900" },
  { sku: "OR-TAB-11", name: "Orrin Tab 11 (128GB)", category: "Electronics", brand: "Orrin", msrp: 529, unitCost: 301, weightKg: 0.7, repairable: true, avgRepairCost: 96, containsBattery: true, gtin: "5060000101128" },
  { sku: "PB-CHR-ERG", name: "Pellbrook Ergo Task Chair", category: "Furniture", brand: "Pellbrook", msrp: 319, unitCost: 118, weightKg: 17.5, repairable: true, avgRepairCost: 35, containsBattery: false, gtin: "5060000100318" },
  { sku: "SW-RUN-42", name: "Strideworks Trail Runner (EU 42)", category: "Footwear", brand: "Strideworks", msrp: 115, unitCost: 37, weightKg: 0.9, repairable: false, avgRepairCost: 0, containsBattery: false, gtin: "5060000100042" },
  { sku: "CF-ESP-01", name: "Cafforo Compact Espresso Machine", category: "Small appliances", brand: "Cafforo", msrp: 379, unitCost: 158, weightKg: 6.8, repairable: true, avgRepairCost: 64, containsBattery: false, gtin: "5060000100011" },
  { sku: "GL-SPK-MINI", name: "Glimt Mini Bluetooth Speaker", category: "Audio", brand: "Glimt", msrp: 49, unitCost: 17, weightKg: 0.3, repairable: false, avgRepairCost: 0, containsBattery: true, gtin: "5060000100049" },
];

export const productBySku = (sku?: string) => PRODUCTS.find((p) => p.sku === sku);
export const productByGtin = (gtin?: string) => PRODUCTS.find((p) => p.gtin === gtin);

export const REASON_LABELS: Record<ReasonCategory, string> = {
  damaged_in_transit: "Damaged in transit",
  defective: "Defective / fault",
  wrong_item: "Wrong item sent",
  not_as_described: "Not as described",
  size_fit: "Size or fit",
  changed_mind: "Changed mind",
  missing_parts: "Missing parts",
  late_delivery: "Arrived too late",
};

export const GRADE_LABELS: Record<ConditionGrade, string> = {
  A_NEW: "A · New / sealed",
  B_OPEN_BOX: "B · Open box",
  C_USED_GOOD: "C · Used, good",
  D_DAMAGED_REPAIRABLE: "D · Damaged, repairable",
  E_NOT_REPAIRABLE: "E · Not repairable",
  X_UNCERTAIN: "X · Needs further inspection",
};

export const GRADES = Object.keys(GRADE_LABELS) as ConditionGrade[];

export const ROUTE_LABELS: Record<RecoveryRoute, string> = {
  RESTOCK: "Restock",
  REPAIR: "Repair & refurbish",
  RESALE: "Secondary resale",
  RECYCLE: "Recycle",
  FURTHER_INSPECTION: "Further inspection",
};

export const ROUTE_DESCRIPTIONS: Record<RecoveryRoute, string> = {
  RESTOCK: "Return to sellable A-stock at full price.",
  REPAIR: "Send to repair bench, then resell as refurbished.",
  RESALE: "List as open-box / B-stock on a secondary channel.",
  RECYCLE: "Strip for parts and recycle materials via certified partner.",
  FURTHER_INSPECTION: "Quarantine for specialist inspection before any decision.",
};

export const ROUTE_TASK: Record<RecoveryRoute, { type: TaskType; location: string }> = {
  RESTOCK: { type: "PUTAWAY", location: "Aisle 14 · Prime stock" },
  REPAIR: { type: "REPAIR_BENCH", location: "Bay R2 · Repair bench" },
  RESALE: { type: "RELIST_SECONDARY", location: "Zone B · Grading & relist" },
  RECYCLE: { type: "RECYCLE_BIN", location: "Dock 6 · WEEE cage" },
  FURTHER_INSPECTION: { type: "QUARANTINE_INSPECT", location: "Q1 · Quarantine" },
};

export const STAGE_LABELS: Record<ReturnStage, string> = {
  intake: "Intake",
  inspection: "Inspection",
  verification: "Condition verification",
  approval: "Awaiting approval",
  tasked: "Warehouse task",
  closed: "Closed",
};

export const STAFF = {
  associate: ["Priya Natarajan", "Tom Ashworth"],
  inspector: ["Ama Mensah", "Luis Ferreira", "Hana Kowalczyk"],
  supervisor: ["Dana Okafor"],
};

export const SITES = ["Leeds DC (fictional)", "Daventry Hub (fictional)"];
export const RETAILERS = ["Fernbrook Home", "Kestrel Outdoor", "Volta Electronics", "Marlow & Pike"];

export const DEFAULT_RULES: RecoveryRules = {
  version: 3,
  minSuggestionConfidence: 0.7,
  restockGrades: ["A_NEW"],
  resaleGrades: ["B_OPEN_BOX", "C_USED_GOOD"],
  repairGrades: ["C_USED_GOOD", "D_DAMAGED_REPAIRABLE"],
  maxRepairCostPctOfMsrp: 0.45,
  highValueThreshold: 300,
  batteryRequiresSafetyCheck: true,
  requireVerifiedGrade: true,
  recoveryRates: { RESTOCK: 1.0, REPAIR: 0.72, RESALE: 0.58, RECYCLE: 0.0 },
  resaleGradeDiscount: { B_OPEN_BOX: 1.0, C_USED_GOOD: 0.8 },
  costs: {
    inspectionLabour: 3.5,
    restockLabour: 2.2,
    repairLabourPerHour: 24,
    repairHours: 0.75,
    resaleChannelFeePct: 0.12,
    resalePrepCost: 4.5,
    recyclingFeePerKg: 0.6,
    materialCreditPerKg: 0.35,
    outboundLogistics: 3.8,
  },
  routePriority: ["RESTOCK", "RESALE", "REPAIR", "RECYCLE", "FURTHER_INSPECTION"],
};

export const gbp = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
