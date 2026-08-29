import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { LogoutButton } from "./LogoutButton";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [profileRow] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1);

  // The signup hook always inserts a profile row, so a missing one means
  // that hook failed to run — surface it rather than silently faking data.
  if (!profileRow) {
    throw new Error(
      `No profile row for user ${session.user.id}. The signup profile-creation hook should have created one.`,
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <dl className="flex flex-col gap-2 text-lg">
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Email</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Rank</dt>
          <dd>{profileRow.rank}</dd>
        </div>
      </dl>
      <LogoutButton />
    </main>
  );
}
