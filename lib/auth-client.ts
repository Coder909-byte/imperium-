"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL — defaults to the current origin, correct for same-origin
// requests from the browser to /api/auth/*.
export const authClient = createAuthClient();
