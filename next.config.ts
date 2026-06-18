import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No bloquear el deploy por warnings de ESLint (los tipos sí se siguen comprobando).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
