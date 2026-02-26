type PageResponse<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

type FetchPage<T> = (from: number, to: number) => PromiseLike<PageResponse<T>> | PageResponse<T>

const DEFAULT_PAGE_SIZE = 1000
const DEFAULT_MAX_RETRIES = 2
const RETRY_DELAY_MS = 300

type FetchAllRowsOptions = {
  pageSize?: number
  maxRetries?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchAllRows<T>(
  fetchPage: FetchPage<T>,
  optionsOrPageSize: number | FetchAllRowsOptions = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const options = typeof optionsOrPageSize === "number" ? { pageSize: optionsOrPageSize } : optionsOrPageSize
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const allRows: T[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    let pageResponse: PageResponse<T> | null = null
    let lastError: unknown = null

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        pageResponse = await fetchPage(from, to)

        if (!pageResponse?.error) {
          break
        }

        throw new Error(pageResponse.error.message || "Failed to fetch rows")
      } catch (error) {
        lastError = error
        if (attempt === maxRetries) {
          throw error instanceof Error ? error : new Error("Failed to fetch rows")
        }
        await sleep(RETRY_DELAY_MS * (attempt + 1))
      }
    }

    if (!pageResponse) {
      throw lastError instanceof Error ? lastError : new Error("Failed to fetch rows")
    }

    const { data } = pageResponse

    if (!data || data.length === 0) {
      break
    }

    allRows.push(...data)

    if (data.length < pageSize) {
      break
    }

    from += pageSize
  }

  return allRows
}
