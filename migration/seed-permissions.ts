import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rolePermissionsMap: Record<string, string[]> = {
  proprietor: [
    'manage_school_settings',
    'view_all_reports',
    'create_roles',
    'assign_roles',
    'manage_staff',
    'view_financials',
    'access_audit_logs',
    'assign_superadmin'
  ],
  principal: [
    'manage_classes',
    'manage_staff',
    'manage_students',
    'view_reports',
    'approve_fees',
    'assign_teachers',
    'schedule_exams',
    'create_announcements',
    'manage_timetables',
    'generate_reports',
    'update_school_calendar',
    'reset_passwords',
    'upload_documents',
  ],

  teacher: [
    'view_class_list',
    'mark_attendance',
    'grade_students',
    'view_timetable',
    'send_student_feedback',
    'create_assignments',
  ],
  student: [
    'view_grades',
    'view_timetable',
    'submit_assignments',
    'view_announcements',
    'download_documents',
  ],
  parent: [
    'view_child_grades',
    'view_child_attendance',
    'receive_announcements',
    'contact_teachers',
    'make_payments',
  ],
  librarian: [
    'manage_books',
    'issue_books',
    'return_books',
    'view_borrowed_books',
    'add_new_books',
    'update_book_status',
  ],
  bursar: [
    'manage_fees',
    'view_transactions',
    'generate_invoices',
    'record_payments',
    'manage_expenses',
  ],
  secretary: [
    'schedule_meetings',
    'receive_visitors',
    'manage_front_desk',
    'log_complaints',
    'update_school_notices',
  ],
  
  'non-academic': [
    'log_attendance',
    'access_timetable',
    'submit_requests',
    'update_maintenance_logs',
  ],
  vendor: [
    'submit_invoices',
    'track_payments',
    'receive_announcements',
  ],
};

async function seedPermissions() {
  try {
    // Step 1: Flatten all unique permissions
    const allPermissions = Array.from(
      new Set(Object.values(rolePermissionsMap).flat())
    );

    // Step 2: Insert permissions
    const insertedPermissions = await prisma.permission.createMany({
      data: allPermissions.map((action) => ({
        action,
        description: action.replace(/_/g, ' '),
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Inserted ${insertedPermissions.count} permissions.`);

    // Step 3: Fetch permissions and roles
    const permissions = await prisma.permission.findMany();
    const roles = await prisma.role.findMany();

    const permissionMap = new Map(
      permissions.map((p) => [p.action, p.id])
    );
    const roleMap = new Map(
      roles.map((r) => [r.name.toLowerCase(), r.id])
    );

    // Step 4: Create RolePermission entries
    const rolePermissionData: { roleId: string; permissionId: string }[] = [];

    for (const [roleName, actions] of Object.entries(rolePermissionsMap)) {
      const roleId = roleMap.get(roleName.toLowerCase());

      if (!roleId) {
        console.warn(`⚠️ Role '${roleName}' not found in DB. Skipping.`);
        continue;
      }

      for (const action of actions) {
        const permissionId = permissionMap.get(action);

        if (!permissionId) {
          console.warn(`⚠️ Permission '${action}' not found in DB. Skipping.`);
          continue;
        }

        rolePermissionData.push({
          roleId,
          permissionId,
        });
      }
    }

    // Step 5: Insert RolePermissions
    const insertedRolePermissions = await prisma.rolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    });

    console.log(`✅ Assigned ${insertedRolePermissions.count} role-permissions.`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedPermissions();
