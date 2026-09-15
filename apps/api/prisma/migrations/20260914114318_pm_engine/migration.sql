-- CreateTable
CREATE TABLE "EquipmentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "EquipmentType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenancePlanTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipmentTypeId" TEXT NOT NULL,
    "frequencyType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    CONSTRAINT "MaintenancePlanTemplate_equipmentTypeId_fkey" FOREIGN KEY ("equipmentTypeId") REFERENCES "EquipmentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenancePlanTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "taskOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expectedResultType" TEXT NOT NULL,
    "unit" TEXT,
    "minValue" REAL,
    "maxValue" REAL,
    "optionsJson" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MaintenancePlanTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenancePlanTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PREVENTIVE',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "summary" TEXT,
    "notes" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenancePlanTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkOrderTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "planTaskId" TEXT,
    "section" TEXT NOT NULL,
    "taskOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expectedResultType" TEXT NOT NULL,
    "unit" TEXT,
    "optionsJson" TEXT,
    "resultBoolean" BOOLEAN,
    "resultNumeric" REAL,
    "resultText" TEXT,
    "evidenceNote" TEXT,
    "isNonConformity" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WorkOrderTask_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrderTask_planTaskId_fkey" FOREIGN KEY ("planTaskId") REFERENCES "MaintenancePlanTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NonConformity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "NonConformity_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NonConformity_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NonConformity_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NonConformity_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "sectionId" TEXT,
    "categoryId" TEXT NOT NULL,
    "modelId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "locationNote" TEXT,
    "installDate" DATETIME,
    "warrantyExpiry" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_SERVICE',
    "riskLevel" TEXT NOT NULL DEFAULT 'GREEN',
    "customFields" TEXT,
    "registeredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Equipment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RestaurantSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Equipment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "EquipmentModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "EquipmentType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Equipment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Equipment" ("assetTag", "categoryId", "createdAt", "customFields", "id", "installDate", "locationNote", "modelId", "name", "registeredById", "restaurantId", "riskLevel", "sectionId", "serialNumber", "status", "updatedAt", "warrantyExpiry") SELECT "assetTag", "categoryId", "createdAt", "customFields", "id", "installDate", "locationNote", "modelId", "name", "registeredById", "restaurantId", "riskLevel", "sectionId", "serialNumber", "status", "updatedAt", "warrantyExpiry" FROM "Equipment";
DROP TABLE "Equipment";
ALTER TABLE "new_Equipment" RENAME TO "Equipment";
CREATE UNIQUE INDEX "Equipment_assetTag_key" ON "Equipment"("assetTag");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentType_code_key" ON "EquipmentType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePlanTemplate_code_key" ON "MaintenancePlanTemplate"("code");
