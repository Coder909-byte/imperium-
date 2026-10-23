"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("sign-out failed");
      router.push("/login");
      router.refresh();
    } catch {
      setError("Could not log out. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <button type="button" onClick={logout} disabled={pending} className="shell-button shell-button-outline">{pending ? "Logging out…" : "Log out"}</button>
      {error && <p role="alert" className="form-error max-w-xs">{error}</p>}
    </div>
  );
}
