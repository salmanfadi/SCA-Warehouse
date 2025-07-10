import os
import re

SRC_DIR = "src"
ENTRY_FILES = ["main.tsx", "App.tsx"]  # Adjust based on your project

visited = set()
import_pattern = re.compile(r'import\s+(?:.*?\s+from\s+)?[\'"](.+?)[\'"]')

def resolve_import(base_file, import_path):
    if import_path.startswith('.'):
        base_dir = os.path.dirname(base_file)
        full_path = os.path.normpath(os.path.join(base_dir, import_path))

        # Try various extensions
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            candidate = full_path + ext
            if os.path.isfile(candidate):
                return os.path.normpath(candidate)

        # Try as index file in directory
        for ext in ['.ts', '.tsx', '.js', '.jsx']:
            candidate = os.path.join(full_path, f'index{ext}')
            if os.path.isfile(candidate):
                return os.path.normpath(candidate)
    return None

def visit_file(filepath):
    if filepath in visited or not os.path.exists(filepath):
        return
    visited.add(filepath)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    imports = import_pattern.findall(content)
    for imp in imports:
        resolved = resolve_import(filepath, imp)
        if resolved:
            visit_file(resolved)

def get_all_source_files():
    all_files = []
    for root, _, files in os.walk(SRC_DIR):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.js', '.jsx')):
                all_files.append(os.path.normpath(os.path.join(root, f)))
    return all_files

# Start from entry files
for entry in ENTRY_FILES:
    entry_path = os.path.normpath(os.path.join(SRC_DIR, entry))
    if os.path.exists(entry_path):
        visit_file(entry_path)

# Gather all source files
all_files = get_all_source_files()
unused_files = [f for f in all_files if f not in visited]

# Output result
print(f"\n🧮 Total files: {len(all_files)}")
print(f"✅ Used files: {len(visited)}")
print(f"❌ Unused files: {len(unused_files)}\n")

# Write used files to used_files.md
with open("used_files.md", "w", encoding="utf-8") as f:
    for file in sorted(visited):
        f.write(file + "\n")
print("Used files written to used_files.md")

# Output direct imports for each used file
with open("used_files_direct_imports.md", "w", encoding="utf-8") as out:
    for file in sorted(visited):
        out.write(f"## {file}\n")
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
        imports = import_pattern.findall(content)
        for imp in imports:
            resolved = resolve_import(file, imp)
            if resolved and resolved in visited:
                out.write(f"- {resolved}\n")
        out.write("\n")
print("Direct imports for each used file written to used_files_direct_imports.md")

# Output two-level imports for each used file
with open("used_files_two_levels.md", "w", encoding="utf-8") as out:
    for file in sorted(visited):
        out.write(f"## {file}\n")
        try:
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()
            imports = import_pattern.findall(content)
            for imp in imports:
                resolved = resolve_import(file, imp)
                if resolved and resolved in visited:
                    out.write(f"- {resolved}\n")
                    # Now, get direct imports of this imported file
                    try:
                        with open(resolved, "r", encoding="utf-8") as f2:
                            content2 = f2.read()
                        sub_imports = import_pattern.findall(content2)
                        for sub_imp in sub_imports:
                            sub_resolved = resolve_import(resolved, sub_imp)
                            if sub_resolved and sub_resolved in visited:
                                out.write(f"    - {sub_resolved}\n")
                    except Exception as e:
                        out.write(f"    - [Error reading {resolved}: {e}]\n")
        except Exception as e:
            out.write(f"- [Error reading {file}: {e}]\n")
        out.write("\n")
print("Two-level imports for each used file written to used_files_two_levels.md")
