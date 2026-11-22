import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Traduções carregadas de src/i18n/request.ts (PT-BR e EN, ver Documentação/12).
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // PDF dos relatórios gerado no servidor (Documentação/08).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Fontes e selo usados no PDF (lidos do disco no servidor).
  outputFileTracingIncludes: { "/**": ["./assets/pdf/**"] },
  // Hot reload (/_next/hmr) quando o dev server é aberto pelo túnel do ngrok.
  // O subdomínio gratuito muda a cada sessão; * cobre um rótulo (ex.: abc.ngrok-free.dev).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  turbopack: {
    rules: {
      // Tailwind CSS v4 processado pelo Turbopack.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
