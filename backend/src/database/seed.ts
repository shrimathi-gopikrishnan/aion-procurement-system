import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';

// Resolve the path to the data directory
const dbPath = path.resolve(__dirname, '../../data/aion.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const AppDataSource = new DataSource({
  type: 'sqljs',
  location: dbPath,
  autoSave: true,
  synchronize: true,
  entities: [path.resolve(__dirname, './entities/*.entity.{ts,js}')],
  logging: false,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('✓ Database connected');

  const hash = async (p: string) => bcrypt.hash(p, 10);

  // ─── Users ───────────────────────────────────────────────────────────────
  const userRepo = AppDataSource.getRepository('users');
  const existingUsers = await userRepo.count();
  if (!existingUsers) {
    const users = [
      { name: 'Admin User', email: 'admin@aion.com', role: 'admin', passwordHash: await hash('password123') },
      { name: 'John Operator', email: 'operator@aion.com', role: 'operator', passwordHash: await hash('password123') },
      { name: 'Sarah Supervisor', email: 'supervisor@aion.com', role: 'supervisor', passwordHash: await hash('password123') },
      { name: 'Mike Procurement', email: 'procurement@aion.com', role: 'procurement_manager', passwordHash: await hash('password123') },
      { name: 'Lisa Warehouse', email: 'warehouse@aion.com', role: 'warehouse', passwordHash: await hash('password123') },
      { name: 'Tom Finance', email: 'finance@aion.com', role: 'finance', passwordHash: await hash('password123') },
    ];
    for (const u of users) await userRepo.save(userRepo.create({ ...u, isActive: true }));
    console.log(`✓ Created ${users.length} users`);
  } else {
    console.log('  Users already exist, skipping');
  }

  // ─── Components ──────────────────────────────────────────────────────────
  const compRepo = AppDataSource.getRepository('components');
  const existingComps = await compRepo.count();
  let components: any[] = [];
  if (!existingComps) {
    const compData = [
      { name: 'Motor Bearing', description: 'Precision ball bearing for industrial motors', category: 'Mechanical', partNumber: 'MB-6205-2RS', isCritical: true },
      { name: 'Hydraulic Pump', description: 'Variable displacement axial piston pump', category: 'Hydraulic', partNumber: 'HP-A10V045', isCritical: true },
      { name: 'Conveyor Belt', description: 'Heavy-duty rubber conveyor belt (2m x 0.5m)', category: 'Mechanical', partNumber: 'CB-HVY-2050', isCritical: false },
      { name: 'Pressure Relief Valve', description: 'Hydraulic pressure relief valve, 350 bar', category: 'Hydraulic', partNumber: 'PRV-350-G12', isCritical: true },
      { name: 'Gear Assembly', description: 'Helical gear assembly for conveyor drive', category: 'Mechanical', partNumber: 'GA-HLCL-40', isCritical: true },
      { name: 'Shaft Seal', description: 'Rotating shaft seal, oil resistant', category: 'Seals', partNumber: 'SS-ORS-55x80', isCritical: false },
      { name: 'Control Valve', description: 'Proportional hydraulic control valve', category: 'Hydraulic', partNumber: 'CV-PROP-NG10', isCritical: true },
      { name: 'Drive Belt', description: 'V-belt for auxiliary drive system', category: 'Mechanical', partNumber: 'DB-SPZ-1180', isCritical: false },
      { name: 'Temperature Sensor', description: 'PT100 temperature sensor, -50 to 300°C', category: 'Instrumentation', partNumber: 'TS-PT100-300', isCritical: false },
      { name: 'Hydraulic Filter', description: 'Return line filter, 10 micron', category: 'Hydraulic', partNumber: 'HF-RLF-10M', isCritical: false },
    ];
    for (const c of compData) components.push(await compRepo.save(compRepo.create(c)));
    console.log(`✓ Created ${components.length} components`);
  } else {
    components = await compRepo.find();
    console.log('  Components already exist, skipping');
  }

  // ─── Inventory ───────────────────────────────────────────────────────────
  const invRepo = AppDataSource.getRepository('inventory');
  const existingInv = await invRepo.count();
  if (!existingInv && components.length) {
    const stockLevels = [12, 3, 8, 15, 5, 25, 4, 20, 30, 18];
    for (let i = 0; i < components.length; i++) {
      await invRepo.save(invRepo.create({
        componentId: components[i].id,
        quantityOnHand: stockLevels[i],
        quantityReserved: 0,
        location: `Rack-${String.fromCharCode(65 + (i % 5))}-${(i % 10) + 1}`,
        unitOfMeasure: 'pcs',
        unitCost: [45.5, 1250, 180, 320, 875, 15.8, 950, 28.5, 95, 42][i],
        reorderPoint: [5, 2, 3, 5, 2, 10, 2, 8, 10, 5][i],
      }));
    }
    console.log(`✓ Created inventory for ${components.length} components`);
  }

  // ─── Vendors ─────────────────────────────────────────────────────────────
  const vendorRepo = AppDataSource.getRepository('vendors');
  const existingVendors = await vendorRepo.count();
  let vendors: any[] = [];
  if (!existingVendors) {
    const vendorData = [
      { name: 'TechParts Industrial', code: 'TPI', contactEmail: 'sales@techparts.com', rating: 4.8, reliabilityScore: 0.96, onTimeDeliveryRate: 0.94, status: 'active', isPreferred: true, paymentTerms: 'Net 30' },
      { name: 'GlobalSupply Co.', code: 'GSC', contactEmail: 'orders@globalsupply.com', rating: 4.2, reliabilityScore: 0.88, onTimeDeliveryRate: 0.85, status: 'active', isPreferred: false, paymentTerms: 'Net 45' },
      { name: 'FastTrack Bearings', code: 'FTB', contactEmail: 'info@fasttrack.com', rating: 4.5, reliabilityScore: 0.92, onTimeDeliveryRate: 0.90, status: 'active', isPreferred: false, paymentTerms: 'Net 30' },
      { name: 'PrecisionMech Ltd', code: 'PML', contactEmail: 'supply@precisionmech.com', rating: 3.9, reliabilityScore: 0.82, onTimeDeliveryRate: 0.78, status: 'active', isPreferred: false, paymentTerms: 'Net 60' },
    ];
    for (const v of vendorData) vendors.push(await vendorRepo.save(vendorRepo.create(v)));
    console.log(`✓ Created ${vendors.length} vendors`);

    // Vendor items
    const viRepo = AppDataSource.getRepository('vendor_items');
    if (components.length && vendors.length) {
      const viData = [
        // TechParts carries everything
        { vendorId: vendors[0].id, componentId: components[0].id, price: 42.0, deliveryDays: 3, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[1].id, price: 1190.0, deliveryDays: 7, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[2].id, price: 165.0, deliveryDays: 5, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[3].id, price: 305.0, deliveryDays: 4, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[4].id, price: 840.0, deliveryDays: 10, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[5].id, price: 14.5, deliveryDays: 2, isAvailable: true },
        { vendorId: vendors[0].id, componentId: components[6].id, price: 920.0, deliveryDays: 8, isAvailable: true },
        // GlobalSupply
        { vendorId: vendors[1].id, componentId: components[0].id, price: 39.5, deliveryDays: 5, isAvailable: true },
        { vendorId: vendors[1].id, componentId: components[1].id, price: 1280.0, deliveryDays: 14, isAvailable: true },
        { vendorId: vendors[1].id, componentId: components[3].id, price: 295.0, deliveryDays: 7, isAvailable: true },
        { vendorId: vendors[1].id, componentId: components[7].id, price: 25.0, deliveryDays: 3, isAvailable: true },
        { vendorId: vendors[1].id, componentId: components[8].id, price: 88.0, deliveryDays: 5, isAvailable: true },
        { vendorId: vendors[1].id, componentId: components[9].id, price: 38.0, deliveryDays: 3, isAvailable: true },
        // FastTrack specializes in bearings
        { vendorId: vendors[2].id, componentId: components[0].id, price: 44.0, deliveryDays: 2, isAvailable: true },
        { vendorId: vendors[2].id, componentId: components[4].id, price: 855.0, deliveryDays: 6, isAvailable: true },
        { vendorId: vendors[2].id, componentId: components[5].id, price: 13.9, deliveryDays: 2, isAvailable: true },
        // PrecisionMech
        { vendorId: vendors[3].id, componentId: components[2].id, price: 170.0, deliveryDays: 10, isAvailable: true },
        { vendorId: vendors[3].id, componentId: components[6].id, price: 899.0, deliveryDays: 14, isAvailable: true },
        { vendorId: vendors[3].id, componentId: components[7].id, price: 24.5, deliveryDays: 5, isAvailable: true },
      ];
      for (const vi of viData) await viRepo.save(viRepo.create(vi));
      console.log(`✓ Created ${viData.length} vendor-component mappings`);
    }
  } else {
    vendors = await vendorRepo.find();
    console.log('  Vendors already exist, skipping');
  }

  await AppDataSource.destroy();
  console.log('\n🚀 Seed complete! Default credentials:');
  console.log('   admin@aion.com      / password123');
  console.log('   operator@aion.com   / password123');
  console.log('   supervisor@aion.com / password123');
  console.log('   procurement@aion.com/ password123');
  console.log('   warehouse@aion.com  / password123');
  console.log('   finance@aion.com    / password123');
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
