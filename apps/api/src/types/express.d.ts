import type { UserRole, AccountStatus } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sessionId: string;
        user: {
          id: string;
          fullName: string;
          username: string;
          email: string;
          role: UserRole;
          accountStatus: AccountStatus;
        };
      };
    }
  }
}

export {};
