export const ROLE_CODES = ['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN', 'CUSTOMER', 'AUTHORITY'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const SITE_ROLES = ['OWNER', 'MANAGER', 'TECHNICIAN', 'AUTHORITY', 'VIEW_ONLY'] as const;
export type SiteRole = (typeof SITE_ROLES)[number];

export const EQUIPMENT_STATUSES = ['IN_SERVICE', 'OUT_OF_SERVICE', 'RETIRED'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

// PAYA Risk Scale — SOP Phase 1 §4.3 (Baseline Stabilization)
export const RISK_LEVELS = ['RED', 'ORANGE', 'YELLOW', 'GREEN'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const DOC_TYPES = ['CERTIFICATE', 'MANUAL', 'REPORT', 'OTHER'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const RESULT_TYPES = ['BOOLEAN', 'NUMERIC', 'TEXT', 'CHOICE'] as const;
export type ResultType = (typeof RESULT_TYPES)[number];

export const NON_CONFORMITY_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type NonConformitySeverity = (typeof NON_CONFORMITY_SEVERITIES)[number];

export const NON_CONFORMITY_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export type NonConformityStatus = (typeof NON_CONFORMITY_STATUSES)[number];

export const WORK_ORDER_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

// Roles allowed to register/update equipment in the field (SOP Phase 1 §4.2: technician tags assets).
export const EQUIPMENT_WRITE_ROLES: RoleCode[] = ['ADMIN', 'PROJECT_ENGINEER', 'TECHNICIAN'];

// Roles with unrestricted (non-tenant-scoped) visibility across all customers.
export const STAFF_ROLES: RoleCode[] = ['ADMIN', 'PROJECT_ENGINEER'];

// Only staff can create a maintenance assignment (self-started "quick start" or handed to
// a technician) — a technician cannot start a visit that wasn't defined for them.
export const ASSIGNMENT_ROLES: RoleCode[] = ['ADMIN', 'PROJECT_ENGINEER'];
