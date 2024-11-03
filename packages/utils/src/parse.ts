import * as v from 'valibot'
import { JsonParseError } from './error/JsonParseError'
import { ValidationError } from './error/ValidationError'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type BaseSchema = v.BaseSchema<any, any, any>
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type InferOutputUnion<T extends readonly any[]> = {
  [K in keyof T]: v.InferOutput<T[K]>
}[number]

export function stringToJsonWithErrorHandling(string: string, errorMessage?: string) {
  try {
    return JSON.parse(string)
  } catch (error) {
    throw new JsonParseError(errorMessage ?? 'Unable to parse string to JSON.', string)
  }
}

export function parseWithErrorHandling<Schema extends BaseSchema>(
  schema: Schema,
  data: unknown,
  customErrorMessage?: string
): v.InferOutput<Schema> {
  const parseResult = v.safeParse(schema, data)

  if (!parseResult.success) {
    throw new ValidationError(
      customErrorMessage ?? `Error validating schema with data ${JSON.stringify(data)}`,
      parseResult.issues
    )
  }

  return parseResult.output
}