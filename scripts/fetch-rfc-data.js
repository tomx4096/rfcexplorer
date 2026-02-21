#!/usr/bin/env node
/**
 * fetch-rfc-data.js
 *
 * Downloads the IETF RFC index XML, parses RFC metadata and relationships,
 * maps RFCs to working groups/areas, and outputs static JSON files.
 *
 * Usage:
 *   node scripts/fetch-rfc-data.js
 *
 * Output:
 *   src/lib/data/areas.json        — IETF area definitions
 *   src/lib/data/wgs.json          — Working group definitions
 *   src/lib/data/rfcs.json         — RFC metadata + relationships
 *   src/lib/data/graph-edges.json  — RFC-to-RFC relationship edges
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'lib', 'data');

// ─── IETF Area and Working Group mapping ─────────────────────────────────────
// Sourced from https://datatracker.ietf.org/wg/
// Maps WG acronym → { area slug, full area name, WG full name, description }
const WG_MAP = {
  // Security Area
  'tls':      { area: 'security', name: 'TLS', fullName: 'Transport Layer Security' },
  'oauth':    { area: 'security', name: 'OAuth', fullName: 'Web Authorization Protocol' },
  'jose':     { area: 'security', name: 'JOSE', fullName: 'JavaScript Object Signing and Encryption' },
  'acme':     { area: 'security', name: 'ACME', fullName: 'Automated Certificate Management Environment' },
  'sasl':     { area: 'security', name: 'SASL', fullName: 'Simple Authentication and Security Layer' },
  'pkix':     { area: 'security', name: 'PKIX', fullName: 'Public-Key Infrastructure (X.509)' },
  'curdle':   { area: 'security', name: 'CURDLE', fullName: 'CURves, Deprecating and a Little more Encryption' },
  'lamps':    { area: 'security', name: 'LAMPS', fullName: 'Limited Additional Mechanisms for PKIX and SMIME' },

  // Transport Area
  'quic':     { area: 'transport', name: 'QUIC', fullName: 'QUIC Protocol' },
  'tcpm':     { area: 'transport', name: 'TCPM', fullName: 'TCP Maintenance and Minor Extensions' },
  'tsvwg':    { area: 'transport', name: 'TSVWG', fullName: 'Transport & Services' },
  'ippm':     { area: 'transport', name: 'IPPM', fullName: 'IP Performance Measurement' },
  'rmcat':    { area: 'transport', name: 'RMCAT', fullName: 'RTP Media Congestion Avoidance Techniques' },

  // Applications & Real-Time Area
  'httpbis':  { area: 'applications', name: 'HTTPbis', fullName: 'HTTP Bis (Revised)' },
  'httpauth': { area: 'applications', name: 'HTTP Auth', fullName: 'HTTP Authentication' },
  'appsawg':  { area: 'applications', name: 'APPSAWG', fullName: 'Applications Area Working Group' },
  'dispatch': { area: 'applications', name: 'DISPATCH', fullName: 'Dispatch' },
  'core':     { area: 'applications', name: 'CoRE', fullName: 'Constrained RESTful Environments' },
  'xmpp':     { area: 'applications', name: 'XMPP', fullName: 'Extensible Messaging and Presence Protocol' },
  'calext':   { area: 'applications', name: 'CALEXT', fullName: 'Calendaring Extensions' },
  'extra':    { area: 'applications', name: 'EXTRA', fullName: 'Email mailstore and eXtensions To Revise or Amend' },

  // Internet Area
  'dnsop':    { area: 'internet', name: 'DNSOP', fullName: 'DNS Operations' },
  'dhc':      { area: 'internet', name: 'DHC', fullName: 'Dynamic Host Configuration' },
  '6man':     { area: 'internet', name: '6MAN', fullName: 'IPv6 Maintenance' },
  'v6ops':    { area: 'internet', name: 'V6OPS', fullName: 'IPv6 Operations' },
  'intarea':  { area: 'internet', name: 'INTAREA', fullName: 'Internet Area' },
  'pcp':      { area: 'internet', name: 'PCP', fullName: 'Port Control Protocol' },

  // Routing Area
  'idr':      { area: 'routing', name: 'IDR', fullName: 'Inter-Domain Routing (BGP)' },
  'ospf':     { area: 'routing', name: 'OSPF', fullName: 'Open Shortest Path First' },
  'isis':     { area: 'routing', name: 'ISIS', fullName: 'IS-IS for IP Internets' },
  'mpls':     { area: 'routing', name: 'MPLS', fullName: 'Multiprotocol Label Switching' },
  'bfd':      { area: 'routing', name: 'BFD', fullName: 'Bidirectional Forwarding Detection' },
  'pim':      { area: 'routing', name: 'PIM', fullName: 'Protocol Independent Multicast' },

  // Ops & Management Area
  'netconf':  { area: 'ops-management', name: 'NETCONF', fullName: 'Network Configuration Protocol' },
  'opsec':    { area: 'ops-management', name: 'OPSEC', fullName: 'Operational Security Capabilities for IP' },
  'bmwg':     { area: 'ops-management', name: 'BMWG', fullName: 'Benchmarking Methodology' },
  'mboned':   { area: 'ops-management', name: 'MBONED', fullName: 'MBONE Deployment' },
};

// RFC number → WG mapping for key historic RFCs that predate WG tracking
const RFC_WG_OVERRIDES = {
  // DNS
  1034: 'dnsop', 1035: 'dnsop', 2181: 'dnsop', 4033: 'dnsop',
  4034: 'dnsop', 4035: 'dnsop', 8484: 'dnsop', 7858: 'dnsop',
  // TLS
  2246: 'tls', 4346: 'tls', 5246: 'tls', 8446: 'tls',
  6347: 'tls', 9147: 'tls', 8448: 'tls',
  // HTTP
  1945: 'httpbis', 2616: 'httpbis', 7230: 'httpbis', 7231: 'httpbis',
  7540: 'httpbis', 9110: 'httpbis', 9113: 'httpbis',
  // QUIC
  9000: 'quic', 9001: 'quic', 9002: 'quic', 9114: 'quic',
  // OAuth / JOSE
  6749: 'oauth', 6750: 'oauth', 7636: 'oauth', 7519: 'jose',
  7515: 'jose', 7516: 'jose', 7517: 'jose',
  // ACME
  8555: 'acme', 8657: 'acme', 8738: 'acme',
  // BGP
  4271: 'idr', 4760: 'idr', 8205: 'idr',
  // OSPF
  2328: 'ospf', 5340: 'ospf', 7474: 'ospf',
  // NETCONF
  6241: 'netconf', 6242: 'netconf', 7950: 'netconf', 8040: 'netconf',
};

// Status normalization
function normalizeStatus(status) {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('internet standard') || s === 'standard') return 'standard';
  if (s.includes('draft standard')) return 'draft-standard';
  if (s.includes('proposed standard')) return 'proposed-standard';
  if (s.includes('experimental')) return 'experimental';
  if (s.includes('historic')) return 'historic';
  if (s.includes('best current practice') || s.includes('bcp')) return 'best-current-practice';
  if (s.includes('informational')) return 'informational';
  return 'informational';
}

// Parse list of RFC number references from XML field
function parseRfcRefs(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap(v => {
    if (typeof v === 'string') return [parseInt(v.replace(/[^0-9]/g, ''), 10)].filter(n => !isNaN(n));
    if (v._ ) return [parseInt(v._.replace(/[^0-9]/g, ''), 10)].filter(n => !isNaN(n));
    if (v['doc-id']) return parseRfcRefs(v['doc-id']);
    return [];
  });
}

function extractText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(extractText).join(' ');
  if (val._) return val._;
  return String(val);
}

async function fetchRfcIndex() {
  console.log('📡 Fetching RFC index from IETF...');
  const response = await fetch('https://www.rfc-editor.org/in-notes/rfc-index.xml', {
    headers: { 'Accept': 'application/xml', 'User-Agent': 'RFC-Explorer-BuildScript/1.0' }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();
  console.log(`✅ Downloaded ${(xml.length / 1024 / 1024).toFixed(1)} MB`);
  return xml;
}

async function parseRfcIndex(xml) {
  console.log('🔍 Parsing RFC index XML...');
  const parsed = await parseStringPromise(xml, {
    explicitArray: true,
    mergeAttrs: true,
    normalizeTags: true
  });

  const index = parsed['rfc-index'];
  const rfcEntries = index['rfc-entry'] || [];
  console.log(`📚 Found ${rfcEntries.length} RFC entries`);
  return rfcEntries;
}

function processRfcEntries(entries) {
  const rfcs = [];
  const edges = [];
  const wgRfcCounts = {};

  for (const entry of entries) {
    try {
      const docId = extractText(entry['doc-id']?.[0]);
      if (!docId || !docId.startsWith('RFC')) continue;

      const num = parseInt(docId.replace('RFC', ''), 10);
      if (isNaN(num)) continue;

      const title = extractText(entry['title']?.[0]) || `RFC ${num}`;
      const status = normalizeStatus(extractText(entry['current-status']?.[0]));
      const published = entry['date']?.[0];
      const year = extractText(published?.['year']?.[0]) || '';
      const month = extractText(published?.['month']?.[0]) || '';
      const dateStr = [year, month].filter(Boolean).join('-');

      // Authors
      const authors = (entry['author'] || []).map(a => {
        const name = extractText(a['name']?.[0]) || extractText(a);
        return name.trim();
      }).filter(Boolean).slice(0, 6); // max 6 authors

      // Relationships
      const obsoletesNums = parseRfcRefs(entry['obsoletes']?.[0]?.['doc-id']);
      const obsoletedByNums = parseRfcRefs(entry['obsoleted-by']?.[0]?.['doc-id']);
      const updatesNums = parseRfcRefs(entry['updates']?.[0]?.['doc-id']);
      const updatedByNums = parseRfcRefs(entry['updated-by']?.[0]?.['doc-id']);

      // WG assignment
      const wgFromXml = extractText(entry['wg_acronym']?.[0]) || extractText(entry['stream']?.[0]) || '';
      const wgNorm = wgFromXml.toLowerCase().replace(/\s+/g, '');
      const wg = RFC_WG_OVERRIDES[num] ||
                 (WG_MAP[wgNorm] ? wgNorm : null) ||
                 'other';

      // Track WG RFC counts
      if (wg !== 'other') {
        wgRfcCounts[wg] = (wgRfcCounts[wg] || 0) + 1;
      }

      rfcs.push({
        number: num,
        title: title.slice(0, 200),
        wg,
        area: WG_MAP[wg]?.area || 'other',
        status,
        date: dateStr,
        authors,
        summary: '',  // populated by generate-summaries.js
        impact: '',
        beginner: '',
        obsoletes: obsoletesNums,
        obsoletedBy: obsoletedByNums,
        updates: updatesNums,
        updatedBy: updatedByNums
      });

      // Build edges
      for (const target of obsoletesNums) {
        edges.push({ source: num, target, type: 'obsoletes' });
      }
      for (const target of updatesNums) {
        edges.push({ source: num, target, type: 'updates' });
      }

    } catch (err) {
      // Skip malformed entries
    }
  }

  console.log(`✅ Processed ${rfcs.length} RFCs, ${edges.length} edges`);
  return { rfcs, edges, wgRfcCounts };
}

function buildWgsJson(wgRfcCounts) {
  return Object.entries(WG_MAP).map(([slug, info]) => ({
    slug,
    name: info.name,
    fullName: info.fullName,
    area: info.area,
    description: '',   // populated by generate-summaries.js
    summary: '',
    rfcCount: wgRfcCounts[slug] || 0,
    keyRfcs: []
  }));
}

const AREAS = [
  {
    slug: 'security',
    name: 'Security',
    tagline: 'How the internet stays private and trusted',
    description: 'Protocols and standards for authentication, encryption, integrity, and privacy across all layers of the internet stack.',
    icon: '🔐',
    color: 'from-red-900 to-red-700',
    funFact: 'The TLS handshake that secures your browser happens in under 100ms, yet involves cryptographic operations that would take the world\'s fastest supercomputers centuries to break.'
  },
  {
    slug: 'transport',
    name: 'Transport',
    tagline: 'Moving data reliably across networks',
    description: 'Core transport protocols that handle reliable delivery, congestion control, and flow management between networked systems.',
    icon: '🚚',
    color: 'from-blue-900 to-blue-700',
    funFact: 'TCP was designed in 1973 and the core protocol (RFC 793) remained unchanged for 35 years before QUIC reimagined transport from the ground up.'
  },
  {
    slug: 'applications',
    name: 'Applications & Real-Time',
    tagline: 'The protocols users actually interact with',
    description: 'Application-layer protocols: HTTP, email, multimedia streaming, and real-time communication that power the visible web.',
    icon: '🌐',
    color: 'from-emerald-900 to-emerald-700',
    funFact: 'HTTP/1.1 (RFC 2616, 1999) was so dominant it took 16 years to supersede it with HTTP/2. HTTP/3 then arrived in just 5 years, riding on QUIC.'
  },
  {
    slug: 'internet',
    name: 'Internet',
    tagline: 'IP addressing, routing, and the backbone',
    description: 'Fundamental internet layer protocols: IP addressing schemes, routing protocols, and network management that hold the internet together.',
    icon: '🕸️',
    color: 'from-purple-900 to-purple-700',
    funFact: 'IPv4 was designed for 4.3 billion addresses — the IETF assumed the internet would never need more. IPv6 provides 340 undecillion addresses (3.4×10³⁸).'
  },
  {
    slug: 'routing',
    name: 'Routing',
    tagline: 'Finding paths across the global internet',
    description: 'Inter-domain and intra-domain routing protocols that determine how packets traverse the global network of networks.',
    icon: '🗺️',
    color: 'from-amber-900 to-amber-700',
    funFact: 'BGP (RFC 4271) is sometimes called \'the duct tape of the internet.\' It was originally sketched on napkins at an IETF meeting in 1989.'
  },
  {
    slug: 'ops-management',
    name: 'Operations & Management',
    tagline: 'Keeping the internet running smoothly',
    description: 'Network management, monitoring, configuration, and operations standards that help administrators maintain reliable infrastructure.',
    icon: '⚙️',
    color: 'from-slate-800 to-slate-600',
    funFact: 'SNMP (Simple Network Management Protocol) was published in 1988 and is still running on millions of network devices today, despite being designed for a much simpler era.'
  }
];

async function main() {
  console.log('\n🚀 RFC Explorer — Data Fetch Script\n');

  // Ensure output directory exists
  mkdirSync(DATA_DIR, { recursive: true });

  let rfcEntries;
  try {
    const xml = await fetchRfcIndex();
    rfcEntries = await parseRfcIndex(xml);
  } catch (err) {
    console.error('❌ Failed to fetch/parse RFC index:', err.message);
    console.log('\n💡 Check your internet connection. If IETF is unreachable, the');
    console.log('   script will use the bundled sample data (src/lib/data/).');
    process.exit(1);
  }

  const { rfcs, edges, wgRfcCounts } = processRfcEntries(rfcEntries);

  // Add wgCount/rfcCount to areas
  const areasWithCounts = AREAS.map(area => ({
    ...area,
    wgCount: Object.values(WG_MAP).filter(w => w.area === area.slug).length,
    rfcCount: rfcs.filter(r => r.area === area.slug).length
  }));

  const wgs = buildWgsJson(wgRfcCounts);

  // Write output files
  const files = {
    'areas.json': areasWithCounts,
    'wgs.json': wgs,
    'rfcs.json': rfcs,
    'graph-edges.json': edges
  };

  for (const [filename, data] of Object.entries(files)) {
    const path = join(DATA_DIR, filename);
    writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`💾 Wrote ${path} (${data.length} items)`);
  }

  console.log('\n✅ Data fetch complete!');
  console.log('   Next: run node scripts/generate-summaries.js to add AI summaries\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
