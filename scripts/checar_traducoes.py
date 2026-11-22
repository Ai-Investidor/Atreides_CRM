"""Confere se toda chamada de tradução (t("...")) do app existe e é texto nos dois idiomas.

Uso: python3 scripts/checar_traducoes.py        (na raiz do workspace)
Lê app/src/**/*.tsx e app/messages/{pt-BR,en}.json. Saída: chaves ausentes ou que apontam
para um grupo (objeto) em vez de um texto, e o total.
"""
import json
import pathlib
import re
import sys

raiz = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / "app"
locs = {l: json.load(open(raiz / f"messages/{l}.json")) for l in ["pt-BR", "en"]}


def get(d, caminho):
    for p in caminho.split("."):
        if not isinstance(d, dict) or p not in d:
            return None
        d = d[p]
    return d


decl = re.compile(r'(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]*)"\s*\)')
decl_objeto = re.compile(r'(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?getTranslations\(\s*\{[^}]*namespace:\s*"([^"]*)"[^}]*\}\s*\)')
decl_pa = re.compile(r"const\s*\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(\[([^;]*?)\]\)", re.S)

problemas = set()
for f in (raiz / "src").rglob("*.tsx"):
    s = f.read_text()
    eventos = [(m.start(), m.group(1), m.group(2)) for m in decl.finditer(s)]
    eventos += [(m.start(), m.group(1), m.group(2)) for m in decl_objeto.finditer(s)]
    for m in decl_pa.finditer(s):
        nomes = [n.strip() for n in m.group(1).split(",")]
        partes = re.split(r",(?![^()]*\))", m.group(2))
        for nome, parte in zip(nomes, partes):
            mm = re.search(r'getTranslations\(\s*"([^"]*)"\s*\)', parte)
            if mm and re.fullmatch(r"\w+", nome):
                eventos.append((m.start(), nome, mm.group(1)))
    eventos.sort()
    for var in {e[1] for e in eventos}:
        decls = [e for e in eventos if e[1] == var]
        for chamada in re.finditer(r"(?<![\w.])" + var + r'\(\s*"([\w.]+)"', s):
            anteriores = [e for e in decls if e[0] < chamada.start()]
            if not anteriores:
                continue
            base = anteriores[-1][2]
            chave = f"{base}.{chamada.group(1)}" if base else chamada.group(1)
            for l, d in locs.items():
                v = get(d, chave)
                if not isinstance(v, str):
                    problemas.add((str(f.relative_to(raiz)), l, chave, "ausente" if v is None else "objeto"))

for p in sorted(problemas):
    print(*p)
print("total:", len(problemas))
sys.exit(1 if problemas else 0)
