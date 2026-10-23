import type { Metadata } from "next";
import { AuthPage } from "@/app/_components/shell/AuthPage";

export const metadata: Metadata = { title: "Log in — Imperium" };

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
