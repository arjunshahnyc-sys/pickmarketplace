import { describe, expect, it } from 'vitest';
import { MAX_SHARED_SPECS, sharedSpecLabels, specSource, specsOf, specsOfNames } from '../sharedSpecs';

// Spec chips read from listing names (the only spec data the feeds carry),
// added 2026-09-10 so a similar pick can say "Active noise canceling"
// instead of the bare word "noise". Vocabulary order is chip order.

const keys = (name: string) =>
  specsOf(name).map((c) => (c.value === undefined ? c.rule.key : `${c.rule.key}=${c.value}`));
const shared = (a: string[], b: string[]) => sharedSpecLabels(specsOfNames(a), specsOfNames(b));

describe('reading specs from one listing name', () => {
  it('reads a spec however the seller spells it', () => {
    expect(keys('Sony WH-1000XM6 Wireless Noise Canceling Headphones')).toEqual(['anc', 'wireless']);
    expect(keys('Anker Soundcore Space One Wireless Noise Cancelling Headphones')).toEqual(['anc', 'wireless']);
    expect(keys('Soundcore By Anker Space One Wireless ANC Over-Ear Headphones')).toEqual(['over-ear', 'anc', 'wireless']);
    expect(keys('Bose QuietComfort Headphones with Noise Cancellation')).toEqual(['anc']);
  });

  it('does not mistake a noise-cancelling microphone for noise-cancelling headphones', () => {
    expect(keys('HyperX Cloud II Gaming Headset with Noise-Cancelling Microphone')).toEqual(['mic']);
  });

  it('reads figures: battery hours, capacity, screen size, memory and storage', () => {
    expect(keys('Sony WH-1000XM6 Over-Ear Headphones, Premium Bluetooth LDAC Audio, 12 Microphones, 30-Hour Battery +')).toEqual([
      'over-ear', 'ldac', 'bluetooth', 'battery-hours=30', 'mic',
    ]);
    expect(keys('Space One Headphones with Adaptive Noise Cancelling and 40H of ANC Playtime')).toEqual(['anc', 'battery-hours=40']);
    expect(keys('Earbuds, up to 8 hours of playtime')).toEqual(['battery-hours=8']);
    expect(keys('Headphones, battery life up to 50 hours')).toEqual(['battery-hours=50']);
    expect(keys('Stanley Quencher H2.0 FlowState Tumbler 40 oz')).toEqual(['oz=40']);
    expect(keys('CeraVe Moisturizing Cream 1.89oz')).toEqual(['oz=1.89']);
    expect(keys('LG 27 inch UltraGear OLED Gaming Monitor')).toEqual(['screen-inch=27', 'oled']);
    expect(keys('Dell 14" Laptop, 16GB RAM, 1TB SSD')).toEqual(['screen-inch=14', 'ram-gb=16', 'storage-gb=1024']);
  });

  it('reads nothing from a name that states no spec', () => {
    expect(keys('CeraVe Daily Moisturizing Lotion')).toEqual([]);
    expect(keys('Nike Dunk Low Retro')).toEqual([]);
  });

  it('reads only the item in a bundle title, not what the bundle adds', () => {
    expect(specSource('Sony WH-1000XM6 Noise Canceling Headphones + WI-C100 Wireless Earbuds')).toBe('Sony WH-1000XM6 Noise Canceling Headphones');
    expect(keys('Sony WH-1000XM6 Noise Canceling Headphones + WI-C100 Wireless Earbuds')).toEqual(['anc']);
    expect(keys('Sony WH-1000XM6 Noise-Canceling Headphones Silver with WI-C100 Wireless In-Ear Headphones')).toEqual(['anc']);
    expect(keys('Sony Wireless Noise Canceling Headphones Black w/ Deco Gear Earpads & Master Guide')).toEqual(['anc', 'wireless']);
    expect(keys('Sony WH-1000XM6 Best Wireless Noise Canceling Headphones Platinum Silver Bundle with Deco Gear Pro Audio Headphone Stand')).toEqual(['anc', 'wireless']);
    // "with" introducing features is not a bundle.
    expect(keys('Anker Soundcore Space One Over-Ear Hi-Res Bluetooth Headphones with Adaptive Noise Cancelling and 40H of ANC Playtime - Black')).toEqual([
      'over-ear', 'anc', 'hi-res', 'bluetooth', 'battery-hours=40',
    ]);
  });
});

describe('what two items share', () => {
  it('is what both state, in vocabulary order, whatever order the names use', () => {
    expect(shared(['40H ANC Playtime Bluetooth Over-Ear Headphones'], ['Over ear LDAC bluetooth headphones, 30 hour battery'])).toEqual([
      'Over ear', 'Bluetooth', '30+ hr battery',
    ]);
  });

  it('is empty when the names state no spec in common', () => {
    expect(shared(['CeraVe Moisturizing Cream 16 oz'], ['CeraVe Daily Moisturizing Lotion'])).toEqual([]);
    expect(shared(['Wireless Over-Ear Headphones'], ['In-Ear Earbuds with 8 hours playtime'])).toEqual([]);
  });

  it('shares a figure as the lower one for battery life and only when equal for a size', () => {
    expect(shared(['Headphones, 30-Hour Battery'], ['Headphones, 40H of ANC Playtime'])).toEqual(['30+ hr battery']);
    expect(shared(['Tumbler 40 oz'], ['Bottle 30 oz'])).toEqual([]);
    expect(shared(['Tumbler 40 oz Insulated'], ['Insulated Bottle 40oz'])).toEqual(['40 oz', 'Insulated']);
  });

  it('keeps the lowest battery figure any listing of an item states', () => {
    const item = specsOfNames(['Headphones, up to 55 hours playtime', 'Headphones, 40H ANC Playtime']);
    expect(item.get('battery-hours')?.value).toBe(40);
  });

  it('hides a spec another shared spec already states', () => {
    expect(shared(['Wireless Bluetooth Headphones'], ['Bluetooth Wireless Earbuds'])).toEqual(['Bluetooth']);
    expect(shared(['Multipoint Bluetooth Wireless Headphones'], ['Wireless Multi-point Bluetooth Headphones'])).toEqual(['Multipoint Bluetooth']);
  });

  it(`never shows more than ${MAX_SHARED_SPECS} chips`, () => {
    const everything = 'Over-Ear Noise Cancelling LDAC Hi-Res Bluetooth Foldable Headphones, 40H Playtime, Microphone, Water Resistant';
    expect(shared([everything], [everything])).toEqual(['Over ear', 'Active noise canceling', 'LDAC audio', 'Hi-Res audio', 'Bluetooth']);
  });
});
