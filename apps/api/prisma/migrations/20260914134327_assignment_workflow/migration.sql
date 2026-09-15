-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "templateId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PREVENTIVE',
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "summary" TEXT,
    "notes" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkOrder_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MaintenancePlanTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkOrder_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkOrder" ("completedAt", "createdAt", "equipmentId", "id", "notes", "performedByUserId", "restaurantId", "startedAt", "status", "summary", "templateId", "type") SELECT "completedAt", "createdAt", "equipmentId", "id", "notes", "performedByUserId", "restaurantId", "startedAt", "status", "summary", "templateId", "type" FROM "WorkOrder";
DROP TABLE "WorkOrder";
ALTER TABLE "new_WorkOrder" RENAME TO "WorkOrder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
