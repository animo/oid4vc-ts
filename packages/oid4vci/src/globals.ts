// Theses types are provided by the platform (so @types/node, @types/react-native, DOM)
// But therefore we need to add a ts-ignore

// @ts-ignore
export const URL = global.URL
// @ts-ignore
export const URLSearchParams = global.URLSearchParams

// @ts-ignore
export type Fetch = typeof fetch
export type FetchResponse = Awaited<ReturnType<Fetch>>
export type FetchHeaders = FetchResponse['headers']
