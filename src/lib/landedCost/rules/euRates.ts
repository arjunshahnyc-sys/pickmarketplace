// EU Common Customs Tariff conventional (MFN / erga omnes) duty rates for
// the curated headings, shared by DE.ts and FR.ts so the two can never
// drift. Verified 2026-08-26 against the official CN 2026 annex (Commission
// Implementing Regulation (EU) 2025/1926, OJ PDF on EUR-Lex), adversarially
// re-checked, owner-approved (Customs Rules Worksheet, round 2).
//
// These ad valorem rates apply only ABOVE the EUR 150 flat-fee band (see
// the dutyRelief policy in DE.ts/FR.ts). Watches (9102) are deliberately
// absent: the EU charges a compound duty (4.5%, min EUR 0.30 / max EUR 0.80
// per piece) that this ad valorem schema cannot express; above-threshold
// watches stay on the honest unknown path.
//
// CAVEAT (applies to every row): these are CN conventional base rates.
// TARIC-level origin-specific measures (anti-dumping, countervailing,
// retaliatory duties, autonomous suspensions) could not be verified because
// the TARIC consultation tool renders client-side. Origin-specific rows
// should be added as combined rates when verified.

import type { DutyRateRule } from '../types';
import { dutyRate, todo } from './seed';

const V = '2026-08-26';
const CN_2026 = 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202501926';
const TARIC = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';

const r = (hsPrefix: string, bps: number, line: string, notes?: string, label?: string) =>
  dutyRate(hsPrefix, bps, { line, sourceUrl: CN_2026, lastVerified: V, notes, label });

export const EU_DUTY_RATES: DutyRateRule[] = [
  r('8518', 0, '8518 30 00', 'Free across the entire heading (headphones, speakers, microphones).'),
  r('8471', 0, '8471 30 00', 'Free across the entire heading (ITA goods: laptops, keyboards, input units).'),
  r('852852', 0, '8528 52 10', 'ADP-connectable computer monitors are Free; see 852872 for TVs.', 'Import duty (monitors)'),
  r('852872', 1_400, '8528 72 40', 'All colour TV lines are 14%; monitors are Free (see 852852).', 'Import duty (televisions)'),
  r('8517', 0, '8517 13 00', 'Free across the entire heading (smartphones, telephones, network apparatus).'),
  r('8525', 0, '8525 89 00', 'Free across the entire heading (digital cameras, camcorders).'),
  r('9504', 0, '9504 50 00', 'Consoles Free; nearly the whole heading is Free (playing cards 2.7% are the exception).'),
  r('6404', 1_690, '6404 11 00', 'Sports/textile-upper footwear; rubber/plastic-soled lines 16.9%, textile-soled slippers lower. Tight dispersion.', 'Import duty (footwear)'),
  r('3304', 0, '3304 99 00', 'Free across the entire heading (skincare, makeup).'),
  r('3303', 0, '3303 00 90', 'Both perfume/toilet-water lines Free.'),
  r('4202', 270, '4202 92 91', 'Textile-outer backpack line 2.7%; heading disperses by material (plastic sheeting 9.7%, leather 3%). Archetype backpack is textile.', 'Import duty (bags)'),
  r('8516', 270, '8516 71 00', 'Coffee makers 2.7%; almost the whole heading is 2.7%.'),
  r('9503', 470, '9503 00 35', 'Plastic construction toys 4.7%; heading is bimodal 0%/4.7% by material.', 'Import duty (toys)'),
  r('9506', 270, '9506 91 90', 'General fitness equipment 2.7%; most consumer lines 2.7%, some 0%.', 'Import duty (sports equipment)'),
  {
    hsPrefix: 'default',
    label: 'Import duty',
    rateBps: todo(TARIC, 'Ad valorem TARIC rates apply only ABOVE the EUR 150 flat-fee band; headings outside the curated set stay unknown until looked up.'),
  },
];
