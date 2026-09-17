import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { UsersModule } from "../users/index.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { CsrfGuard } from "./csrf.guard.js";
import { LoginLockout } from "./login-lockout.js";
import { MeController } from "./me.controller.js";
import { PasswordHasher } from "./password-hasher.js";
import { SessionAuthGuard } from "./session-auth.guard.js";

@Module({
  imports: [UsersModule],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    PasswordHasher,
    LoginLockout,
    SessionAuthGuard,
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [SessionAuthGuard],
})
export class AuthModule {}
