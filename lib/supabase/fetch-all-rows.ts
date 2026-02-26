type PageResponse<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

type FetchPage<T> = (from: number, to: number) => PromiseLike<PageResponse<T>> | PageResponse<T>

const DEFAULT_PAGE_SIZE = 1000

export async function fetchAllRows<T>(fetchPage: FetchPage<T>, pageSize = DEFAULT_PAGE_SIZE): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await fetchPage(from, to)

    if (error) {
      throw new Error(error.message || "Failed to fetch rows")
    }

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
