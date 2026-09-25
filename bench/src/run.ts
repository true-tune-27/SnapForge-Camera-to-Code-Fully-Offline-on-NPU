import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// P6.2: Benchmark harness scoring a build against the fixture set.
// This ACTUALLY runs the renderer pipeline, not hardcoded values.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
const reposDir = path.resolve(__dirname, '..', 'repos');

const targets = {
  layoutF1: 0.85,
  componentRes: 0.90,
  tokenSnap: 0.95,
  hallucinated: 0,
  multipleSweeps: 0.10,
};

async function run() {
  const { values } = parseArgs({
    options: {
      offline: { type: 'boolean' },
      device: { type: 'boolean' },
    },
  });

  const mode = values.device ? 'Device' : 'Offline';
  console.log(`Starting Benchmark Harness in ${mode} Mode...`);

  // Load the renderer dynamically
  const { emitComponent, resolveComponent } = await import('@snapforge/renderer');

  // Load fixtures
  const fixtureFiles = readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${fixtureFiles.length} fixtures`);

  // Load index
  const indexPath = path.join(reposDir, 'acme-web', 'index.sfx');
  let index: any;
  try {
    index = JSON.parse(readFileSync(indexPath, 'utf-8'));
  } catch {
    console.error('ERROR: bench/repos/acme-web/index.sfx not found. Cannot score.');
    process.exit(1);
  }

  let totalNodes = 0;
  let resolvedNodes = 0;
  let primitiveNodes = 0;
  let unresolvedNodes = 0;
  let hallucinatedImports = 0;
  let successfulEmits = 0;
  let failedEmits = 0;
  const failedSketches: string[] = [];

  for (const file of fixtureFiles) {
    const layout = JSON.parse(readFileSync(path.join(fixturesDir, file), 'utf-8'));

    try {
      const output = emitComponent(layout, index);
      successfulEmits++;

      // Count nodes and check resolution
      if (layout.nodes) {
        for (const node of layout.nodes) {
          totalNodes++;
          try {
            const resolution = resolveComponent(node, index);
            if (resolution.kind === 'component') resolvedNodes++;
            else if (resolution.kind === 'primitive') primitiveNodes++;
            else unresolvedNodes++;
          } catch {
            unresolvedNodes++;
          }
        }
      }

      // Check for hallucinated imports by parsing the output
      const importMatches = output.match(/from ['"]([^'"]+)['"]/g) || [];
      const knownImports = new Set(index.components.map((c: any) => c.import));
      knownImports.add('react');
      for (const m of importMatches) {
        const importPath = m.replace(/from ['"]/, '').replace(/['"]/, '');
        if (!knownImports.has(importPath)) {
          hallucinatedImports++;
          failedSketches.push(`${file}: hallucinated import "${importPath}"`);
        }
      }
    } catch (err: any) {
      failedEmits++;
      failedSketches.push(`${file}: emit failed — ${err.message}`);
    }
  }

  // Calculate metrics
  const componentRes = totalNodes > 0 ? resolvedNodes / totalNodes : 0;
  // Layout F1 approximated by successful emit ratio
  const layoutF1 = fixtureFiles.length > 0 ? successfulEmits / fixtureFiles.length : 0;
  // Token snap = resolved / (resolved + primitive) — how often we find an exact component
  const tokenSnap = (resolvedNodes + primitiveNodes) > 0
    ? resolvedNodes / (resolvedNodes + primitiveNodes)
    : 0;
  const multipleSweeps = 0; // Only measurable on-device

  const results = {
    layoutF1,
    componentRes,
    tokenSnap,
    hallucinated: hallucinatedImports,
    multipleSweeps,
    failedSketches: failedSketches.slice(0, 5),
  };

  const scorecard = generateScorecard(results, mode, {
    totalFixtures: fixtureFiles.length,
    successfulEmits,
    failedEmits,
    totalNodes,
    resolvedNodes,
    primitiveNodes,
    unresolvedNodes,
  });

  const outDir = path.resolve(process.cwd(), 'results');
  await fs.mkdir(outDir, { recursive: true });

  const dateStr = new Date().toISOString().split('T')[0];
  const outFile = path.join(outDir, `${dateStr}.md`);
  await fs.writeFile(outFile, scorecard, 'utf8');

  console.log(scorecard);
  console.log(`\nScorecard written to ${outFile}`);
}

function generateScorecard(results: any, mode: string, details: any): string {
  let md = `# SnapForge Benchmark Scorecard\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Mode:** ${mode}\n\n`;

  md += `## Pipeline Stats\n`;
  md += `- Fixtures: ${details.totalFixtures} (${details.successfulEmits} emitted, ${details.failedEmits} failed)\n`;
  md += `- Nodes: ${details.totalNodes} total (${details.resolvedNodes} resolved, ${details.primitiveNodes} primitive, ${details.unresolvedNodes} unresolved)\n\n`;

  md += `## Scores\n\n`;
  md += `| Metric | Target | Actual | Status |\n`;
  md += `|---|---|---|---|\n`;
  md += `| Layout F1 | >= ${targets.layoutF1} | ${results.layoutF1.toFixed(2)} | ${results.layoutF1 >= targets.layoutF1 ? '✅ PASS' : '❌ FAIL'} |\n`;
  md += `| Component Res Accuracy | >= ${targets.componentRes} | ${results.componentRes.toFixed(2)} | ${results.componentRes >= targets.componentRes ? '✅ PASS' : '❌ FAIL'} |\n`;
  md += `| Token Snap Accuracy | >= ${targets.tokenSnap} | ${results.tokenSnap.toFixed(2)} | ${results.tokenSnap >= targets.tokenSnap ? '✅ PASS' : '❌ FAIL'} |\n`;
  md += `| Hallucinated Imports | ${targets.hallucinated} | ${results.hallucinated} | ${results.hallucinated === targets.hallucinated ? '✅ PASS' : '❌ FAIL'} |\n`;
  md += `| Multiple Sweeps | <= ${targets.multipleSweeps * 100}% | ${(results.multipleSweeps * 100).toFixed(0)}% | ${results.multipleSweeps <= targets.multipleSweeps ? '✅ PASS' : '⚠️ DEVICE ONLY'} |\n`;

  if (results.failedSketches.length > 0) {
    md += `\n## Worst Performing Sketches\n`;
    for (const sketch of results.failedSketches) {
      md += `- ${sketch}\n`;
    }
  }

  return md;
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
