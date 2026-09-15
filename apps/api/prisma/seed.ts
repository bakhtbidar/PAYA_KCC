import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const ROLES = [
  { code: 'ADMIN', name: 'Administrator', description: 'Full platform access: accounts, billing, all customers.' },
  {
    code: 'PROJECT_ENGINEER',
    name: 'Project Engineer',
    description: 'Reviews findings, approves repair proposals, configures PM plans.',
  },
  { code: 'TECHNICIAN', name: 'Technician', description: 'Executes field visits, registers assets, logs findings.' },
  { code: 'CUSTOMER', name: 'Restaurant Manager / Customer', description: 'Owner or manager of one or more restaurants.' },
  { code: 'AUTHORITY', name: 'Authority', description: 'Inspector / auditor — read-only compliance visibility.' },
];

const EQUIPMENT_CATEGORIES = [
  { code: 'REFRIGERATION', name: 'Refrigeration' },
  { code: 'COOKING', name: 'Cooking equipment' },
  { code: 'WAREWASHING', name: 'Warewashing' },
  { code: 'FOOD_PREP', name: 'Food preparation' },
  { code: 'BEVERAGE', name: 'Beverage equipment' },
  { code: 'EXTRACTION', name: 'Extraction & ventilation' },
  { code: 'HVAC', name: 'HVAC' },
  { code: 'ELECTRICAL', name: 'Electrical distribution' },
  { code: 'GAS', name: 'Gas systems' },
  { code: 'PLUMBING', name: 'Plumbing' },
  { code: 'FIRE', name: 'Fire safety' },
];

// Maps each of the 20 PAYA_Monthly_* checklists (see Docs/PM) to the broad equipment
// category its equipment type belongs under.
const CATEGORY_BY_TEMPLATE_CODE: Record<string, string> = {
  PAYA_MONTHLY_01: 'REFRIGERATION',
  PAYA_MONTHLY_02: 'REFRIGERATION',
  PAYA_MONTHLY_03: 'REFRIGERATION',
  PAYA_MONTHLY_04: 'REFRIGERATION',
  PAYA_MONTHLY_05: 'COOKING',
  PAYA_MONTHLY_06: 'COOKING',
  PAYA_MONTHLY_07: 'COOKING',
  PAYA_MONTHLY_08: 'COOKING',
  PAYA_MONTHLY_09: 'WAREWASHING',
  PAYA_MONTHLY_10: 'FOOD_PREP',
  PAYA_MONTHLY_11: 'FOOD_PREP',
  PAYA_MONTHLY_12: 'FOOD_PREP',
  PAYA_MONTHLY_13: 'BEVERAGE',
  PAYA_MONTHLY_14: 'BEVERAGE',
  PAYA_MONTHLY_15: 'EXTRACTION',
  PAYA_MONTHLY_16: 'HVAC',
  PAYA_MONTHLY_17: 'ELECTRICAL',
  PAYA_MONTHLY_18: 'GAS',
  PAYA_MONTHLY_19: 'PLUMBING',
  PAYA_MONTHLY_20: 'FIRE',
};

// The fixed 5-value result scale used by every row of every PAYA_Monthly_* checklist
// (see the "Result definitions" table in each source .docx) — verbatim labels.
const PM_RESULT_OPTIONS = ['OK', 'Attention', 'Critical', 'N A', 'Not verified'];

interface ExtractedTask {
  description: string;
  expectedResultType: string;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  isMandatory: boolean;
}

interface ExtractedSection {
  name: string;
  tasks: ExtractedTask[];
}

interface ExtractedTemplate {
  sourceFile: string;
  code: string;
  name: string;
  equipmentTypeName: string;
  sections: ExtractedSection[];
}

function slugToCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function upsertRoles() {
  const roles: Record<string, { id: string }> = {};
  for (const r of ROLES) {
    roles[r.code] = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }
  return roles;
}

async function upsertCategories() {
  const cats: Record<string, { id: string }> = {};
  for (const c of EQUIPMENT_CATEGORIES) {
    cats[c.code] = await prisma.equipmentCategory.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: c,
    });
  }
  return cats;
}

async function upsertUser(email: string, password: string, fullName: string, roleIds: string[]) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { fullName, isActive: true },
    create: { email, passwordHash, fullName },
  });
  for (const roleId of roleIds) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
  }
  return user;
}

// Loads prisma/pm-checklists.json — a structured extraction of the 20 real checklists in
// Docs/PM/*.docx (task text is verbatim from those documents) — and seeds one EquipmentType
// + one MaintenancePlanTemplate + its ordered MaintenancePlanTasks per file. Returns a
// template code -> EquipmentType map for later use.
async function seedMaintenancePlans(categories: Record<string, { id: string }>) {
  const jsonPath = path.join(__dirname, 'pm-checklists.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('  (skipping — prisma/pm-checklists.json not found)');
    return {};
  }
  const templates: ExtractedTemplate[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const typesByCode: Record<string, { id: string; name: string }> = {};

  for (const t of templates) {
    const categoryCode = CATEGORY_BY_TEMPLATE_CODE[t.code];
    if (!categoryCode || !categories[categoryCode]) {
      throw new Error(`No category mapping for template ${t.code}`);
    }
    const typeCode = slugToCode(t.equipmentTypeName);

    const type = await prisma.equipmentType.upsert({
      where: { code: typeCode },
      update: { name: t.equipmentTypeName, categoryId: categories[categoryCode].id },
      create: { code: typeCode, name: t.equipmentTypeName, categoryId: categories[categoryCode].id },
    });
    typesByCode[t.code] = type;

    const template = await prisma.maintenancePlanTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, equipmentTypeId: type.id, sourceFile: t.sourceFile },
      create: {
        code: t.code,
        name: t.name,
        equipmentTypeId: type.id,
        sourceFile: t.sourceFile,
        frequencyType: 'MONTHLY',
      },
    });

    // Tasks have no natural unique key to upsert on, and — unlike everything else in this
    // script — deleting and recreating them would cascade-orphan any WorkOrderTask rows a
    // technician has already submitted against them. So: seed tasks only the first time a
    // template is created; on every later reseed, leave existing tasks alone.
    const existingTaskCount = await prisma.maintenancePlanTask.count({ where: { templateId: template.id } });
    if (existingTaskCount === 0) {
      let taskOrder = 0;
      for (const section of t.sections) {
        for (const task of section.tasks) {
          taskOrder += 1;
          await prisma.maintenancePlanTask.create({
            data: {
              templateId: template.id,
              section: section.name,
              taskOrder,
              description: task.description,
              expectedResultType: task.expectedResultType,
              unit: task.unit,
              minValue: task.minValue,
              maxValue: task.maxValue,
              isMandatory: task.isMandatory,
              optionsJson: task.expectedResultType === 'CHOICE' ? JSON.stringify(PM_RESULT_OPTIONS) : null,
            },
          });
        }
      }
    }
  }

  return typesByCode;
}

async function seedDemoData(
  categories: Record<string, { id: string }>,
  equipmentTypes: Record<string, { id: string; name: string }>,
  roles: Record<string, { id: string }>,
) {
  console.log('Seeding demo engineer, technician, manager...');
  const engineer = await upsertUser('engineer@paya.local', 'ChangeMe123!', 'Laura Puig — Project Engineer', [
    roles.PROJECT_ENGINEER.id,
  ]);
  const technician = await upsertUser('tech@paya.local', 'ChangeMe123!', 'Marc Soler — Technician', [
    roles.TECHNICIAN.id,
  ]);
  const manager = await upsertUser('manager@bambam.example', 'ChangeMe123!', 'Nuria Ferrer — Restaurant Manager', [
    roles.CUSTOMER.id,
  ]);
  void engineer;

  console.log('Seeding demo customer & restaurant...');
  const customer = await prisma.customer.upsert({
    where: { id: 'seed-customer-bambam' },
    update: {},
    create: {
      id: 'seed-customer-bambam',
      name: 'Bam Bam Restaurants Group',
      taxId: 'B00000000',
      billingEmail: 'billing@bambam.example',
    },
  });

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'seed-restaurant-glories' },
    update: {},
    create: {
      id: 'seed-restaurant-glories',
      customerId: customer.id,
      name: 'Bam Bam Glòries',
      code: 'BB-GLO',
      addressLine: 'Av. Diagonal 208',
      city: 'Barcelona',
      postalCode: '08018',
    },
  });

  const kitchen = await prisma.restaurantSection.upsert({
    where: { id: 'seed-section-kitchen' },
    update: {},
    create: { id: 'seed-section-kitchen', restaurantId: restaurant.id, name: 'Main Kitchen', sortOrder: 1 },
  });
  await prisma.restaurantSection.upsert({
    where: { id: 'seed-section-bar' },
    update: {},
    create: { id: 'seed-section-bar', restaurantId: restaurant.id, name: 'Bar', sortOrder: 2 },
  });

  console.log('Granting restaurant access...');
  await prisma.restaurantUserAccess.upsert({
    where: {
      restaurantId_userId_roleAtSite: {
        restaurantId: restaurant.id,
        userId: manager.id,
        roleAtSite: 'MANAGER',
      },
    },
    update: {},
    create: { restaurantId: restaurant.id, userId: manager.id, roleAtSite: 'MANAGER', isPrimary: true },
  });
  await prisma.restaurantUserAccess.upsert({
    where: {
      restaurantId_userId_roleAtSite: {
        restaurantId: restaurant.id,
        userId: technician.id,
        roleAtSite: 'TECHNICIAN',
      },
    },
    update: {},
    create: { restaurantId: restaurant.id, userId: technician.id, roleAtSite: 'TECHNICIAN' },
  });

  console.log('Seeding sample equipment...');
  await prisma.equipment.upsert({
    where: { id: 'seed-equipment-walkin' },
    update: { typeId: equipmentTypes['PAYA_MONTHLY_02']?.id },
    create: {
      id: 'seed-equipment-walkin',
      restaurantId: restaurant.id,
      sectionId: kitchen.id,
      categoryId: categories.REFRIGERATION.id,
      typeId: equipmentTypes['PAYA_MONTHLY_02']?.id, // Walk In Cold Room
      name: 'Walk-in Freezer',
      assetTag: `PAYA-${nanoid()}`,
      riskLevel: 'GREEN',
      registeredById: technician.id,
    },
  });
  await prisma.equipment.upsert({
    where: { id: 'seed-equipment-hood' },
    update: { typeId: equipmentTypes['PAYA_MONTHLY_15']?.id },
    create: {
      id: 'seed-equipment-hood',
      restaurantId: restaurant.id,
      sectionId: kitchen.id,
      categoryId: categories.EXTRACTION.id,
      typeId: equipmentTypes['PAYA_MONTHLY_15']?.id, // Kitchen Hood and Extraction System
      name: 'Hood Fan #1',
      assetTag: `PAYA-${nanoid()}`,
      riskLevel: 'YELLOW',
      registeredById: technician.id,
    },
  });

  console.log(`  Engineer   engineer@paya.local / ChangeMe123!`);
  console.log(`  Technician tech@paya.local / ChangeMe123!`);
  console.log(`  Manager    manager@bambam.example / ChangeMe123!`);
}

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  // Demo data (fake restaurant, fake users, fake equipment) is dev-only by default — it would
  // be actively wrong to have it appear in a real deployment. Opt in/out explicitly with
  // SEED_DEMO_DATA=true|false to override either direction.
  const seedDemo = (process.env.SEED_DEMO_DATA ?? (isProduction ? 'false' : 'true')) === 'true';

  console.log('Seeding roles & equipment categories...');
  const roles = await upsertRoles();
  const categories = await upsertCategories();

  console.log('Seeding preventive-maintenance checklists (Docs/PM)...');
  const equipmentTypes = await seedMaintenancePlans(categories);
  console.log(`  ${Object.keys(equipmentTypes).length} checklist templates seeded.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@paya.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (isProduction && !adminPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD must be set explicitly when NODE_ENV=production — refusing to create the ' +
        'first admin account with a guessable default password.',
    );
  }

  console.log(`Seeding admin user (${adminEmail})...`);
  await upsertUser(adminEmail, adminPassword ?? 'ChangeMe123!', 'PAYA Admin', [roles.ADMIN.id]);

  if (seedDemo) {
    await seedDemoData(categories, equipmentTypes, roles);
  } else {
    console.log('Skipping demo data (SEED_DEMO_DATA=false or NODE_ENV=production).');
  }

  console.log('\nSeed complete. Sign in with:');
  console.log(`  Admin      ${adminEmail} / ${adminPassword ?? 'ChangeMe123!'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
