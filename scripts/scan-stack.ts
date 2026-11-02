// Levanta a stack de todos os repositórios do Romulo (inclusive os privados)
// e salva só os totais em data/stack.json: nenhum nome de repositório sai daqui.
// Linguagens: o que o próprio GitHub mede no código (Linguist).
// Frameworks e ferramentas: package.json de cada projeto e arquivos de config.
// Roda só local, porque precisa do gh logado com acesso aos privados.
// Uso: node scripts/scan-stack.ts
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const OUT = new URL("../data/stack.json", import.meta.url);
const SELF = "romuloalcanfor"; // o próprio repositório do perfil não entra na conta

type Repo = {
  name: string;
  isPrivate: boolean;
  defaultBranchRef: { name: string } | null;
  languages: { edges: { size: number; node: { name: string; color: string } }[] };
};

// Dependência do package.json -> nome que aparece no painel.
const DEPS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-native": "React Native",
  expo: "Expo",
  "@capacitor/core": "Capacitor",
  vite: "Vite",
  tailwindcss: "Tailwind CSS",
  "@tailwindcss/vite": "Tailwind CSS",
  "@supabase/supabase-js": "Supabase",
  "@tanstack/react-query": "TanStack Query",
  "react-router-dom": "React Router",
  "react-router": "React Router",
  zod: "Zod",
  "framer-motion": "Framer Motion",
  motion: "Framer Motion",
  three: "Three.js",
  "@playwright/test": "Playwright",
  vitest: "Vitest",
  jest: "Jest",
  express: "Express",
  hono: "Hono",
  wrangler: "Cloudflare Workers",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  stripe: "Stripe",
  resend: "Resend",
  recharts: "Recharts",
  docx: "docx",
};

// Arquivo ou pasta no repositório -> ferramenta.
const PATHS: [RegExp, string][] = [
  [/(^|\/)supabase\/(config\.toml|migrations\/)/, "Supabase"],
  [/(^|\/)supabase\/functions\//, "Deno"],
  [/(^|\/)wrangler\.(toml|jsonc?)$/, "Cloudflare Workers"],
  [/(^|\/)capacitor\.config\.(ts|json|js)$/, "Capacitor"],
  [/(^|\/)(Dockerfile|docker-compose\.ya?ml)$/, "Docker"],
  [/(^|\/)pom\.xml$/, "Maven"],
  [/(^|\/)build\.gradle(\.kts)?$/, "Gradle"],
  [/^\.github\/workflows\//, "GitHub Actions"],
  [/(^|\/)vercel\.json$/, "Vercel"],
];

function gh(...args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function raw(repo: string, branch: string, path: string): string {
  return gh("api", "-H", "Accept: application/vnd.github.raw",
    `repos/${SELF}/${repo}/contents/${path}?ref=${branch}`);
}

const query = `{viewer{repositories(first:100, ownerAffiliations:OWNER){nodes{
  name isPrivate defaultBranchRef{name}
  languages(first:20, orderBy:{field:SIZE, direction:DESC}){edges{size node{name color}}}}}}}`;
const repos: Repo[] = JSON.parse(gh("api", "graphql", "-f", `query=${query}`))
  .data.viewer.repositories.nodes.filter((r: Repo) => r.name !== SELF);

const langBytes = new Map<string, { color: string; bytes: number }>();
const toolRepos = new Map<string, number>();

for (const repo of repos) {
  for (const { size, node } of repo.languages.edges) {
    const cur = langBytes.get(node.name) ?? { color: node.color, bytes: 0 };
    cur.bytes += size;
    langBytes.set(node.name, cur);
  }
  const branch = repo.defaultBranchRef?.name;
  if (!branch) continue;

  const tools = new Set<string>();
  const tree: { path: string; type: string }[] =
    JSON.parse(gh("api", `repos/${SELF}/${repo.name}/git/trees/${branch}?recursive=1`)).tree;
  const files = tree.filter((t) => t.type === "blob" && !t.path.includes("node_modules/"));

  for (const { path } of files) {
    for (const [re, tool] of PATHS) if (re.test(path)) tools.add(tool);
  }
  const manifests = files.filter((f) => f.path.endsWith("package.json")).slice(0, 30);
  if (manifests.length) tools.add("Node.js");
  for (const { path } of manifests) {
    try {
      const pkg = JSON.parse(raw(repo.name, branch, path));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const dep of Object.keys(deps)) if (DEPS[dep]) tools.add(DEPS[dep]);
    } catch {
      // package.json quebrado ou grande demais: segue sem ele
    }
  }
  const pom = files.find((f) => f.path.endsWith("pom.xml"));
  if (pom && raw(repo.name, branch, pom.path).includes("spring-boot")) tools.add("Spring Boot");

  for (const tool of tools) toolRepos.set(tool, (toolRepos.get(tool) ?? 0) + 1);
}

const total = [...langBytes.values()].reduce((s, l) => s + l.bytes, 0);
const languages = [...langBytes.entries()]
  .map(([name, l]) => ({ name, color: l.color, bytes: l.bytes, pct: (l.bytes / total) * 100 }))
  .sort((a, b) => b.bytes - a.bytes);
const tools = [...toolRepos.entries()]
  .map(([name, count]) => ({ name, repos: count }))
  .sort((a, b) => b.repos - a.repos || a.name.localeCompare(b.name));

const data = {
  updated: new Date().toISOString().slice(0, 10),
  repos: repos.length,
  private: repos.filter((r) => r.isPrivate).length,
  languages,
  tools,
};
writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(`${data.repos} repositórios, ${languages.length} linguagens, ${tools.length} ferramentas`);
