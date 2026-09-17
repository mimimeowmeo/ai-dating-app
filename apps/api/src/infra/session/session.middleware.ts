import { RedisStore } from "connect-redis";
import type { RequestHandler } from "express";
import session from "express-session";
import type { Env } from "../../config/env.js";
import type { RedisClient } from "../redis/redis.module.js";

export function sessionCookieName(secure: boolean): string {
  return secure ? "__Host-sid" : "sid";
}

export function createSessionMiddleware(env: Env, redis: RedisClient): RequestHandler {
  return session({
    store: new RedisStore({ client: redis, prefix: "heartlink:sess:" }),
    name: sessionCookieName(env.COOKIE_SECURE),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "strict",
      path: "/",
      maxAge: env.SESSION_TTL_SECONDS * 1000,
    },
  });
}
