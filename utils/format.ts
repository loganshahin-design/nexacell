export const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: d }).format(n);
