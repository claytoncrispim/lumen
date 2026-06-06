import commonCurrency from '../data/commonCurrency.json'
import type { CurrencyMap, CurrencyOption } from '../types/CurrencyType'

// Normalize raw currency JSON to the minimal shape needed by selector UIs.
const currenciesData = commonCurrency as CurrencyMap

const transformedData: CurrencyOption[] = Object.values(currenciesData).map((currency) => ({
    code: currency.code,
    symbol: currency.symbol,
    name: currency.name,
}))

export default transformedData