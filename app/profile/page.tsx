import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { ProfileView } from "@/app/_components/shell/ProfileView";
import { LogoutButton } from "./LogoutButton";
import { profileRecord } from "@/lib/quiz/profileData";

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

  return <ProfileView email={session.user.email} logout={<LogoutButton />} record={await profileRecord(session.user.id, profileRow)} />;
}
