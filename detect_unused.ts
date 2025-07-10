console.log("✅ detect_unused.ts started");

// detect-unused.ts
import { Project } from "ts-morph";
import fg from "fast-glob";
import path from "path";
import fs from "fs";

const SRC_DIR = "src";
const ENTRY_FILES = ["main.tsx", "main.ts", "app.tsx"];
const IGNORED_PATTERNS = ["**/*.test.*", "**/__tests__/**", "**/*.d.ts"];

function resolveAbsolutePath(p: string) {
  return path.resolve(process.cwd(), p);
}

function getEntryFile(project: Project): string | undefined {
  for (const file of ENTRY_FILES) {
    const f = path.join(SRC_DIR, file);
    if (fs.existsSync(f)) return resolveAbsolutePath(f);
  }
  return undefined;
}

async function findAllSourceFiles() {
  return await fg([`${SRC_DIR}/**/*.{ts,tsx}`], {
    ignore: IGNORED_PATTERNS,
    absolute: true,
  });
}

async function main() {
  console.log("🔍 Scanning for unused files...");

  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: true,
  });

  const allFiles = await findAllSourceFiles();
  allFiles.forEach((f) => project.addSourceFileAtPath(f));

  const entryFile = getEntryFile(project);
  if (!entryFile) {
    console.error("❌ Could not find entry file (main.tsx/app.tsx)");
    process.exit(1);
  }

  const reachableFiles = new Set<string>();
  const visited = new Set<string>();

  function traverse(filePath: string) {
    const file = project.getSourceFile(filePath);
    if (!file || visited.has(filePath)) return;
    visited.add(filePath);
    reachableFiles.add(filePath);

    for (const imp of file.getImportDeclarations()) {
      const resolved = imp.getModuleSpecifierSourceFile();
      if (resolved) {
        traverse(resolved.getFilePath());
      }
    }
  }

  traverse(entryFile);

  const unused = allFiles.filter((f) => !reachableFiles.has(resolveAbsolutePath(f)));

  console.log(`\n🧮 Total files: ${allFiles.length}`);
  console.log(`✅ Used files: ${reachableFiles.size}`);
  console.log(`❌ Unused files: ${unused.length}`);

  for (const file of unused) {
    console.log(file.replace(process.cwd() + path.sep, ""));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("🚨 Error:", err);
  process.exit(1);
});

