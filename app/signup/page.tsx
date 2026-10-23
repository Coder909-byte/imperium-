import type { Metadata } from "next";
import { AuthPage } from "@/app/_components/shell/AuthPage";

export const metadata: Metadata = { title: "Sign up — Imperium" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
