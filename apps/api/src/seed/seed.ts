import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../../.env') });

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { Role, TaskStatus, TaskCategory } from '@task-management/data';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'task_management',
    entities: [Organization, User, Task, AuditLog],
    synchronize: true,
    dropSchema: true,
  });

  await dataSource.initialize();
  console.log('Database connected. Seeding...');

  const orgRepo = dataSource.getRepository(Organization);
  const userRepo = dataSource.getRepository(User);
  const taskRepo = dataSource.getRepository(Task);

  // Create parent organization
  const parentOrg = await orgRepo.save(
    orgRepo.create({ name: 'TurboVets Corp' }),
  );

  // Create child organizations (2-level hierarchy)
  const childOrg1 = await orgRepo.save(
    orgRepo.create({ name: 'Engineering Dept', parentId: parentOrg.id }),
  );
  const childOrg2 = await orgRepo.save(
    orgRepo.create({ name: 'Marketing Dept', parentId: parentOrg.id }),
  );

  console.log('Organizations created.');

  // Hash password
  const password = await bcrypt.hash('password123', 12);

  // Create users with different roles
  const owner = await userRepo.save(
    userRepo.create({
      email: 'owner@turbovets.com',
      password,
      firstName: 'Alice',
      lastName: 'Owner',
      role: Role.OWNER,
      organizationId: parentOrg.id,
    }),
  );

  const admin = await userRepo.save(
    userRepo.create({
      email: 'admin@turbovets.com',
      password,
      firstName: 'Bob',
      lastName: 'Admin',
      role: Role.ADMIN,
      organizationId: childOrg1.id,
    }),
  );

  const viewer = await userRepo.save(
    userRepo.create({
      email: 'viewer@turbovets.com',
      password,
      firstName: 'Charlie',
      lastName: 'Viewer',
      role: Role.VIEWER,
      organizationId: childOrg1.id,
    }),
  );

  const admin2 = await userRepo.save(
    userRepo.create({
      email: 'admin2@turbovets.com',
      password,
      firstName: 'Diana',
      lastName: 'Marketing',
      role: Role.ADMIN,
      organizationId: childOrg2.id,
    }),
  );

  console.log('Users created.');

  // Create sample tasks
  const tasks = [
    {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.WORK,
      assigneeId: admin.id,
      organizationId: childOrg1.id,
      createdById: owner.id,
      position: 0,
    },
    {
      title: 'Design database schema',
      description: 'Create ERD and implement TypeORM entities',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      assigneeId: admin.id,
      organizationId: childOrg1.id,
      createdById: owner.id,
      position: 1,
    },
    {
      title: 'Implement authentication',
      description: 'JWT-based auth with login and token verification',
      status: TaskStatus.DONE,
      category: TaskCategory.WORK,
      assigneeId: viewer.id,
      organizationId: childOrg1.id,
      createdById: admin.id,
      position: 2,
    },
    {
      title: 'Create marketing landing page',
      description: 'Design and build the product landing page',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      assigneeId: admin2.id,
      organizationId: childOrg2.id,
      createdById: admin2.id,
      position: 0,
    },
    {
      title: 'Write blog post',
      description: 'Write a blog post about the new feature release',
      status: TaskStatus.IN_PROGRESS,
      category: TaskCategory.PERSONAL,
      assigneeId: admin2.id,
      organizationId: childOrg2.id,
      createdById: admin2.id,
      position: 1,
    },
    {
      title: 'Review pull requests',
      description: 'Review and merge pending PRs from the team',
      status: TaskStatus.TODO,
      category: TaskCategory.URGENT,
      assigneeId: owner.id,
      organizationId: parentOrg.id,
      createdById: owner.id,
      position: 0,
    },
    {
      title: 'Prepare quarterly report',
      description: 'Compile data for the Q1 quarterly business report',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      assigneeId: owner.id,
      organizationId: parentOrg.id,
      createdById: owner.id,
      position: 1,
    },
    {
      title: 'Update documentation',
      description: 'Update API documentation with new endpoints',
      status: TaskStatus.TODO,
      category: TaskCategory.OTHER,
      assigneeId: viewer.id,
      organizationId: childOrg1.id,
      createdById: admin.id,
      position: 3,
    },
  ];

  for (const taskData of tasks) {
    await taskRepo.save(taskRepo.create(taskData));
  }

  console.log('Tasks created.');
  console.log('\n--- Seed Complete ---');
  console.log('Login credentials (all use password: password123):');
  console.log(`  Owner:  owner@turbovets.com`);
  console.log(`  Admin:  admin@turbovets.com`);
  console.log(`  Viewer: viewer@turbovets.com`);
  console.log(`  Admin2: admin2@turbovets.com`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
