import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    csrfToken: string;
    authenticatedAt: number;
  }
}
