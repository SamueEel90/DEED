// ============================================================
// DEED · TanStack Query provider — cache + stavy načítania pre celú appku.
// ============================================================
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // jeden klient na životnosť appky (useState → stabilný cez re-rendery)
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // mock dáta sa nemenia — necache-uj zbytočne refetchom
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
