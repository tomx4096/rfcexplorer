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
const WG_MAP = {

  // ── Security ────────────────────────────────────────────────────────────────
  'tls':      { area: 'security', name: 'TLS',      fullName: 'Transport Layer Security' },
  'oauth':    { area: 'security', name: 'OAuth',    fullName: 'Web Authorization Protocol' },
  'jose':     { area: 'security', name: 'JOSE',     fullName: 'JavaScript Object Signing and Encryption' },
  'acme':     { area: 'security', name: 'ACME',     fullName: 'Automated Certificate Management Environment' },
  'sasl':     { area: 'security', name: 'SASL',     fullName: 'Simple Authentication and Security Layer' },
  'pkix':     { area: 'security', name: 'PKIX',     fullName: 'Public-Key Infrastructure (X.509)' },
  'curdle':   { area: 'security', name: 'CURDLE',   fullName: 'CURves, Deprecating and a Little more Encryption' },
  'lamps':    { area: 'security', name: 'LAMPS',    fullName: 'Limited Additional Mechanisms for PKIX and SMIME' },
  'ipsec':    { area: 'security', name: 'IPsec',    fullName: 'IP Security Protocol' },
  'ipsecme':  { area: 'security', name: 'IPsecME',  fullName: 'IP Security Maintenance and Extensions' },
  'smime':    { area: 'security', name: 'S/MIME',   fullName: 'Secure/Multipurpose Internet Mail Extensions' },
  'secsh':    { area: 'security', name: 'SecSH',    fullName: 'Secure Shell' },
  'cat':      { area: 'security', name: 'CAT',      fullName: 'Common Authentication Technology' },
  'krb-wg':   { area: 'security', name: 'Kerberos', fullName: 'Kerberos Working Group' },
  'kitten':   { area: 'security', name: 'KITTEN',   fullName: 'Next-Generation GSS-API' },
  'msec':     { area: 'security', name: 'MSEC',     fullName: 'Multicast Security' },
  'sidr':     { area: 'security', name: 'SIDR',     fullName: 'Secure Inter-Domain Routing' },
  'sidrops':  { area: 'security', name: 'SIDROPS',  fullName: 'SIDR Operations' },
  'ace':      { area: 'security', name: 'ACE',      fullName: 'Authentication and Authorization for Constrained Environments' },
  'dots':     { area: 'security', name: 'DOTS',     fullName: 'DDoS Open Threat Signaling' },
  'emu':      { area: 'security', name: 'EMU',      fullName: 'EAP Method Update' },
  'mile':     { area: 'security', name: 'MILE',     fullName: 'Managed Incident Lightweight Exchange' },
  'uta':      { area: 'security', name: 'UTA',      fullName: 'Using TLS in Applications' },
  'radext':   { area: 'security', name: 'RADEXT',   fullName: 'RADIUS Extensions' },
  'radius':   { area: 'security', name: 'RADIUS',   fullName: 'Remote Authentication Dial-In User Service' },
  'ids':      { area: 'security', name: 'IDS',      fullName: 'Intrusion Detection Systems' },
  'cose':     { area: 'security', name: 'COSE',     fullName: 'CBOR Object Signing and Encryption' },
  'openpgp':  { area: 'security', name: 'OpenPGP',  fullName: 'Open Pretty Good Privacy' },
  'spki':     { area: 'security', name: 'SPKI',     fullName: 'Simple Public Key Infrastructure' },
  'pquip':    { area: 'security', name: 'PQUIP',    fullName: 'Post-Quantum Use in Protocols' },

  // ── Transport ───────────────────────────────────────────────────────────────
  'quic':     { area: 'transport', name: 'QUIC',     fullName: 'QUIC Protocol' },
  'tcpm':     { area: 'transport', name: 'TCPM',     fullName: 'TCP Maintenance and Minor Extensions' },
  'tsvwg':    { area: 'transport', name: 'TSVWG',    fullName: 'Transport & Services' },
  'ippm':     { area: 'transport', name: 'IPPM',     fullName: 'IP Performance Measurement' },
  'rmcat':    { area: 'transport', name: 'RMCAT',    fullName: 'RTP Media Congestion Avoidance Techniques' },
  'avt':      { area: 'transport', name: 'AVT',      fullName: 'Audio/Video Transport' },
  'pppext':   { area: 'transport', name: 'PPPEXT',   fullName: 'Point-to-Point Protocol Extensions' },
  'rohc':     { area: 'transport', name: 'ROHC',     fullName: 'Robust Header Compression' },
  'dccp':     { area: 'transport', name: 'DCCP',     fullName: 'Datagram Congestion Control Protocol' },
  'rmt':      { area: 'transport', name: 'RMT',      fullName: 'Reliable Multicast Transport' },
  'issll':    { area: 'transport', name: 'ISSLL',    fullName: 'Integrated Services over Specific Link Layers' },
  'diffserv': { area: 'transport', name: 'DiffServ', fullName: 'Differentiated Services' },
  'alto':     { area: 'transport', name: 'ALTO',     fullName: 'Application-Layer Traffic Optimization' },
  'ntp':      { area: 'transport', name: 'NTP',      fullName: 'Network Time Protocol' },
  'detnet':   { area: 'transport', name: 'DetNet',   fullName: 'Deterministic Networking' },
  'nfsv4':    { area: 'transport', name: 'NFSv4',    fullName: 'Network File System Version 4' },
  'nsis':     { area: 'transport', name: 'NSIS',     fullName: 'Next Steps in Signaling' },
  'ips':      { area: 'transport', name: 'IPS',      fullName: 'IP Storage' },
  'mptcp':    { area: 'transport', name: 'MPTCP',    fullName: 'Multipath TCP' },

  // ── Applications ────────────────────────────────────────────────────────────
  'httpbis':  { area: 'applications', name: 'HTTPbis',  fullName: 'HTTP Bis (Revised)' },
  'httpauth': { area: 'applications', name: 'HTTP Auth', fullName: 'HTTP Authentication' },
  'appsawg':  { area: 'applications', name: 'APPSAWG',  fullName: 'Applications Area Working Group' },
  'dispatch': { area: 'applications', name: 'DISPATCH',  fullName: 'Dispatch' },
  'core':     { area: 'applications', name: 'CoRE',      fullName: 'Constrained RESTful Environments' },
  'xmpp':     { area: 'applications', name: 'XMPP',      fullName: 'Extensible Messaging and Presence Protocol' },
  'calext':   { area: 'applications', name: 'CALEXT',    fullName: 'Calendaring Extensions' },
  'extra':    { area: 'applications', name: 'EXTRA',     fullName: 'Email mailstore and eXtensions To Revise or Amend' },
  'http':     { area: 'applications', name: 'HTTP',      fullName: 'Hypertext Transfer Protocol' },
  'urn':      { area: 'applications', name: 'URN',       fullName: 'Uniform Resource Names' },
  'ldapbis':  { area: 'applications', name: 'LDAPbis',   fullName: 'Lightweight Directory Access Protocol Revision' },
  'regext':   { area: 'applications', name: 'REGEXT',    fullName: 'Registration Protocols Extensions' },
  'cbor':     { area: 'applications', name: 'CBOR',      fullName: 'Concise Binary Object Representation' },
  'cdni':     { area: 'applications', name: 'CDNI',      fullName: 'Content Delivery Networks Interconnection' },
  'sfc':      { area: 'applications', name: 'SFC',       fullName: 'Service Function Chaining' },
  'ipp':      { area: 'applications', name: 'IPP',       fullName: 'Internet Printing Protocol' },
  'forces':   { area: 'applications', name: 'ForCES',    fullName: 'Forwarding and Control Element Separation' },
  'trade':    { area: 'applications', name: 'TRADE',     fullName: 'Internet and Commerce' },
  'asid':     { area: 'applications', name: 'ASID',      fullName: 'Access, Searching and Indexing of Directories' },
  'mile':     { area: 'applications', name: 'MILE',      fullName: 'Managed Incident Lightweight Exchange' },

  // ── Internet ─────────────────────────────────────────────────────────────────
  'dnsop':    { area: 'internet', name: 'DNSOP',    fullName: 'DNS Operations' },
  'dhc':      { area: 'internet', name: 'DHC',      fullName: 'Dynamic Host Configuration' },
  '6man':     { area: 'internet', name: '6MAN',     fullName: 'IPv6 Maintenance' },
  'v6ops':    { area: 'internet', name: 'V6OPS',    fullName: 'IPv6 Operations' },
  'intarea':  { area: 'internet', name: 'INTAREA',  fullName: 'Internet Area' },
  'pcp':      { area: 'internet', name: 'PCP',      fullName: 'Port Control Protocol' },
  'ipngwg':   { area: 'internet', name: 'IPNGWG',   fullName: 'IP Next Generation' },
  'ngtrans':  { area: 'internet', name: 'NGTRANS',  fullName: 'Next Generation Transition' },
  'dnsext':   { area: 'internet', name: 'DNSEXT',   fullName: 'DNS Extensions' },
  'dnsind':   { area: 'internet', name: 'DNSIND',   fullName: 'DNS Implementation and Deployment' },
  'behave':   { area: 'internet', name: 'BEHAVE',   fullName: 'Behavior Engineering for Hindrance Avoidance' },
  'ipv6':     { area: 'internet', name: 'IPv6',     fullName: 'IPv6 Working Group' },
  'softwire': { area: 'internet', name: 'SOFTWIRE', fullName: 'Softwires (IPv4/IPv6 Coexistence)' },
  'lisp':     { area: 'internet', name: 'LISP',     fullName: 'Locator/ID Separation Protocol' },
  'hip':      { area: 'internet', name: 'HIP',      fullName: 'Host Identity Protocol' },

  // ── Routing ──────────────────────────────────────────────────────────────────
  'idr':      { area: 'routing', name: 'IDR',     fullName: 'Inter-Domain Routing (BGP)' },
  'ospf':     { area: 'routing', name: 'OSPF',    fullName: 'Open Shortest Path First' },
  'isis':     { area: 'routing', name: 'ISIS',    fullName: 'IS-IS for IP Internets' },
  'mpls':     { area: 'routing', name: 'MPLS',    fullName: 'Multiprotocol Label Switching' },
  'bfd':      { area: 'routing', name: 'BFD',     fullName: 'Bidirectional Forwarding Detection' },
  'pim':      { area: 'routing', name: 'PIM',     fullName: 'Protocol Independent Multicast' },
  'pce':      { area: 'routing', name: 'PCE',     fullName: 'Path Computation Element' },
  'lsr':      { area: 'routing', name: 'LSR',     fullName: 'Link State Routing' },
  'trill':    { area: 'routing', name: 'TRILL',   fullName: 'Transparent Interconnection of Lots of Links' },
  'rtgwg':    { area: 'routing', name: 'RTGWG',   fullName: 'Routing Area Working Group' },
  'grow':     { area: 'routing', name: 'GROW',    fullName: 'Global Routing Operations' },
  'teas':     { area: 'routing', name: 'TEAS',    fullName: 'Traffic Engineering Architecture and Signaling' },
  'ccamp':    { area: 'routing', name: 'CCAMP',   fullName: 'Common Control and Measurement Plane' },
  'i2rs':     { area: 'routing', name: 'I2RS',    fullName: 'Interface to the Routing System' },
  'spring':   { area: 'routing', name: 'SPRING',  fullName: 'Source Packet Routing in Networking' },
  'ion':      { area: 'routing', name: 'ION',     fullName: 'Internetwork Operations' },
  'manet':    { area: 'routing', name: 'MANET',   fullName: 'Mobile Ad-Hoc Networks' },

  // ── Operations & Management ───────────────────────────────────────────────────
  'netconf':  { area: 'ops-management', name: 'NETCONF',  fullName: 'Network Configuration Protocol' },
  'opsec':    { area: 'ops-management', name: 'OPSEC',    fullName: 'Operational Security Capabilities for IP' },
  'bmwg':     { area: 'ops-management', name: 'BMWG',     fullName: 'Benchmarking Methodology' },
  'mboned':   { area: 'ops-management', name: 'MBONED',   fullName: 'MBONE Deployment' },
  'snmpv3':   { area: 'ops-management', name: 'SNMPv3',   fullName: 'SNMP Version 3' },
  'snmpv2':   { area: 'ops-management', name: 'SNMPv2',   fullName: 'SNMP Version 2' },
  'snmp':     { area: 'ops-management', name: 'SNMP',     fullName: 'Simple Network Management Protocol' },
  'netmod':   { area: 'ops-management', name: 'NETMOD',   fullName: 'Network Modeling (YANG)' },
  'opsawg':   { area: 'ops-management', name: 'OPSAWG',   fullName: 'Operations and Management Area Working Group' },
  'ipfix':    { area: 'ops-management', name: 'IPFIX',    fullName: 'IP Flow Information Export' },
  'rmonmib':  { area: 'ops-management', name: 'RMONMIB',  fullName: 'Remote Network Monitoring MIB' },
  'hubmib':   { area: 'ops-management', name: 'HUBMIB',   fullName: 'Ethernet Hub MIB' },
  'adslmib':  { area: 'ops-management', name: 'ADSLMIB',  fullName: 'ADSL MIB' },
  'atommib':  { area: 'ops-management', name: 'ATOMMIB',  fullName: 'AToM MIB' },
  'dime':     { area: 'ops-management', name: 'DIME',     fullName: 'Diameter Maintenance and Extensions' },
  'rap':      { area: 'ops-management', name: 'RAP',      fullName: 'Resource Allocation Protocol' },

  // ── Multimedia & Voice ────────────────────────────────────────────────────────
  'sip':      { area: 'multimedia', name: 'SIP',      fullName: 'Session Initiation Protocol' },
  'mmusic':   { area: 'multimedia', name: 'MMUSIC',   fullName: 'Multiparty Multimedia Session Control' },
  'sipping':  { area: 'multimedia', name: 'SIPPING',  fullName: 'Session Initiation Proposal Investigation' },
  'sipcore':  { area: 'multimedia', name: 'SIPCORE',  fullName: 'Session Initiation Protocol Core' },
  'avtcore':  { area: 'multimedia', name: 'AVTCORE',  fullName: 'Audio/Video Transport Core Maintenance' },
  'payload':  { area: 'multimedia', name: 'PAYLOAD',  fullName: 'Audio/Video Transport Payloads' },
  'rtcweb':   { area: 'multimedia', name: 'RTCWeb',   fullName: 'Real-Time Communication in WEB-browsers' },
  'xrblock':  { area: 'multimedia', name: 'XRBLOCK',  fullName: 'Metric Blocks for RTP/RTCP' },
  'avtext':   { area: 'multimedia', name: 'AVTEXT',   fullName: 'Audio/Video Transport Extensions' },
  'ecrit':    { area: 'multimedia', name: 'ECRIT',    fullName: 'Emergency Context Resolution with Internet Technologies' },
  'geopriv':  { area: 'multimedia', name: 'GEOPRIV',  fullName: 'Geographic Location/Privacy' },
  'stir':     { area: 'multimedia', name: 'STIR',     fullName: 'Secure Telephone Identity Revisited' },
  'simple':   { area: 'multimedia', name: 'SIMPLE',   fullName: 'SIP for Instant Messaging and Presence Leveraging Extensions' },
  'sigtran':  { area: 'multimedia', name: 'SIGTRAN',  fullName: 'Signaling Transport' },
  'enum':     { area: 'multimedia', name: 'ENUM',     fullName: 'Telephone Number Mapping' },
  'clue':     { area: 'multimedia', name: 'CLUE',     fullName: 'ControLling mUltiple streams for tElepresence' },
  'codec':    { area: 'multimedia', name: 'CODEC',    fullName: 'Internet Wideband Audio Codec' },
  'mts':      { area: 'multimedia', name: 'MTS',      fullName: 'Media Type Specifications and Registration Procedures' },
  'iptel':    { area: 'multimedia', name: 'IPTEL',    fullName: 'IP Telephony' },
  'p2psip':   { area: 'multimedia', name: 'P2PSIP',   fullName: 'Peer-to-Peer Session Initiation Protocol' },
  'drinks':   { area: 'multimedia', name: 'DRINKS',   fullName: 'Data for Reachability of Inter/intra-NetworK SIP' },

  // ── Email & Messaging ──────────────────────────────────────────────────────────
  '822ext':   { area: 'email', name: '822EXT',   fullName: 'RFC 822 Extensions (Email Format)' },
  'lemonade': { area: 'email', name: 'LEMONADE', fullName: 'Enhancements to Internet Email for Mobile Access' },
  'sieve':    { area: 'email', name: 'SIEVE',    fullName: 'Sieve Mail Filtering Language' },
  'eai':      { area: 'email', name: 'EAI',      fullName: 'Email Address Internationalization' },
  'fax':      { area: 'email', name: 'FAX',      fullName: 'Internet Fax Protocol' },
  'irc':      { area: 'email', name: 'IRC',      fullName: 'Internet Relay Chat' },
  'imapext':  { area: 'email', name: 'IMAPEXT',  fullName: 'IMAP Protocol Extensions' },
  'msgtrk':   { area: 'email', name: 'MSGTRK',   fullName: 'Message Tracking Protocol' },
  'mimi':     { area: 'email', name: 'MIMI',     fullName: 'More Instant Messaging Interoperability' },
  'mailmaint':{ area: 'email', name: 'MAILMAINT',fullName: 'Mail and Calendar Maintenance' },

  // ── Network Services (VPN, Tunneling, Carrier) ────────────────────────────────
  'l3vpn':    { area: 'network-services', name: 'L3VPN',   fullName: 'Layer 3 Virtual Private Networks' },
  'l2vpn':    { area: 'network-services', name: 'L2VPN',   fullName: 'Layer 2 Virtual Private Networks' },
  'pwe3':     { area: 'network-services', name: 'PWE3',    fullName: 'Pseudowire Emulation Edge to Edge' },
  'bess':     { area: 'network-services', name: 'BESS',    fullName: 'BGP Enabled ServiceS' },
  'pals':     { area: 'network-services', name: 'PALS',    fullName: 'Pseudowire And LDP-based Services' },
  'l2tpext':  { area: 'network-services', name: 'L2TPEXT', fullName: 'Layer Two Tunneling Protocol Extensions' },
  'nvo3':     { area: 'network-services', name: 'NVO3',    fullName: 'Network Virtualization Overlays' },
  'ipcdn':    { area: 'network-services', name: 'IPCDN',   fullName: 'IP over Cable Data Network' },

  // ── Wireless & Mobile ─────────────────────────────────────────────────────────
  'mobileip': { area: 'wireless', name: 'MobileIP', fullName: 'IP Mobility Support' },
  'mip4':     { area: 'wireless', name: 'MIP4',     fullName: 'Mobility for IPv4' },
  'mip6':     { area: 'wireless', name: 'MIP6',     fullName: 'Mobility for IPv6' },
  'mipshop':  { area: 'wireless', name: 'MIPSHOP',  fullName: 'MIP Selected Handover Optimization Protocols' },
  'netext':   { area: 'wireless', name: 'NETEXT',   fullName: 'Network-Based Mobility Extensions' },
  '6lo':      { area: 'wireless', name: '6LoWPAN',  fullName: 'IPv6 over Low-Power Wireless Personal Area Networks' },
  'roll':     { area: 'wireless', name: 'ROLL',     fullName: 'Routing Over Low-power and Lossy Networks' },

  // ── Historical origins (pseudo-WGs for era-based grouping) ────────────────────
  'origins-arpanet': {
    area: 'historical',
    name: 'ARPANET Era',
    fullName: 'ARPANET & Early Internet Protocols (RFC 1–999)',
    description: 'The founding documents of the internet, written before the IETF existed.',
    summary: 'These are the founding documents of the internet, written between 1969 and the late 1980s on the ARPANET before the IETF was established. They include the first protocol specifications, the invention of TCP/IP, early email and file transfer protocols, and the architectural decisions that shaped the internet. RFC 1 was written by Steve Crocker on April 7, 1969 — he was a UCLA grad student who invented the RFC format itself.'
  },

  // ── Independent submissions (pseudo-WGs by decade) ────────────────────────────
  'independent-1990s': {
    area: 'independent',
    name: '1990s',
    fullName: 'Independent & Informational RFCs — 1990s',
    description: 'RFCs published in the 1990s outside formal IETF working groups.',
    summary: 'Independent submissions, experimental proposals, and informational RFCs published during the 1990s — a decade that saw the birth of the World Wide Web, widespread internet adoption, and rapid protocol innovation outside the working group system.'
  },
  'independent-2000s': {
    area: 'independent',
    name: '2000s',
    fullName: 'Independent & Informational RFCs — 2000s',
    description: 'RFCs published in the 2000s outside formal IETF working groups.',
    summary: 'Independent submissions and informational RFCs from the 2000s, covering experimental proposals, best current practices, and individual contributions to internet standards outside the formal working group process.'
  },
  'independent-2010s': {
    area: 'independent',
    name: '2010s',
    fullName: 'Independent & Informational RFCs — 2010s',
    description: 'RFCs published in the 2010s outside formal IETF working groups.',
    summary: 'Independent and informational RFCs from the 2010s, spanning a period of significant internet growth, mobile proliferation, and cloud computing. Includes experimental proposals and individual contributions outside the formal working group system.'
  },
  'independent-2020s': {
    area: 'independent',
    name: '2020s',
    fullName: 'Independent & Informational RFCs — 2020s',
    description: 'RFCs published in the 2020s outside formal IETF working groups.',
    summary: 'The most recent independent and informational RFCs, published outside formal IETF working groups. Covers emerging protocols, experimental proposals, and individual contributions from the current decade.'
  },

  // ── Catch-all for WGs in the XML that aren\'t individually mapped ──────────────
  'misc-protocols': {
    area: 'independent',
    name: 'Other Protocols',
    fullName: 'Miscellaneous IETF Working Group RFCs',
    description: 'RFCs from smaller or disbanded IETF working groups not individually categorized.',
    summary: 'A collection of RFCs from the many smaller, specialized, or now-disbanded IETF working groups that each produced a small number of documents. Covers the long tail of IETF protocol work across decades of standards activity.'
  },
};

// ─── Manual overrides for key RFCs whose XML WG field is missing or wrong ────
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
  // NETCONF / YANG
  6241: 'netconf', 6242: 'netconf', 7950: 'netconf', 8040: 'netconf',
  // SSH
  4250: 'secsh', 4251: 'secsh', 4252: 'secsh', 4253: 'secsh', 4254: 'secsh',
  // IRC (individual submissions, no WG in XML)
  1459: 'irc', 2810: 'irc', 2811: 'irc', 2812: 'irc', 2813: 'irc', 7194: 'irc',
  // SMTP / Email core
  821: '822ext', 822: '822ext', 2821: '822ext', 5321: '822ext',
  // TCP/IP foundational
  791: 'origins-arpanet', 793: 'origins-arpanet', 768: 'origins-arpanet',
  // NTP
  5905: 'ntp', 1305: 'ntp',
  // PPP
  1661: 'pppext', 1662: 'pppext',
};

// ─── Helper functions ─────────────────────────────────────────────────────────
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

function parseRfcRefs(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.flatMap(v => {
    if (typeof v === 'string') return [parseInt(v.replace(/[^0-9]/g, ''), 10)].filter(n => !isNaN(n));
    if (v._) return [parseInt(v._.replace(/[^0-9]/g, ''), 10)].filter(n => !isNaN(n));
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

// Determine WG for RFCs with no working group in the XML
function assignEraWg(num, year) {
  const yr = parseInt(year) || 0;
  if (num < 1000 || yr < 1990) return 'origins-arpanet';
  if (yr < 2000) return 'independent-1990s';
  if (yr < 2010) return 'independent-2000s';
  if (yr < 2020) return 'independent-2010s';
  return 'independent-2020s';
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchRfcIndex() {
  console.log('📡 Fetching RFC index from IETF...');
  const response = await fetch('https://www.rfc-editor.org/in-notes/rfc-index.xml', {
    headers: { 'Accept': 'application/xml', 'User-Agent': 'RFC-Explorer-BuildScript/1.0' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
  const rfcEntries = parsed['rfc-index']['rfc-entry'] || [];
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

      const authors = (entry['author'] || []).map(a => {
        const name = extractText(a['name']?.[0]) || extractText(a);
        return name.trim();
      }).filter(Boolean).slice(0, 6);

      const obsoletesNums  = parseRfcRefs(entry['obsoletes']?.[0]?.['doc-id']);
      const obsoletedByNums = parseRfcRefs(entry['obsoleted-by']?.[0]?.['doc-id']);
      const updatesNums    = parseRfcRefs(entry['updates']?.[0]?.['doc-id']);
      const updatedByNums  = parseRfcRefs(entry['updated-by']?.[0]?.['doc-id']);

      // WG assignment
      const wgFromXml = extractText(entry['wg_acronym']?.[0]) || '';
      const wgNorm = wgFromXml.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const isNonWg = !wgNorm || wgNorm === 'nonworkinggroup' || wgNorm === 'non-working-group';

      let wg;
      if (RFC_WG_OVERRIDES[num]) {
        wg = RFC_WG_OVERRIDES[num];
      } else if (!isNonWg && WG_MAP[wgNorm]) {
        wg = wgNorm;
      } else if (!isNonWg) {
        // Has a WG acronym but it's not in our map → misc bucket
        wg = 'misc-protocols';
      } else {
        // No WG → era-based bucket
        wg = assignEraWg(num, year);
      }

      wgRfcCounts[wg] = (wgRfcCounts[wg] || 0) + 1;

      rfcs.push({
        number: num,
        title: title.slice(0, 200),
        wg,
        area: WG_MAP[wg]?.area || 'independent',
        status,
        date: dateStr,
        authors,
        summary: '',
        impact: '',
        beginner: '',
        obsoletes: obsoletesNums,
        obsoletedBy: obsoletedByNums,
        updates: updatesNums,
        updatedBy: updatedByNums
      });

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

  const categorized = rfcs.filter(r => r.area !== 'other').length;
  console.log(`✅ Processed ${rfcs.length} RFCs (${categorized} categorized), ${edges.length} edges`);
  return { rfcs, edges, wgRfcCounts };
}

function buildWgsJson(wgRfcCounts) {
  return Object.entries(WG_MAP).map(([slug, info]) => ({
    slug,
    name: info.name,
    fullName: info.fullName,
    area: info.area,
    description: info.description || '',
    summary: info.summary || '',
    rfcCount: wgRfcCounts[slug] || 0,
    keyRfcs: []
  })).filter(wg => wg.rfcCount > 0); // only include WGs that have RFCs
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
    name: 'Applications',
    tagline: 'The protocols users actually interact with',
    description: 'Application-layer protocols: HTTP, printing, directories, content delivery, and the standards that power the visible web.',
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
  },
  {
    slug: 'multimedia',
    name: 'Multimedia & Voice',
    tagline: 'Voice, video, and real-time communication',
    description: 'Session initiation, audio/video transport, WebRTC, location, and the protocols that power internet telephony and real-time media.',
    icon: '📞',
    color: 'from-cyan-900 to-cyan-700',
    funFact: 'SIP (RFC 3261) was originally designed to set up phone calls over IP, but today powers everything from WhatsApp calls to Zoom meetings to 911 emergency services.'
  },
  {
    slug: 'email',
    name: 'Email & Messaging',
    tagline: 'The original internet application',
    description: 'SMTP, IMAP, MIME, message filtering, and the standards that have carried electronic mail for over 50 years — plus IRC and instant messaging protocols.',
    icon: '✉️',
    color: 'from-yellow-900 to-yellow-700',
    funFact: 'Email predates the internet itself. The first email was sent in 1971, SMTP (RFC 821) was standardized in 1982, and RFC 822 defined the "From:" and "To:" headers still used today.'
  },
  {
    slug: 'network-services',
    name: 'Network Services',
    tagline: 'VPNs, tunneling, and carrier infrastructure',
    description: 'Layer 2 and Layer 3 VPNs, pseudowires, network virtualization, and the tunneling technologies that power enterprise and carrier networks.',
    icon: '🔀',
    color: 'from-orange-900 to-orange-700',
    funFact: 'MPLS L3VPNs (RFC 4364) are used by virtually every major ISP to provide private corporate network services. Your company\'s "private" WAN almost certainly runs over shared MPLS infrastructure.'
  },
  {
    slug: 'wireless',
    name: 'Wireless & Mobile',
    tagline: 'Keeping connected on the move',
    description: 'Mobile IP, handover optimization, mesh networking, and low-power IoT protocols that enable IP connectivity across wireless and mobile networks.',
    icon: '📡',
    color: 'from-teal-900 to-teal-700',
    funFact: 'Mobile IPv6 (RFC 6275) lets your phone keep the same IP address while moving between networks — the same principle that allows seamless handoff between cell towers.'
  },
  {
    slug: 'historical',
    name: 'Origins',
    tagline: 'The documents that started it all',
    description: 'The earliest RFCs from the ARPANET era — before the IETF, before the web, when a small group of researchers were inventing the internet from scratch.',
    icon: '📜',
    color: 'from-stone-800 to-stone-600',
    funFact: 'RFC 1 was written by Steve Crocker on April 7, 1969 — he was a 24-year-old UCLA grad student. He invented the RFC format itself as an informal way to share ideas, never imagining it would still be in use 55 years later.'
  },
  {
    slug: 'independent',
    name: 'Independent & Experimental',
    tagline: 'Outside the working group system',
    description: 'RFCs published as individual submissions, experimental proposals, and informational documents outside the formal IETF working group process — including some famous April Fool\'s jokes.',
    icon: '🔬',
    color: 'from-neutral-800 to-neutral-600',
    funFact: 'RFC 1149 (IP over Avian Carriers — carrier pigeons) was an April Fool\'s RFC from 1990. It was actually implemented in Bergen, Norway in 2001, achieving a packet loss rate of 55% and a ping time of 3000 seconds.'
  }
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 RFC Explorer — Data Fetch Script\n');

  mkdirSync(DATA_DIR, { recursive: true });

  let rfcEntries;
  try {
    const xml = await fetchRfcIndex();
    rfcEntries = await parseRfcIndex(xml);
  } catch (err) {
    console.error('❌ Failed to fetch/parse RFC index:', err.message);
    process.exit(1);
  }

  const { rfcs, edges, wgRfcCounts } = processRfcEntries(rfcEntries);

  const areasWithCounts = AREAS.map(area => ({
    ...area,
    wgCount: Object.values(WG_MAP).filter(w => w.area === area.slug).length,
    rfcCount: rfcs.filter(r => r.area === area.slug).length
  }));

  const wgs = buildWgsJson(wgRfcCounts);

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
