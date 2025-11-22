import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  pageExtensions: ["ts", "tsx", "mdx"],
  // ISR配置 - 使用Next.js默认的服务器渲染模式
  images: {
    // 图片优化在服务器模式下可用
  },
};

export default withMDX(nextConfig);
