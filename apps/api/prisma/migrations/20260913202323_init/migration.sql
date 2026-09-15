-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "billingEmail" TEXT,
    "billingAddress" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Restaurant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RestaurantSection_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantUserAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleAtSite" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RestaurantUserAccess_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantUserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "EquipmentModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "description" TEXT,
    "powerRatingKw" REAL,
    "notes" TEXT,
    CONSTRAINT "EquipmentModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "sectionId" TEXT,
    "categoryId" TEXT NOT NULL,
    "modelId" TEXT,
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
    CONSTRAINT "Equipment_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "issueDate" DATETIME,
    "expiryDate" DATETIME,
    "issuingBody" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE UNIQUE INDEX "Equipment_assetTag_key" ON "Equipment"("assetTag");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
