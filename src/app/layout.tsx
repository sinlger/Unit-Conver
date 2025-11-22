import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import BreadcrumbClient from "@/components/navigation/BreadcrumbClient";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "单位转换器 | Unit Converter",
    template: "%s | 单位转换器"  // 子页面标题模板
  },
  description: "专业的单位转换工具，支持长度、面积、体积、质量、温度、压力、功率、速度、频率、电流、电压、电阻、能量、照度、角度、时间、数字存储、流量等多种物理量单位转换。",
  keywords: ["单位转换", "长度转换", "面积转换", "体积转换", "质量转换", "温度转换", "压力转换", "功率转换", "速度转换", "频率转换", "电流转换", "电压转换", "电阻转换", "能量转换", "照度转换", "角度转换", "时间转换", "数字存储转换", "流量转换"],
  authors: [{ name: "Unit Converter Team" }],
  robots: "index, follow",
  openGraph: {
    title: "单位转换器",
    description: "专业的单位转换工具，支持长度、面积、体积、质量、温度、压力、功率、速度、频率、电流、电压、电阻、能量、照度、角度、时间、数字存储、流量等多种物理量单位转换。",
    type: "website",
    locale: "zh_CN",
    siteName: "单位转换器",
  },
  twitter: {
    card: "summary_large_image",
    title: "单位转换器",
    description: "专业的单位转换工具，支持长度、面积、体积、质量、温度、压力、功率、速度、频率、电流、电压、电阻、能量、照度、角度、时间、数字存储、流量等多种物理量单位转换。",
  },
};



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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh flex flex-col`}>
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-6 pt-4">
            <BreadcrumbClient />
          </div>
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
