export type CurrencyRecord = {
  symbol: string
  name: string
  symbol_native: string
  decimal_digits: number
  rounding: number
  code: string
  name_plural: string
}

export type CurrencyMap = Record<string, CurrencyRecord>

export type CurrencyOption = Pick<CurrencyRecord, 'code' | 'name' | 'symbol'>