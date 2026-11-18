// India destination rules. Added 2026-11-18.
//
// Read 2026-11-18 from live fetches of the official texts cited on each
// row, then re-fetched by a second, adversarial pass the same day, which
// confirmed every row and found no later amendment through 2026-11-18.
// Owner-approved 2026-11-18.
//
// THE SHAPE OF THE INDIAN REGIME (why this file looks unlike the others):
// goods a person buys abroad for their own use are not classified by what
// they are. Customs Tariff Chapter 98, Note 1 puts them all under heading
// 9804 "even though they may be covered by a more specific heading
// elsewhere", so headphones, shoes and cosmetics pay ONE rate. That is why
// the 'default' duty row here is a verified number, where every other
// destination leaves it as a todo().
//
// INR has a 2 minor-unit exponent, so amountMinor is paise: Rs 1,000 is
// 100_000.

import type { DestinationRules, ReliefPolicy, TaxThresholdPolicy } from '../../types';
import { todo, verified } from '../seed';

const V = '2026-11-18';

// Union Budget 2026-27 documents (indiabudget.gov.in).
// The enacted text: Finance Act, 2026 (No. 4 of 2026), assented 2026-03-30.
const FINANCE_ACT_2026 = 'https://egazette.gov.in/WriteReadData/2026/271439.pdf';
const TRU_LETTER_2026 = 'https://www.indiabudget.gov.in/doc/cen/dojstru1.pdf';
const SWS_NOTIFICATION = 'https://www.indiabudget.gov.in/doc/cen/cus0326.pdf';
// CBIC tax information portal (documents open from the portal's own
// viewer; the paths are recorded in the notes).
const CBIC_PORTAL = 'https://taxinformation.cbic.gov.in/';
const POST_OFFICE_REGS =
  'https://thc.nic.in/Central%20Governmental%20Regulations/Office%20Regulations,2024.pdf';

// Rs 1,000 postal exemption, Notification 45/2025-Customs, Table I,
// S.No. 407. One entry grants Nil basic duty AND Nil IGST, so the duty
// relief and the tax threshold below are the same figure from the same row.
const POSTAL_EXEMPTION_NOTE =
  'Notification 45/2025-Customs (24 Oct 2025), Table I, S.No. 407: "Goods imported through postal parcels, packets and letters, the CIF value of which is not more than one thousand rupees per consignment": Nil basic duty, Nil IGST. POSTAL ONLY: a courier shipment has no such exemption. Portal path tax_repository/customs/notifications/notfns-2025/cs-tarr2025/cst-45-2025.pdf. In practice US postage alone exceeds Rs 1,000, so this never relieves a US import; it is encoded because it is the law. Not modeled: Customs Act s.25(6), under which duty of Rs 100 or less is not collected. The old Rs 5,000 gift exemption is unusable for purchases (DGFT Notification 35/2015-2020, CBIC Circular 4/2020).';

export const IN: DestinationRules = {
  country: 'IN',
  currency: 'INR',
  valuationBasis: verified<'CIF' | 'FOB'>(
    'CIF',
    CBIC_PORTAL,
    V,
    'Customs Valuation (Determination of Value of Imported Goods) Rules, 2007, rule 10(2): the value "shall include (a) the cost of transport, loading, unloading and handling charges associated with the delivery of the imported goods to the place of importation; (b) the cost of insurance to the place of importation". Not modeled: when insurance is not ascertainable customs adds a notional 1.125% of FOB (understates the base slightly), and ascertainable air freight is capped at 20% of FOB (so on a cheap item with expensive postage the engine, which adds the full shipping cost, overstates). Customs converts at its own notified exchange rate, not the ECB reference rate used here.'
  ),
  dutyRelief: verified<ReliefPolicy>(
    { kind: 'threshold', amountMinor: 100_000, basis: 'customs-value' },
    CBIC_PORTAL,
    V,
    POSTAL_EXEMPTION_NOTE
  ),
  dutyRates: [
    // Goods Chapter 98 keeps OUT of heading 9804 (Notes 4 and 7): motor
    // vehicles, alcoholic beverages, tobacco, printed books. They take
    // their ordinary chapter rates, which are not looked up, so duty on
    // them stays unknown rather than borrowing the 9804 rate.
    ...['22', '24', '4901', '8703', '8711'].map((hsPrefix) => ({
      hsPrefix,
      label: 'Import duty',
      rateBps: todo<number>(
        CBIC_PORTAL,
        'Excluded from heading 9804 by Chapter 98 Notes 4 and 7; the ordinary chapter rate applies and has not been looked up.'
      ),
    })),
    {
      hsPrefix: 'default',
      label: 'Import duty (with social welfare surcharge)',
      // ONE combined row, as the type requires for charges that stack:
      // basic customs duty 10% of the CIF value, plus Social Welfare
      // Surcharge at 10% of that duty (1% of CIF) = 11%.
      rateBps: verified(
        1_100,
        FINANCE_ACT_2026,
        V,
        `Heading 9804 "All dutiable goods imported for personal use", every product alike (Chapter 98 Note 1). Basic customs duty 10%: Finance Act, 2026, s.152(b) and Third Schedule, substitutes "10%" against all tariff items of heading 9804 with effect from 2026-04-01 (was 20%; TRU letter ${TRU_LETTER_2026}); Notification 45/2025-Customs Table I S.No. 404 carries the same 10%. Social Welfare Surcharge, 10% of the basic duty: Notification 03/2026-Customs (${SWS_NOTIFICATION}) omits Sl. No. 8H of Notification 11/2018-Customs from 2026-04-01, ending the exemption for heading 9804. Combined 11% of CIF. Medicines (9804 10 00) have their own entries and are not modeled.`
      ),
    },
  ],
  importTax: {
    label: 'IGST',
    rateBps: verified(
      1_800,
      CBIC_PORTAL,
      V,
      'Notification 9/2025-Integrated Tax (Rate), 17 Sept 2025, in force 22 Sept 2025, Schedule II (18%), S.No. 640: "9804 | All dutiable articles intended for personal use". Portal path tax_repository/gst/notifications/09-2025-ITR-Eng.pdf. Medicines for personal use are 5% (Schedule I), not modeled. With the 11% above this makes the total charge 30.98% of the CIF value.'
    ),
    baseIncludesShipping: verified(
      true,
      CBIC_PORTAL,
      V,
      'Customs Tariff Act, 1975, s.3(8): IGST is charged on the aggregate of the assessable value (CIF, so shipping is already inside) and the customs duty and surcharge on the article. Inert under CIF in the engine (never double-added); recorded for the economics.'
    ),
    threshold: verified<TaxThresholdPolicy>(
      {
        kind: 'threshold',
        amountMinor: 100_000,
        basis: 'customs-value',
        belowThreshold: 'no-import-tax',
      },
      CBIC_PORTAL,
      V,
      POSTAL_EXEMPTION_NOTE
    ),
  },
  carrierFees: [
    {
      carrier: 'default',
      label: 'Customs clearance fee (India Post)',
      flatMinor: verified(
        3_000,
        POST_OFFICE_REGS,
        V,
        'Post Office Regulations, 2024 (S.O. 5440(E), 16 Dec 2024), reg. 31(3) and Schedule III Table XII: Rs 30 recoverable from the addressee for each foreign parcel "if released after levying customs duty" (hence onlyWhenChargesDue). Read from a Gazette reprint on a government (nic.in) site; India Post\'s own site does not publish the figure. Couriers charge their own, larger, clearance fees.'
      ),
      onlyWhenChargesDue: true,
    },
  ],
  displayRounding: 'standard-minor-units',
  meta: {
    sourceUrl: 'https://www.cbic.gov.in/',
    notes:
      'Personal imports of laptops and tablets are limited to one unit without an import licence (DGFT Notification 23/2023). Product-standard rules (BIS for electronics and toys, cosmetics registration) were not reviewed and are not modeled.',
  },
};
