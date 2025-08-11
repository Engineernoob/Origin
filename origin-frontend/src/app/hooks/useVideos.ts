import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

// Adjust keys as needed for your endpoint
type Params = Record<string, string | number | undefined | null>;

function toSearch(params: Params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v)); // <-- ensure string
  }
  return usp.toString();
}

export function useVideo(params: Params) {
  const qs = toSearch(params);
  const key = qs ? `/api/video?${qs}` : "/api/video";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    videos: data ?? null,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
