const euro = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' });

/** An amount in Greek format for use in messages, e.g. 1.234,56 €. Templates use the currency pipe. */
export function formatEuro(amount: number): string {
  return euro.format(amount);
}
