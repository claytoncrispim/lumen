export const TRAVELLER_KEYS = ['adults', 'youngAdults', 'children', 'infants'] as const

export type TravellerKey = (typeof TRAVELLER_KEYS)[number]

export type TravellerType = {
    key: TravellerKey
    label: string
    description: string
    icon: string
}

export type TravellerCounts = Record<TravellerKey, number>

export type TravellerTypeOption = Pick<TravellerType, 'key' | 'label' | 'description' | 'icon'>