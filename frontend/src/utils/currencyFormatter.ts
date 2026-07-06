const currencyFormatter = (locale: string, currency: string, value: number) => {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
};

export default currencyFormatter;