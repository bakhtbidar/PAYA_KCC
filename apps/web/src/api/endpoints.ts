import { apiFetch } from './client';
import type {
  AuditLogRow,
  Customer,
  DocumentRow,
  EquipmentCategory,
  EquipmentDetail,
  EquipmentType,
  MaintenancePlanTemplateDetail,
  MaintenancePlanTemplateSummary,
  NonConformityRow,
  NonConformityStatus,
  Restaurant,
  Section,
  TechnicianOption,
  UserRow,
  WorkOrderDetail,
  WorkOrderQueueItem,
  WorkOrderSummary,
  WorkOrderTaskAnswer,
  WorkOrderTaskCorrection,
} from './types';

// ---------- Customers ----------
export const listCustomers = () => apiFetch<Customer[]>('/customers');
export const getCustomer = (id: string) => apiFetch<Customer>(`/customers/${id}`);
export const createCustomer = (body: { name: string; taxId?: string; billingEmail?: string }) =>
  apiFetch<Customer>('/customers', { method: 'POST', body });

// ---------- Restaurants ----------
export const listRestaurants = () => apiFetch<Restaurant[]>('/restaurants');
export const getRestaurant = (id: string) => apiFetch<Restaurant>(`/restaurants/${id}`);
export const createRestaurant = (body: { customerId: string; name: string; city?: string; code?: string }) =>
  apiFetch<Restaurant>('/restaurants', { method: 'POST', body });
export const updateRestaurant = (
  id: string,
  body: { name?: string; code?: string; addressLine?: string; city?: string; postalCode?: string; isActive?: boolean },
) => apiFetch<Restaurant>(`/restaurants/${id}`, { method: 'PATCH', body });
export const deleteRestaurant = (id: string) =>
  apiFetch<{ deleted: boolean; deactivated: boolean }>(`/restaurants/${id}`, { method: 'DELETE' });
export const addSection = (restaurantId: string, body: { name: string; description?: string }) =>
  apiFetch<Section>(`/restaurants/${restaurantId}/sections`, { method: 'POST', body });
export const listTechnicians = (restaurantId: string) =>
  apiFetch<TechnicianOption[]>(`/restaurants/${restaurantId}/technicians`);

// ---------- Equipment ----------
export const listEquipmentCategories = () => apiFetch<EquipmentCategory[]>('/equipment/categories');
export const listEquipmentTypes = (categoryId?: string) =>
  apiFetch<EquipmentType[]>(`/equipment/types${categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : ''}`);
export const getEquipment = (id: string) => apiFetch<EquipmentDetail>(`/equipment/${id}`);
export const createEquipment = (body: {
  restaurantId: string;
  sectionId?: string;
  categoryId: string;
  typeId?: string;
  name: string;
  serialNumber?: string;
}) => apiFetch<EquipmentDetail>('/equipment', { method: 'POST', body });
export const updateEquipment = (
  id: string,
  body: { riskLevel?: string; status?: string; name?: string; typeId?: string; serialNumber?: string; locationNote?: string },
) => apiFetch<EquipmentDetail>(`/equipment/${id}`, { method: 'PATCH', body });
export const deleteEquipment = (id: string) =>
  apiFetch<{ deleted: boolean; retired: boolean }>(`/equipment/${id}`, { method: 'DELETE' });

// ---------- Maintenance plans ----------
export const listMaintenanceTemplates = (equipmentTypeId: string) =>
  apiFetch<MaintenancePlanTemplateSummary[]>(
    `/maintenance-plans/templates?equipmentTypeId=${encodeURIComponent(equipmentTypeId)}`,
  );
export const getMaintenanceTemplate = (id: string) =>
  apiFetch<MaintenancePlanTemplateDetail>(`/maintenance-plans/templates/${id}`);

// ---------- Work orders ----------
export const listWorkOrders = (equipmentId: string, status?: string) =>
  apiFetch<WorkOrderSummary[]>(
    `/work-orders?equipmentId=${encodeURIComponent(equipmentId)}${status ? `&status=${status}` : ''}`,
  );
export const getWorkOrder = (id: string) => apiFetch<WorkOrderDetail>(`/work-orders/${id}`);
export const myWorkOrderQueue = () => apiFetch<WorkOrderQueueItem[]>('/work-orders/queue/me');
export const assignWorkOrder = (body: { equipmentId: string; templateId: string; assignedToUserId: string }) =>
  apiFetch<WorkOrderSummary>('/work-orders/assign', { method: 'POST', body });
export const quickStartWorkOrder = (body: { equipmentId: string; templateId: string }) =>
  apiFetch<{ id: string }>('/work-orders/quick-start', { method: 'POST', body });
export const completeWorkOrder = (id: string, body: { notes?: string; tasks: WorkOrderTaskAnswer[] }) =>
  apiFetch<WorkOrderDetail>(`/work-orders/${id}/complete`, { method: 'POST', body });
export const updateWorkOrder = (id: string, body: { notes?: string; tasks: WorkOrderTaskCorrection[] }) =>
  apiFetch<WorkOrderDetail>(`/work-orders/${id}`, { method: 'PATCH', body });

// ---------- Non-conformities ----------
export const listNonConformitiesForEquipment = (equipmentId: string) =>
  apiFetch<NonConformityRow[]>(`/non-conformities?equipmentId=${encodeURIComponent(equipmentId)}`);
export const listNonConformitiesForRestaurant = (restaurantId: string) =>
  apiFetch<NonConformityRow[]>(`/non-conformities?restaurantId=${encodeURIComponent(restaurantId)}`);
export const updateNonConformityStatus = (id: string, status: NonConformityStatus) =>
  apiFetch<NonConformityRow>(`/non-conformities/${id}`, { method: 'PATCH', body: { status } });

// ---------- Documents ----------
export const listDocuments = (restaurantId: string) =>
  apiFetch<DocumentRow[]>(`/documents?restaurantId=${encodeURIComponent(restaurantId)}`);
export const uploadDocument = (form: FormData) =>
  apiFetch<DocumentRow>('/documents', { method: 'POST', body: form, isFormData: true });

// ---------- Users ----------
export const listUsers = () => apiFetch<UserRow[]>('/users');
export const createUser = (body: { email: string; password: string; fullName: string; roleCodes: string[] }) =>
  apiFetch<UserRow>('/users', { method: 'POST', body });
export const grantRestaurantAccess = (userId: string, body: { restaurantId: string; roleAtSite: string }) =>
  apiFetch(`/users/${userId}/restaurant-access`, { method: 'POST', body });
export const revokeRestaurantAccess = (userId: string, accessId: string) =>
  apiFetch(`/users/${userId}/restaurant-access/${accessId}`, { method: 'DELETE' });

// ---------- Audit ----------
export const listAuditLog = () => apiFetch<AuditLogRow[]>('/audit-log?take=50');
