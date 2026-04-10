import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { auth } from '../lib/auth';
import { prisma } from '../lib/db';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  async onApplicationBootstrap() {
    const adminEmail = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'Admin user credentials are not set. Skipping admin user creation.',
      );
      return;
    }

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingAdmin) {
      this.logger.log('Admin user already exists. Skipping creation.');
      return;
    }

    try {
      await auth.api.createUser({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: 'Admin',
          role: 'admin',
        },
      });
      this.logger.log('Admin user created successfully.');
    } catch (error) {
      this.logger.error('Error creating admin user:', error);
    }
  }
}
