-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "billingEmail" TEXT,
    "billingAddress" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ES',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantSection" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RestaurantSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantUserAccess" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleAtSite" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantUserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentModel" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "description" TEXT,
    "powerRatingKw" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "EquipmentModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentType" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EquipmentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sectionId" TEXT,
    "categoryId" TEXT NOT NULL,
    "modelId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "locationNote" TEXT,
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_SERVICE',
    "riskLevel" TEXT NOT NULL DEFAULT 'GREEN',
    "customFields" TEXT,
    "registeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "issuingBody" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlanTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipmentTypeId" TEXT NOT NULL,
    "frequencyType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,

    CONSTRAINT "MaintenancePlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlanTask" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "taskOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expectedResultType" TEXT NOT NULL,
    "unit" TEXT,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "optionsJson" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MaintenancePlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PREVENTIVE',
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "summary" TEXT,
    "notes" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderTask" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "planTaskId" TEXT,
    "section" TEXT NOT NULL,
    "taskOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expectedResultType" TEXT NOT NULL,
    "unit" TEXT,
    "optionsJson" TEXT,
    "resultBoolean" BOOLEAN,
    "resultNumeric" DOUBLE PRECISION,
    "resultText" TEXT,
    "evidenceNote" TEXT,
    "isNonConformity" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkOrderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NonConformity" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "NonConformity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantUserAccess_restaurantId_userId_roleAtSite_key" ON "RestaurantUserAccess"("restaurantId", "userId", "roleAtSite");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_code_key" ON "EquipmentCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_code_key" ON "EquipmentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_assetTag_key" ON "Equipment"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePlanTemplate_code_key" ON "MaintenancePlanTemplate"("code");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantSection" ADD CONSTRAINT "RestaurantSection_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantUserAccess" ADD CONSTRAINT "RestaurantUserAccess_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantUserAccess" ADD CONSTRAINT "RestaurantUserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentModel" ADD CONSTRAINT "EquipmentModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentType" ADD CONSTRAINT "EquipmentType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RestaurantSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "EquipmentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EquipmentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlanTemplate" ADD CONSTRAINT "MaintenancePlanTemplate_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlanTask" ADD CONSTRAINT "MaintenancePlanTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenancePlanTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenancePlanTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTask" ADD CONSTRAINT "WorkOrderTask_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderTask" ADD CONSTRAINT "WorkOrderTask_planTaskId_fkey" FOREIGN KEY ("planTaskId") REFERENCES "MaintenancePlanTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformity" ADD CONSTRAINT "NonConformity_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

