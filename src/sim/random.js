export class RNG {
  constructor(seed = 123456789) {
    this.seed = (Number(seed) || 1) >>> 0;
  }
  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  float(min, max) {
    return min + this.next() * (max - min);
  }
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  weighted(items, weightKey = 'weight') {
    const total = items.reduce((sum, item) => sum + (item[weightKey] ?? 1), 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item[weightKey] ?? 1;
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }
  shuffle(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  normal(mean = 0, sd = 1) {
    const u = Math.max(this.next(), 1e-9);
    const v = Math.max(this.next(), 1e-9);
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const round1 = value => Math.round(value * 10) / 10;
export const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
