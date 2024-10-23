import type { FetchResponse } from '../globals'

export class Oid4vcInvalidFetchResponseError extends Error {
  public readonly response: FetchResponse

  public constructor(
    message: string,
    public readonly textResponse: string,
    response: FetchResponse
  ) {
    super(`${message}\n${textResponse}`)
    this.response = response.clone()
  }
}
