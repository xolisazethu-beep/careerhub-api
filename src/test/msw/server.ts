import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// A single MSW server shared across the suite. Started/stopped and reset in
// src/test/setup.ts (listen → resetHandlers after each test → close).
export const server = setupServer(...handlers);
