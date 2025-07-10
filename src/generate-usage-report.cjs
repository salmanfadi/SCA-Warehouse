const fs = require('fs');
const path = require('path');
const madge = require('madge');

// Read all file paths from all_src_files.txt
const allFiles = fs.readFileSync('all_src_files.txt', 'utf-8')
  .split('\n')
  .map(f => f.trim())
  .filter(Boolean)
  .map(f => path.relative(process.cwd(), f).replace(/\\/g, '/')); // Normalize to relative, forward slashes

// Main function
async function main() {
  // Build dependency graph with madge
  const res = await madge('src', { includeNpm: false });
  const graph = res.obj();

  // Build set of all reachable files (used)
  const used = new Set();
  function visit(file) {
    if (used.has(file)) return;
    used.add(file);
    (graph[file] || []).forEach(visit);
  }

  // Start from entry points
  ['src/main.tsx', 'src/App.tsx'].forEach(entry => {
    if (graph[entry]) visit(entry);
  });

  // Debug: print first 10 entries of allFiles and used
  console.log('First 10 files in allFiles:', allFiles.slice(0, 10));
  console.log('First 10 files in used:', Array.from(used).slice(0, 10));

  // Write CSV header
  fs.writeFileSync('src_usage_report.csv', 'File Path,Used/Unused\n');

  // Write each file's status
  for (const file of allFiles) {
    const status = used.has(file) ? 'Used' : 'Unused';
    fs.appendFileSync('src_usage_report.csv', `"${file}",${status}\n`);
  }

  console.log('Done! See src_usage_report.csv');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});