"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const CLOCKABLE_ROLES = new Set(["sri_lankan_staff", "manager"]);

function fail(message) {
  return { ok: false, message };
}

function ok() {
  return { ok: true };
}

export async function employeeSignIn(_prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return fail("Please enter your email and password.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    return fail("Invalid email or password.");
  }

  const userId = data.user.id;

  const driver = await prisma.driver.findUnique({
    where: { userId },
    select: { id: true, jobRole: true, status: true },
  });

  if (!driver) {
    await supabase.auth.signOut();
    return fail(
      "This sign-in is for office staff only. If you're an admin, use the admin sign-in page."
    );
  }

  if (driver.status !== "APPROVED") {
    await supabase.auth.signOut();
    return fail("Your account is not active. Please contact an admin.");
  }

  if (!CLOCKABLE_ROLES.has(driver.jobRole)) {
    await supabase.auth.signOut();
    return fail(
      "This sign-in is for office staff. Your role does not have clock access."
    );
  }

  revalidatePath("/", "layout");
  redirect("/clock");
}

export async function employeeSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
