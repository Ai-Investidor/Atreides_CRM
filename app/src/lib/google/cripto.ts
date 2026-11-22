import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Criptografia do token de atualização do Google (AES-256-GCM).
 * A chave (GOOGLE_TOKEN_KEY) só existe no servidor do Atreides: o banco guarda apenas o texto cifrado.
 */
function chave(): Buffer {
  const k = process.env.GOOGLE_TOKEN_KEY;
  if (!k) throw new Error("GOOGLE_TOKEN_KEY ausente");
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) throw new Error("GOOGLE_TOKEN_KEY precisa ter 32 bytes em base64");
  return b;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), dados.toString("base64")].join(".");
}

export function decifrar(cifra: string): string {
  const [versao, iv, tag, dados] = cifra.split(".");
  if (versao !== "v1" || !iv || !tag || !dados) throw new Error("Token em formato desconhecido");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}
