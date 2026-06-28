/**
 * Auth.js v5 route handler (Assignment 2.3). Auth.js owns every endpoint under
 * /api/auth/* (signin, signout, session, callback/credentials, csrf, …); we just
 * re-export the GET/POST handlers it generated in src/auth.ts.
 *
 * The project's older custom routes (/api/auth/login, /api/auth/signup) keep
 * working because their explicit static segments take routing precedence over
 * this catch-all.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
