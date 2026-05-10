"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, type Locale } from "./config";

export async function setLocale(locale: Locale, path = "/") {
  if (!locales.includes(locale)) return;
  const store = await cookies();
  store.set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  revalidatePath(path);
}
