#!/usr/bin/env node
/**
 * generate-summaries.js
 *
 * Calls the Claude API to generate plain-language and technical summaries
 * for each RFC and working group in the dataset.
 *
 * IMPORTANT: This script costs API credits. Run it once, commit the output.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-summaries.js
 *
 *   Options (env vars):
 *     RFC_LIMIT=50          Only process first N RFCs (for testing)
 *     WG_ONLY=true          Only generate WG summaries, skip per-RFC
 *     TARGET_WG=tls         Only process a specific working group
 *
 * Output: updates src/lib/data/rfcs.json and src/lib/data/wgs.json in place
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'lib', 'data');

const MODEL = 'claude-haiku-4-5-20251001'; // Haiku: fast + cheap for batch summarization
const MAX_CONCURRENT = 5;
const BATCH_DELAY_MS = 500;

function readJson(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

function writeJson(filename, data) {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

async function generateRfcSummary(client, rfc) {
  const prompt = `You are a technical writer creating educational content about internet protocols.

Generate a summary for RFC ${rfc.number}: "${rfc.title}" (${rfc.status}, ${rfc.date})

Respond with a JSON object containing exactly these three fields:
{
  "summary": "2-3 sentences: precise technical summary for engineers. Cover what the RFC defines, key mechanisms, and technical improvements over predecessors.",
  "beginner": "1-2 sentences: plain English explanation for a curious non-technical person. Use an analogy if helpful. No jargon.",
  "impact": "1-2 sentences: real-world impact. What uses this today? How many people/systems are affected?"
}

Only output the JSON object, nothing else.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`);

  const parsed = JSON.parse(jsonrepair(match[0]));
  return {
    summary: parsed.summary || '',
    beginner: parsed.beginner || '',
    impact: parsed.impact || ''
  };
}

async function generateWgSummary(client, wg) {
  const prompt = `You are a technical writer creating educational content about internet standards.

Generate content for the IETF "${wg.fullName}" (${wg.name}) working group in the ${wg.area} area.
This group has produced ${wg.rfcCount} RFCs.

Respond with a JSON object:
{
  "description": "1 sentence: what this working group focuses on. Start with a verb (e.g., 'Defines...', 'Maintains...', 'Standardizes...')",
  "summary": "3-4 sentences: historical arc of the working group — why it was created, what problems it solved, key milestones, current state. Technical but accessible."
}

Only output the JSON object, nothing else.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`);

  const parsed = JSON.parse(jsonrepair(match[0]));
  return {
    description: parsed.description || '',
    summary: parsed.summary || ''
  };
}

async function processBatch(items, processFn, label) {
  const results = new Map();
  const total = items.length;
  let done = 0;

  // Process in chunks to respect rate limits
  for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
    const chunk = items.slice(i, i + MAX_CONCURRENT);

    const chunkResults = await Promise.allSettled(
      chunk.map(item => processFn(item))
    );

    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      const result = chunkResults[j];
      done++;

      if (result.status === 'fulfilled') {
        results.set(item.id, result.value);
        process.stdout.write(`\r  ${label}: ${done}/${total} ✓`);
      } else {
        console.error(`\n  ⚠️  Failed ${item.id}: ${result.reason?.message || result.reason}`);
      }
    }

    if (i + MAX_CONCURRENT < items.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(''); // newline after progress
  return results;
}

async function main() {
  console.log('\n🤖 RFC Explorer — Summary Generation Script\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    console.log('   Get an API key at https://console.anthropic.com/');
    console.log('   Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-summaries.js\n');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load current data
  let rfcs = readJson('rfcs.json');
  let wgs = readJson('wgs.json');

  // Apply filters from env vars
  const rfcLimit = parseInt(process.env.RFC_LIMIT || '0', 10);
  const wgOnly = process.env.WG_ONLY === 'true';
  const targetWg = process.env.TARGET_WG;

  // ─── Working Group summaries ─────────────────────────────────────────────
  console.log('📝 Generating working group summaries...');

  const wgsToProcess = wgs.filter(wg => {
    if (targetWg && wg.slug !== targetWg) return false;
    if (wg.rfcCount === 0) return false;
    // Skip already-generated unless forcing
    return !wg.summary || wg.summary.length < 10;
  });

  if (wgsToProcess.length > 0) {
    const wgResults = await processBatch(
      wgsToProcess.map(wg => ({ id: wg.slug, ...wg })),
      item => generateWgSummary(client, item),
      'WGs'
    );

    wgs = wgs.map(wg => {
      const result = wgResults.get(wg.slug);
      if (result) return { ...wg, ...result };
      return wg;
    });

    writeJson('wgs.json', wgs);
    console.log(`✅ Updated ${wgResults.size} working group summaries\n`);
  } else {
    console.log('  (all WGs already have summaries, skipping)\n');
  }

  if (wgOnly) {
    console.log('WG_ONLY=true — skipping RFC summaries');
    return;
  }

  // ─── RFC summaries ────────────────────────────────────────────────────────
  console.log('📝 Generating RFC summaries...');

  let rfcsToProcess = rfcs.filter(rfc => {
    if (targetWg && rfc.wg !== targetWg) return false;

    return !rfc.summary || rfc.summary.length < 10;
  });

  if (rfcLimit > 0) {
    rfcsToProcess = rfcsToProcess.slice(0, rfcLimit);
    console.log(`  (RFC_LIMIT=${rfcLimit}: processing first ${rfcsToProcess.length} RFCs)`);
  }

  if (rfcsToProcess.length === 0) {
    console.log('  (all RFCs already have summaries, skipping)');
    return;
  }

  console.log(`  Processing ${rfcsToProcess.length} RFCs with Claude ${MODEL}...\n`);

  // Estimate cost: ~400 tokens/RFC × $0.25/M input + $1.25/M output
  const estimatedCostUSD = rfcsToProcess.length * 0.0001;
  console.log(`  💰 Estimated cost: ~$${estimatedCostUSD.toFixed(2)} USD`);
  console.log(`  ⏱️  Estimated time: ~${Math.ceil(rfcsToProcess.length / MAX_CONCURRENT * BATCH_DELAY_MS / 1000 / 60)} minutes\n`);

  const rfcResults = await processBatch(
    rfcsToProcess.map(rfc => ({ id: rfc.number, ...rfc })),
    item => generateRfcSummary(client, item),
    'RFCs'
  );

  rfcs = rfcs.map(rfc => {
    const result = rfcResults.get(rfc.number);
    if (result) return { ...rfc, ...result };
    return rfc;
  });

  writeJson('rfcs.json', rfcs);
  console.log(`\n✅ Updated ${rfcResults.size} RFC summaries`);
  console.log('   Run npm run build to rebuild the site with new summaries\n');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
