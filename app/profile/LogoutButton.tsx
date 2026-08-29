"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-full border border-black/[.15] px-5 py-3 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-[#1a1a1a]"
    >
      Log out
    </button>
  );
}
