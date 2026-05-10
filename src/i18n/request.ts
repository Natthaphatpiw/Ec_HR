import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value as Locale | undefined;
  const locale: Locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
