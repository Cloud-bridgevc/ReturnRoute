// Core domain model for ReturnRoute. Mirrors db/schema.sql.

export type ReasonCategory =
  | "damaged_in_transit"
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "size_fit"
  | "changed_mind"
  | "missing_parts"
  | "late_delivery";

export type ConditionGrade =
  | "A_NEW" // sealed / unused
  | "B_OPEN_BOX" // opened, complete, no wear
  | "C_USED_GOOD" // light use, cosmetic only
  | "D_DAMAGED_REPAIRABLE" // functional or cosmetic damage that can be repaired
  | "E_NOT_REPAIRABLE" // salvage / materials only
  | "X_UNCERTAIN"; // cannot be graded without further inspection

export type RecoveryRoute =
  | "RESTOCK"
  | "REPAIR"
  | "RESALE"
  | "RECYCLE"
  | "FURTHER_INSPECTION";

export type ReturnStage =
  | "intake" // received, awaiting product identification
  | "inspection" // in inspection queue
  | "verification" // AI suggestion awaiting human condition verification
  | "approval" // recommendation awaiting staff approval
  | "tasked" // approved, warehouse task(s) assigned
  | "closed";

export type Role = "associate" | "inspector" | "supervisor";

export interface Product {
  sku: string;
  name: string;
  category: string;
  brand: string;
  msrp: number; // GBP
  unitCost: number;
  weightKg: number;
  repairable: boolean;
  avgRepairCost: number; // parts + labour estimate for typical defect
  containsBattery: boolean;
  gtin: string;
}

export interface ReasonClassification {
  category: ReasonCategory;
  confidence: number;
  signals: string[];
  source: "simulated" | "bedrock";
}

export interface ImageAsset {
  id: string;
  label: string;
  /** s3://bucket/key in production; local object URL or bundled demo path in the demo */
  uri: string;
  previewUrl?: string;
  /** Simulated vision observations bundled with fictional demo images */
  observations?: string[];
}

export interface ConditionSuggestion {
  grade: ConditionGrade;
  confidence: number;
  findings: string[];
  summary: string;
  source: "simulated" | "bedrock";
  generatedAt: string;
  /** Always true: an AI suggestion is advisory and never authorises an action. */
  advisoryOnly: true;
}

export interface Inspection {
  inspector?: string;
  notes: string;
  checklist: {
    powersOn?: boolean | null;
    accessoriesComplete?: boolean | null;
    packagingIntact?: boolean | null;
    batterySafe?: boolean | null;
  };
  images: ImageAsset[];
  suggestion?: ConditionSuggestion;
  verifiedGrade?: ConditionGrade;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
}

export interface RouteOption {
  route: RecoveryRoute;
  eligible: boolean;
  blockedBy: string[];
  expectedRecovery: number; // gross value recovered
  handlingCost: number; // labour + parts + fees + logistics
  netValue: number;
  costBreakdown: { label: string; amount: number }[];
}

export interface RuleTraceEntry {
  ruleId: string;
  description: string;
  outcome: "pass" | "block" | "flag" | "info";
}

export interface Recommendation {
  route: RecoveryRoute;
  options: RouteOption[];
  rationale: string[];
  ruleTrace: RuleTraceEntry[];
  approvalLevel: Role;
  basedOnGrade: ConditionGrade;
  gradeVerified: boolean;
  generatedAt: string;
  rulesVersion: number;
}

export interface Decision {
  route: RecoveryRoute;
  decidedBy: string;
  role: Role;
  decidedAt: string;
  overridden: boolean;
  note?: string;
  refundDecision: "approved" | "partial" | "declined" | "deferred";
}

export type TaskType =
  | "PUTAWAY"
  | "REPAIR_BENCH"
  | "RELIST_SECONDARY"
  | "RECYCLE_BIN"
  | "QUARANTINE_INSPECT";

export interface WarehouseTask {
  id: string;
  returnId: string;
  type: TaskType;
  location: string;
  assignee: string;
  status: "queued" | "in_progress" | "done";
  createdAt: string;
  completedAt?: string;
  /** Integration status with the (simulated) WMS */
  wmsRef: string;
}

export interface AuditEvent {
  at: string;
  actor: string;
  action: string;
  detail?: string;
  kind: "system" | "ai" | "human";
}

export interface ReturnRecord {
  id: string;
  rma: string;
  orderId: string;
  retailer: string;
  channel: "web" | "marketplace" | "store";
  customerRef: string;
  sku?: string;
  serial?: string;
  scannedBarcode?: string;
  reasonText: string;
  reason?: ReasonClassification;
  stage: ReturnStage;
  receivedAt: string;
  stageEnteredAt: string;
  site: string;
  inspection?: Inspection;
  recommendation?: Recommendation;
  decision?: Decision;
  tasks: WarehouseTask[];
  audit: AuditEvent[];
  /** Realised value once closed (for reports). */
  realisedValue?: number;
  carrier?: string;
}

export interface RecoveryRules {
  version: number;
  minSuggestionConfidence: number; // below → further inspection
  restockGrades: ConditionGrade[];
  resaleGrades: ConditionGrade[];
  repairGrades: ConditionGrade[];
  maxRepairCostPctOfMsrp: number; // repair only if cost below this share of MSRP
  highValueThreshold: number; // GBP; at/above → supervisor approval
  batteryRequiresSafetyCheck: boolean;
  requireVerifiedGrade: boolean; // always true in production
  recoveryRates: Record<Exclude<RecoveryRoute, "FURTHER_INSPECTION">, number>; // share of MSRP
  resaleGradeDiscount: Partial<Record<ConditionGrade, number>>;
  costs: {
    inspectionLabour: number;
    restockLabour: number;
    repairLabourPerHour: number;
    repairHours: number;
    resaleChannelFeePct: number;
    resalePrepCost: number;
    recyclingFeePerKg: number;
    materialCreditPerKg: number;
    outboundLogistics: number;
  };
  routePriority: RecoveryRoute[]; // tie-breaker
}
