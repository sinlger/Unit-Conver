import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localePrefix: "never"
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
