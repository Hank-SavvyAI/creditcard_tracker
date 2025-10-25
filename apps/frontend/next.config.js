/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages 部署：使用 @cloudflare/next-on-pages
  // 不需要 output: 'export'，因為我們使用動態路由

  images: {
    unoptimized: true,
  },

  // 強制使用 npm
  experimental: {
    swcPlugins: [],
  },

  // 開發環境和生產環境都使用標準 Next.js 模式
  // Cloudflare Pages 會通過 @cloudflare/next-on-pages 自動適配
}

module.exports = nextConfig
