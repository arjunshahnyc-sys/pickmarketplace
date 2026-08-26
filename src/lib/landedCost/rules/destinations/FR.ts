// France destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). Intra-EU purchases never reach these rules.
// Same EU flat-fee SCHEMA GAP as DE.ts: the abolished EUR 150 exemption is
// replaced by a temporary flat EUR 3 per-item duty (until 2028-07-01) that
// this schema cannot express yet — do not fill ad valorem rates before the
// engine gains a flat-per-item duty policy.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-08-26';
const TARIC = 'https://ec.europa.eu/taxation_customs/dds2/taric/taric_consultation.jsp';
const DOUANE = 'https://www.douane.gouv.fr/fiche/anticiper-les-frais-de-douane-dun-colis';

export const FR: DestinationRules = {
  country: 'FR',
  currency: 'EUR',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'CIF',
    DOUANE,
    V,
    'French customs computes duty on the valeur CAF (cost + insurance + freight); corroborated by La Poste.'
  ),
  dutyRelief: verified<ReliefPolicy>(
    { kind: 'none' },
    'https://taxation-customs.ec.europa.eu/news/guidance-and-legal-text-temporary-flat-fee-low-value-imports-which-will-apply-until-1-july-2028-2026-06-08_en',
    V,
    'The EUR 150 franchise was abolished 2026-07-01, replaced by a temporary flat EUR 3 per-item duty on consignments up to EUR 150 until 2028-07-01 (EU Commission; corroborated by La Poste). Flat fee not yet expressible; see header comment.'
  ),
  dutyRates: [
    {
      hsPrefix: 'default',
      label: 'Import duty',
      rateBps: todo(TARIC, 'Per-heading rates from TARIC. BLOCKED on the flat-fee schema gap described in the header comment.'),
    },
  ],
  importTax: {
    label: 'Import VAT',
    rateBps: verified(
      2_000,
      DOUANE,
      V,
      'French TVA standard rate 20%, due from the first euro on imports. Reduced rates exist for some categories (books, food); 2000 bps is the standard-rate default.'
    ),
    baseIncludesShipping: verified(
      true,
      DOUANE,
      V,
      'Import VAT is computed on goods value + transport costs + customs duties. Inert under CIF in the engine (never double-added); duty enters the base, which the engine already models.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      { kind: 'threshold', amountMinor: 15_000, basis: 'intrinsic-goods-value', belowThreshold: 'merchant-collects' },
      'https://taxation-customs.ec.europa.eu/customs/customs-procedures-import-and-export/customs-operations/customs-formalities-low-value-consignments_en',
      V,
      'IOSS operates with a EUR 150 intrinsic-value ceiling (confirmed still current by the EU flat-fee guidance dated 2026-06-16). IOSS is optional for sellers; non-IOSS parcels are taxed at the border from EUR 0. The engine words this as an assumption.'
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs handling fee',
      flatMinor: verified(
        800,
        'https://www.laposte.fr/conseils-pratiques/comment-payer-frais-de-douane-colis-international',
        V,
        'La Poste frais de gestion, EUR 8 TTC full rate in metropolitan France (EUR 2 or 5 when paid online; 7 to 7.50 in overseas departments). Charged only when duties/taxes are due at the border (hence onlyWhenChargesDue; waived for IOSS/prepaid parcels per aide.laposte.fr).'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: { sourceUrl: TARIC },
};
