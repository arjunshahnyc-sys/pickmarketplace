// France destination rules.
// Structural rows verified 2026-08-26 (live fetches, adversarially
// re-checked, owner-approved). Intra-EU purchases never reach these rules.
// The EU transitional regime is encoded as flat-below-threshold, same as
// DE.ts: EUR 3 per item at or under EUR 150 (until 2028-07-01), ad valorem
// TARIC rates above.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { EU_DUTY_RATES } from '../euRates';
import { verified } from '../seed';

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
    {
      kind: 'flat-below-threshold',
      amountMinor: 15_000,
      basis: 'intrinsic-goods-value',
      flatDutyMinorPerItem: 300,
    },
    'https://taxation-customs.ec.europa.eu/news/guidance-and-legal-text-temporary-flat-fee-low-value-imports-which-will-apply-until-1-july-2028-2026-06-08_en',
    V,
    'The EUR 150 franchise was abolished 2026-07-01, replaced by a temporary flat EUR 3 per-item duty on consignments up to EUR 150 until 2028-07-01 (EU Commission; corroborated verbatim by La Poste). Threshold basis follows the intrinsic-value test the EU uses for low-value consignments.'
  ),
  // Shared EU Common Customs Tariff rates (see euRates.ts): apply only
  // ABOVE the EUR 150 flat-fee band.
  dutyRates: EU_DUTY_RATES,
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
