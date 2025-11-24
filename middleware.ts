import createMiddleware from "next-intl/middleware";

export const middleware = createMiddleware({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localePrefix: "always"
});

export default middleware;

export const config = {
  matcher: ["/", "/((?!api|_next|.*\\..*).*)"]
};
