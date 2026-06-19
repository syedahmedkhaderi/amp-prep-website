"use server";

import { redirect } from "next/navigation";
import { signUp, signIn, setSessionCookie, clearSessionCookie } from "@/lib/auth";

export type AuthResult = { error: string } | undefined;

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  try {
    const user = await signUp(email, password, fullName);
    await setSessionCookie(user.id);
  } catch (e: any) {
    return { error: e.message };
  }
  redirect("/dashboard");
}

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const user = await signIn(email, password);
    await setSessionCookie(user.id);
  } catch (e: any) {
    return { error: e.message };
  }
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
