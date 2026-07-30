"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Only allow relative paths under /admin/ so `next` can't be used to bounce the
// user to an external site (e.g. "//evil.com/admin" passes a naive startsWith).
function safeNext(next) {
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//") || next.includes("\\")) return "/admin";
  return next;
}

export async function signIn(_prev, formData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    return { ok: false, message: "Invalid email or password." };
  }

  // Employee accounts are linked to a Driver row; admins are not. Reject staff
  // here so they never obtain an admin session.
  const driver = await prisma.driver.findUnique({
    where: { userId: data.user.id },
    select: { id: true },
  });

  if (driver) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message:
        "This sign-in is for admins only. Staff should use the staff sign-in page.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
