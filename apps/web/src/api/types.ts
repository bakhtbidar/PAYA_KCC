export type RoleCode = 'ADMIN' | 'PROJECT_ENGINEER' | 'TECHNICIAN' | 'CUSTOMER' | 'AUTHORITY';
export type SiteRole = 'OWNER' | 'MANAGER' | 'TECHNICIAN' | 'AUTHORITY' | 'VIEW_ONLY';
export type RiskLevel = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
export type DocType = 'CERTIFICATE' | 'MANUAL' | 'REPORT' | 'OTHER';
export type ResultType = 'BOOLEAN' | 'NUMERIC' | 'TEXT' | 'CHOICE';
export type NonConformitySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NonConformityStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type EquipmentStatus = 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'RETIRED';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: RoleCode[];
}

export interface Customer {
  id: string;
  name: string;
  taxId?: string | null;
  billingEmail?: string | null;
  createdAt: string;
  _count?: { restaurants: number };
  restaurants?: Restaurant[];
}

export interface Restaurant {
  id: string;
  customerId: string;
  name: string;
  code?: string | null;
  city?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  isActive: boolean;
  customer?: { id: string; name: string };
  _count?: { equipment: number };
  sections?: Section[];
  equipment?: EquipmentSummary[];
}

export interface TechnicianOption {
  id: string;
  fullName: string;
  email: string;
}

export interface Section {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface EquipmentCategory {
  id: string;
  code: string;
  name: string;
}

export interface EquipmentType {
  id: string;
  code: string;
  name: string;
  categoryId: string;
}

export interface EquipmentSummary {
  id: string;
  name: string;
  assetTag: string;
  riskLevel: RiskLevel;
  status: string;
  categoryId: string;
  category: { name: string };
  section?: { name: string } | null;
}

export interface EquipmentDetail extends EquipmentSummary {
  restaurantId: string;
  typeId?: string | null;
  type?: { id: string; name: string } | null;
  serialNumber?: string | null;
  locationNote?: string | null;
  qrCodeDataUrl: string;
  documents: DocumentRow[];
}

export interface MaintenancePlanTemplateSummary {
  id: string;
  code: string;
  name: string;
  frequencyType: string;
  equipmentTypeId: string;
}

export interface MaintenancePlanTask {
  id: string;
  section: string;
  taskOrder: number;
  description: string;
  expectedResultType: ResultType;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  optionsJson?: string | null;
  isMandatory: boolean;
}

export interface MaintenancePlanTemplateDetail extends MaintenancePlanTemplateSummary {
  description?: string | null;
  equipmentType: { id: string; name: string };
  tasks: MaintenancePlanTask[];
}

export interface WorkOrderTaskAnswer {
  planTaskId: string;
  resultBoolean?: boolean;
  resultNumeric?: number;
  resultText?: string;
  evidenceNote?: string;
  isNonConformity?: boolean;
  nonConformityDescription?: string;
  nonConformitySeverity?: NonConformitySeverity;
}

export interface WorkOrderTaskCorrection {
  workOrderTaskId: string;
  resultBoolean?: boolean;
  resultNumeric?: number;
  resultText?: string;
  evidenceNote?: string;
}

export interface WorkOrderSummary {
  id: string;
  status: WorkOrderStatus;
  assignedAt: string;
  startedAt: string;
  completedAt?: string | null;
  performedBy: { id: string; fullName: string };
  assignedBy?: { fullName: string } | null;
  template?: { name: string; code: string } | null;
  _count: { nonConformities: number };
}

/** What GET /work-orders/queue/me returns — includes which equipment/restaurant it's for. */
export interface WorkOrderQueueItem extends WorkOrderSummary {
  equipment: { id: string; name: string; assetTag: string; restaurantId: string };
  restaurant: { name: string };
}

export interface WorkOrderTaskResult {
  id: string;
  section: string;
  taskOrder: number;
  description: string;
  expectedResultType: ResultType;
  unit?: string | null;
  optionsJson?: string | null;
  resultBoolean?: boolean | null;
  resultNumeric?: number | null;
  resultText?: string | null;
  evidenceNote?: string | null;
  isNonConformity: boolean;
}

export interface NonConformityRow {
  id: string;
  severity: NonConformitySeverity;
  description: string;
  recommendation?: string | null;
  status: NonConformityStatus;
  createdAt: string;
  resolvedAt?: string | null;
  equipment?: { name: string; assetTag: string };
  reportedBy: { fullName: string };
}

export interface WorkOrderDetail extends Omit<WorkOrderSummary, 'performedBy'> {
  restaurantId: string;
  templateId?: string | null;
  notes?: string | null;
  performedBy: { id: string; fullName: string; email: string };
  equipment: { id: string; name: string; assetTag: string };
  tasks: WorkOrderTaskResult[];
  nonConformities: NonConformityRow[];
}

export interface DocumentRow {
  id: string;
  name: string;
  docType: DocType;
  expiryDate?: string | null;
  createdAt: string;
  uploadedBy?: { fullName: string };
  equipment?: { name: string; assetTag: string } | null;
}

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: { role: { code: RoleCode; name: string } }[];
  restaurantAccess: { id: string; restaurantId: string; roleAtSite: SiteRole; restaurant: { name: string } }[];
}

export interface AuditLogRow {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
}
