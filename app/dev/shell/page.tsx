import { notFound } from "next/navigation";
import { ProfileView } from "@/app/_components/shell/ProfileView";
import { LogoutButton } from "@/app/profile/LogoutButton";

export default function ShellPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <aside className="bg-[#29251e] px-5 py-2 text-center text-xs text-[#f2ecdd]">Development profile preview · sample account · no database read or write</aside>
      <ProfileView email="reader@example.com" logout={<LogoutButton />} />
    </>
  );
}
