import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Ignora arquivos estáticos, imagens e os SVGs da marca.
  matcher: ["/((?!_next/static|_next/image|icon.svg|marca/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
