import { z } from "zod";

/** Convite de consultor (Documentação/02 › Fluxo de convite). O papel é sempre consultor. */
export const esquemaConvite = z.object({
  full_name: z.string().trim().min(2, "nome").max(120, "nome"),
  email: z.string().trim().toLowerCase().email("email"),
});

export type Convite = { email: string; full_name: string | null; created_at: string };
export type Membro = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "consultant";
  active: boolean;
  created_at: string;
};
