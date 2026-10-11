import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, admin as adminPlugin } from "better-auth/plugins";
import { defaultRoles } from "better-auth/plugins/admin/access";
import db from "@repo/database";
import { env } from "./env";
import { createAuthMiddleware } from "better-auth/api";
import { logger } from "@repo/logger";
import { FolderService } from "@repo/services/folder";

const folderService = new FolderService();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  appName: "Formyst",
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url, token }, request) => {
        // await sendVerificationEmail({
        //   user: { ...user, email: newEmail },
        //   url,
        // });
        logger.info(`[CHANGE EMAIL] User: ${user.email} → ${url}`);
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        // await sendDeleteAccountVerification({ user, url });
        logger.info(`[DELETE ACCOUNT] User: ${user.email} → ${url}`);
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // await sendPasswordResetEmail({ user, url });
      logger.info(`[RESET PASSWORD] User: ${user.email} → ${url}`);
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // await sendEmailVerificationEmail({ user, url });
      logger.info(`[EMAIL VERIFICATION] User: ${user.email} → ${url}`);
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    disableOriginCheck: true, // WARNING: DO NOT USE IN PRODUC
    // useSecureCookies: process.env.NODE_ENV === "production",
    // trustedOrigins: ["http://localhost:3000", "http://localhost:8000"],
  },
  plugins: [
    adminPlugin({
      defaultRole: "user",
      adminRoles: ["admin"],
      roles: { ...defaultRoles },
    }),
    openAPI(),
  ],
  database: drizzleAdapter(db, { provider: "pg" }),

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up")) {
        const user = ctx.context.newSession?.user ?? {
          name: ctx.body.name,
          email: ctx.body.email,
        };

        if (user != null) {
          // await sendWelcomeEmail({ user });
          logger.info(`[WELCOME EMAIL] User: ${user.email}`);
        }
      }
    }),
  },
  databaseHooks: {
    // user: {
    //   create: {
    //     after: async (userRecord) => {
    //       try {
    //         // Every user owns their workspace now, so seed the default
    //         // folders directly against the user id.
    //         await folderService.createDefaults(userRecord.id);
    //       } catch (err) {
    //         logger.error(`[DEFAULT FOLDERS FAILED] User: ${userRecord.email}`, err);
    //       }
    //     },
    //   },
    },
  // },
});

export type Session = typeof auth.$Infer.Session;
