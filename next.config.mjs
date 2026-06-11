/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // firebase-admin 등 서버 전용 패키지는 클라이언트 번들에 포함되지 않도록 외부화
    serverComponentsExternalPackages: ["firebase-admin"],
    // 서버 액션 바디 크기 (스캔 PDF 업로드 대비)
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
