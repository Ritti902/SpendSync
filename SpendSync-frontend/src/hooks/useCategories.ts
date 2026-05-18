import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { normalizeCategories } from "@/lib/categories";

export function useCategories(type: "expense" | "income" = "expense") {
  const query = useQuery({
    queryKey: ["categories", type],
    queryFn: () => api.listCategories(type),
    staleTime: 5 * 60_000,
  });

  return {
    ...query,
    categories: query.data ?? [],
    options: normalizeCategories(query.data, type),
  };
}
