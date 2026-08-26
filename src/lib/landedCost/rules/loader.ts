// Destination rules registry + data-quality checks.
//
// The loader is where "versioned and dated" is enforced at runtime: every
// verified row older than RULES_MAX_AGE_DAYS produces a staleness warning
// that flows into the breakdown's warnings (calculate.ts passes
// rulesWarnings through), so an aging rate degrades loudly instead of
// silently drifting from reality.

import type { DestinationRules, SourcedValue } from '../types';
import { US } from './destinations/US';
import { CA } from './destinations/CA';
import { GB } from './destinations/GB';
import { DE } from './destinations/DE';
import { FR } from './destinations/FR';
import { AU } from './destinations/AU';
import { JP } from './destinations/JP';

export const RULES_MAX_AGE_DAYS = 90;

const REGISTRY: Record<string, DestinationRules> = {
  US, CA, GB, DE, FR, AU, JP,
};

export function getDestinationRules(country: string): DestinationRules | null {
  return REGISTRY[country] ?? null;
}

export function supportedDestinations(): string[] {
  return Object.keys(REGISTRY);
}

function isSourcedValue(x: unknown): x is SourcedValue<unknown> {
  return (
    typeof x === 'object' &&
    x !== null &&
    'value' in x &&
    'sourceUrl' in x &&
    'lastVerified' in x &&
    'verification' in x
  );
}

/**
 * Every SourcedValue in a rules object, with its dotted path. Used for
 * staleness checks here and for the seed-policy invariant tests.
 */
export function walkSourcedValues(
  node: unknown,
  path = ''
): Array<{ path: string; row: SourcedValue<unknown> }> {
  if (isSourcedValue(node)) return [{ path, row: node }];
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => walkSourcedValues(item, `${path}[${i}]`));
  }
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) =>
      walkSourcedValues(v, path ? `${path}.${k}` : k)
    );
  }
  return [];
}

/** Staleness warnings for verified rows older than the max age. `now` is
 * injected: the calculator itself stays clock-free and deterministic. */
export function collectRulesWarnings(rules: DestinationRules, now: Date): string[] {
  const warnings: string[] = [];
  for (const { path, row } of walkSourcedValues(rules)) {
    if (row.verification !== 'verified' || !row.lastVerified) continue;
    const ageMs = now.getTime() - new Date(row.lastVerified).getTime();
    const ageDays = Math.floor(ageMs / 86_400_000);
    if (ageDays > RULES_MAX_AGE_DAYS) {
      warnings.push(
        `Rule ${rules.country}.${path} was last verified ${ageDays} days ago (max ${RULES_MAX_AGE_DAYS}); re-verify against ${row.sourceUrl}.`
      );
    }
  }
  return warnings;
}

/** Rules + their current warnings, shaped for CalcContext. */
export function loadRulesFor(
  country: string,
  now: Date
): { rules: DestinationRules | null; rulesWarnings: string[] } {
  const rules = getDestinationRules(country);
  return {
    rules,
    rulesWarnings: rules ? collectRulesWarnings(rules, now) : [],
  };
}
