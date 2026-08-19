import { AppDataSource } from '../data-source';
import { SuperAdmin } from '../../../modules/super-admin/src/entities/super-admin.entity';
import { SuperPermission } from '../../../modules/super-admin/src/entities/super-permission.entity';
import { SuperRole } from '../../../modules/super-admin/src/entities/super-role.entity';
import { SuperRolePermission } from '../../../modules/super-admin/src/entities/super-role-permission.entity';
import { Permission } from '../../../modules/clients/src/entities/permission.entity';
import { ClientFeature } from '../../../modules/clients/src/entities/client-feature.entity';
import { Feature } from '../../../modules/vendors/src/entities/feature.entity';
import { Amenity } from '../../../modules/stations/src/entities/amenity.entity';
import { Staff } from '../../../modules/clients/src/entities/staff.entity';
import { ClientDetails } from '../../../modules/clients/src/entities/client-details.entity';
import { PrefixConfig } from '../../../modules/clients/src/entities/prefix-config.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Initializing database connection for seeding...');
  await AppDataSource.initialize();
  console.log('✅ Connected to MySQL database via TypeORM.');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Seed Super Permissions (from 20260305043902-super-admin.js)
    console.log('📦 Seeding Super Permissions...');
    const superPermissions = [
      { name: 'ClientView', description: 'Allows viewing the list and details of all clients' },
      { name: 'ClientCreate', description: 'Allows creating new clients in the system' },
      { name: 'ClientUpdate', description: 'Allows updating existing client information' },
      { name: 'EmployeeView', description: 'Allows viewing employee details and employee list' },
      { name: 'EmployeeCreate', description: 'Allows adding new employees' },
      { name: 'EmployeeUpdate', description: 'Allows updating employee information' },
      { name: 'RoleView', description: 'Allows viewing roles and their permissions' },
      { name: 'RoleCreate', description: 'Allows creating new roles' },
      { name: 'RoleUpdate', description: 'Allows updating role permissions' },
      { name: 'DepartmentView', description: 'Allows viewing department information' },
      { name: 'DepartmentCreate', description: 'Allows creating new departments' },
      { name: 'DepartmentUpdate', description: 'Allows updating department details' },
    ];

    const superPermRepo = AppDataSource.getRepository(SuperPermission);
    const createdSuperPerms: SuperPermission[] = [];

    for (const item of superPermissions) {
      let perm = await superPermRepo.findOne({ where: { name: item.name } });
      if (!perm) {
        perm = await superPermRepo.save(superPermRepo.create(item));
      }
      createdSuperPerms.push(perm);
    }

    // 2. Seed Super Admin Role (from 20260305043902-super-admin.js)
    console.log('👑 Seeding Super Admin Role...');
    const superRoleRepo = AppDataSource.getRepository(SuperRole);
    let superRole = await superRoleRepo.findOne({ where: { name: 'SuperAdmin' } });
    if (!superRole) {
      superRole = await superRoleRepo.save(superRoleRepo.create({ name: 'SuperAdmin' }));
    }

    // 3. Map Super Role Permissions
    const superRolePermRepo = AppDataSource.getRepository(SuperRolePermission);
    for (const perm of createdSuperPerms) {
      const exists = await superRolePermRepo.findOne({ where: { superRoleId: superRole.id, superPermissionId: perm.id } });
      if (!exists) {
        await superRolePermRepo.save(superRolePermRepo.create({ superRoleId: superRole.id, superPermissionId: perm.id }));
      }
    }

    // 4. Seed Super Admin Accounts (from 20260305043902-super-admin.js)
    console.log('👤 Seeding Super Admin Accounts...');
    const superAdminRepo = AppDataSource.getRepository(SuperAdmin);
    const superAdminsToSeed = [
      { name: 'Super Admin', email: 'mahendar@spackdigi.com', phone: '', pass: 'password', empId: 'EMP-0001' },
      { name: 'Nexin Super Admin', email: 'superadmin@nexinev.com', phone: '+919999999999', pass: 'SuperAdmin@12345', empId: 'SA00001' },
    ];

    for (const sa of superAdminsToSeed) {
      let admin = await superAdminRepo.findOne({ where: { email: sa.email } });
      if (!admin) {
        const hashedPassword = await bcrypt.hash(sa.pass, 10);
        admin = await superAdminRepo.save(
          superAdminRepo.create({
            name: sa.name,
            email: sa.email,
            phone: sa.phone,
            password: hashedPassword,
            isActive: true,
            empId: sa.empId,
            roleId: superRole.id,
            twoFactorAuth: false,
          }),
        );
        console.log(`  ✅ Super Admin Created: email=${sa.email}`);
      }
    }

    // 5. Seed Client & Vendor System Permissions (from 20240925071541-permission_seed.js & 20250124063018-VendorPermission.js)
    console.log('🔒 Seeding System Staff & Vendor Permissions...');
    const permissionRepo = AppDataSource.getRepository(Permission);
    const allPermissions = [

      // 🔹 Core Management
      { name: 'Software_Management', type: 'staff' },
      { name: 'AMC_Management', type: 'staff' },
      { name: 'Team_Management', type: 'staff' },
      { name: 'Team_Login_History_View', type: 'staff' },

      // 🔹 CPO Management
      { name: 'CPO_View', type: 'staff' },
      { name: 'CPO_Onboard', type: 'staff' },
      { name: 'CPO_Edit', type: 'staff' },
      { name: 'CPO_Manage_Tariff', type: 'staff' },
      { name: 'CPO_Settlement_Management', type: 'staff' },

      // 🔹 Fleet Management
      { name: 'Fleet_View', type: 'staff' },
      { name: 'Fleet_Onboard', type: 'staff' },
      { name: 'Fleet_Edit', type: 'staff' },
      { name: 'Fleet_Manage', type: 'staff' },

      // 🔹 User Management
      { name: 'User_View', type: 'staff' },
      { name: 'User_Manage_Wallet', type: 'staff' },
      { name: 'User_Manage_RFID', type: 'staff' },

      // 🔹 Station Management
      { name: 'Station_View', type: 'staff' },
      { name: 'Station_Onboard', type: 'staff' },
      { name: 'Station_Edit', type: 'staff' },

      // 🔹 Charger Management
      { name: 'Charger_View', type: 'staff' },
      { name: 'Charger_Onboard', type: 'staff' },
      { name: 'Charger_Edit', type: 'staff' },
      { name: 'Charger_Manage_Config', type: 'staff' },
      { name: 'Charger_Manage_Remote_Controller', type: 'staff' },

      // 🔹 RFID
      { name: 'RFID_View', type: 'staff' },

      // 🔹 Session Management
      { name: 'Session_View', type: 'staff' },
      { name: 'Session_Download', type: 'staff' },

      // 🔹 OCPI / EMSP
      { name: 'OCPI_EMSP_Management', type: 'staff' },
      { name: 'OCPI_CPO_Management', type: 'staff' },
      { name: 'Nexin_Roaming_Management', type: 'staff' },

      // 🔹 Transactions
      { name: 'Payment_Transaction_View', type: 'staff' },
      { name: 'Wallet_Transaction_View', type: 'staff' },

      // 🔹 Coupons
      { name: 'Coupon_View', type: 'staff' },
      { name: 'Coupon_Create', type: 'staff' },
      { name: 'Coupon_Edit', type: 'staff' },

      // 🔹 Notification
      { name: 'Notification_Management', type: 'staff' },

      // 🔹 Analytics
      { name: 'Charger_Analytics_View', type: 'staff' },
      { name: 'Revenue_Analytics_View', type: 'staff' },

      // 🔹 Vehicle
      { name: 'Vehicle_Management', type: 'staff' },

      // 🔹 QR for pay and charge operations
      // { name: 'Qr_Pay&Charge', type: 'staff' },

    ];

    for (const item of allPermissions) {
      const exists = await permissionRepo.findOne({ where: { name: item.name, type: item.type } });
      if (!exists) {
        await permissionRepo.save(permissionRepo.create(item));
      }
    }

    // 6. Seed Vendor Features (from 20241008051945-VendorTypeUserType.js)
    console.log('🔌 Seeding Vendor Features...');
    const vendorFeatureRepo = AppDataSource.getRepository(Feature);
    const vendorFeatures = [
      { name: 'RFID' },
      { name: 'Auto Charge' },
      { name: 'Tariff Management' },
      { name: 'AMC' },
      { name: 'Charger Logs' },
      { name: 'Analytics' },
      { name: 'Fleet' },
      { name: 'Settlement' },
    ];

    for (const vf of vendorFeatures) {
      const exists = await vendorFeatureRepo.findOne({ where: { name: vf.name } });
      if (!exists) {
        await vendorFeatureRepo.save(vendorFeatureRepo.create(vf));
      }
    }

    // 7. Seed Client Features (from 20260305122932-client-feature.js)
    console.log('⚡ Seeding Enterprise Client Features...');
    const clientFeatureRepo = AppDataSource.getRepository(ClientFeature);
    const clientFeatures = [
      { name: 'Fleet Module', description: 'Manage fleet vehicles, drivers, and charging operations.' },
      { name: 'Dynamic Tariff', description: 'Configure flexible charging tariffs based on time or usage.' },
      { name: 'OCPI Emsp Integration', description: 'Enable roaming and interoperability via OCPI protocol.' },
      { name: 'CPO Mobile App', description: 'Mobile application for CPO operations and monitoring.' },
      { name: 'CPO AMC Management', description: 'Manage charger maintenance contracts and service schedules.' },
      { name: 'Push Notification', description: 'Send real-time alerts and notifications to users.' },
      { name: 'Coupons', description: 'Create and manage discount coupons for charging sessions.' },
      { name: 'RFID Management', description: 'Manage RFID cards for user authentication and charging.' },
      { name: 'Employee Management', description: 'Manage employees, roles, and access permissions.' },
      { name: 'Analytics Dashboard', description: 'View insights on revenue, usage, and charging activity.' },
      { name: 'OCPP 1.6 / 2.0 Support', description: 'Support communication with EV chargers using OCPP protocol.' },
      { name: 'OCPI CPO Integration', description: 'Enable OCPI protocol for CPO operations and roaming.' },
      { name: 'Nexin Roaming Export', description: 'Share your chargers with other Nexin roaming clients.' },
      { name: 'Nexin Roaming Import', description: 'Access chargers shared by other Nexin roaming clients.' },
      { name: 'QR Pay & Charge', description: 'Generate and manage QR codes for pay and charge operations.' },
    ];

    for (const cf of clientFeatures) {
      const exists = await clientFeatureRepo.findOne({ where: { name: cf.name } });
      if (!exists) {
        await clientFeatureRepo.save(clientFeatureRepo.create(cf));
      }
    }

    // 8. Seed Amenities (from 20251124121735-amenity.js)
    console.log('☕ Seeding Station Amenities...');
    const amenityRepo = AppDataSource.getRepository(Amenity);
    const amenities = [
      'Wifi',
      'Restaurant',
      'ATM',
      'Hotel',
      'Restrooms',
      'Parking',
      'Retail shop',
      'Car Wash',
      'Play Zone',
      'Shopping Mall',
      'Lounge area',
      'Air for Tyres',
    ];

    for (const name of amenities) {
      const exists = await amenityRepo.findOne({ where: { name } });
      if (!exists) {
        await amenityRepo.save(amenityRepo.create({ name, status: 'Active' as any }));
      }
    }

    // // 9. Seed Default System Client (Tenant ID 1) & Prefix Configurations
    // console.log('🏢 Seeding Default Enterprise Client & Prefix Configuration...');
    // const staffRepo = AppDataSource.getRepository(Staff);
    // const clientDetailsRepo = AppDataSource.getRepository(ClientDetails);
    // const prefixRepo = AppDataSource.getRepository(PrefixConfig);

    // let defaultClient: Staff | null = await staffRepo.findOne({ where: { email: 'admin@nexinev.com' } });
    // if (!defaultClient) {
    //   const hashedClientPass = await bcrypt.hash('ClientAdmin@12345', 10);
    //   const createdStaff = (await staffRepo.save(
    //     staffRepo.create({
    //       first_name: 'Nexin',
    //       last_name: 'Enterprise Client',
    //       email: 'admin@nexinev.com',
    //       phone: '+919876543210',
    //       password: hashedClientPass,
    //       status: 'Active',
    //       clientId: 1,
    //     } as any),
    //   )) as unknown as Staff;
    //   defaultClient = createdStaff;

    //   await clientDetailsRepo.save(
    //     clientDetailsRepo.create({
    //       clientId: defaultClient.id,
    //       companyName: 'Nexin EV Mobility Services Pvt Ltd',
    //       brandName: 'Nexin Charge',
    //       contactEmail: 'admin@nexinev.com',
    //       contactPhone: '+919876543210',
    //       partyId: 'NEX',
    //       countryCode: 'IN',
    //       cpoUrl: 'https://cpo.nexinev.com',
    //     } as any),
    //   );

    //   await prefixRepo.save(
    //     prefixRepo.create({
    //       clientId: defaultClient.id,
    //       session: 'SES',
    //       coupon: 'CPN',
    //       wallet: 'WAL',
    //       cpo: 'CPO',
    //       station: 'STN',
    //       employee: 'EMP',
    //       fleet: 'FLT',
    //       user: 'USR',
    //       driver: 'DRV',
    //       vehicleGroup: 'VGP',
    //     }),
    //   );

    //   console.log(`✅ Default Enterprise Client Created: email=admin@nexinev.com, clientId=${defaultClient.id}`);
    // }

    await queryRunner.commitTransaction();
    console.log('🎉 Database seeding completed successfully with 100% legacy parity!');
  } catch (error) {
    console.error('❌ Seeding failed, rolling back transaction:', error);
    await queryRunner.rollbackTransaction();
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

void seed();
