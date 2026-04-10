import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { admin, bearer, openAPI, organization } from 'better-auth/plugins';
import { prisma } from './db';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  basePath: '/auth',
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins: ['*'],

  advanced: {
    disableOriginCheck: true,
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },

  plugins: [
    admin(),
    bearer(),
    openAPI(),
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      membershipLimit: 50,
      creatorRole: 'owner',
      async sendInvitationEmail(data) {
        console.log(
          `[Org] Invitation to ${data.email} for org ${data.organization.name}`,
        );
      },
    }),
  ],
});
