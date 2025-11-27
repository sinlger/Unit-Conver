import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { StructuredData } from "@/components/structured-data/StructuredData";
import { 
  createOrganizationSchema, 
  createWebsiteSchema 
} from "@/components/structured-data/StructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});





export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 组织和网站结构化数据
  const organizationSchema = createOrganizationSchema();
  const websiteSchema = createWebsiteSchema();
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationSchema, websiteSchema]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData data={jsonLd} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh flex flex-col bg-background text-foreground`}>
        <ThemeProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
