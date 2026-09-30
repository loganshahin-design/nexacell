export const fmt = (n: number, d = 0) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("pt-PT", {
        maximumFractionDigits: d,
        minimumFractionDigits: 0,
      }).format(n)
    : "∞";

// Número com sinal explícito (útil em dB).
export const signed = (n: number, d = 1) => {
  const r = Number(n.toFixed(d));
  return r === 0 ? "0" : (r > 0 ? "+" : "") + fmt(r, d);
};
