// The Auth.js v5 catch-all route handler. This is the ONLY /api route the app
// keeps — every other data endpoint lives on the real CareerHub backend. It
// simply re-exports the GET/POST handlers Auth.js builds from the config in
// src/auth.ts, which powers sign-in, sign-out, session and CSRF.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
