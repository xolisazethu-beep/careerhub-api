"use client";

import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { deleteJob, type PaginatedJobs } from "@/lib/api";

/** What `onMutate` stashes so `onError` can put every cache entry back. */
interface DeleteContext {
  previous: Array<[QueryKey, InfiniteData<PaginatedJobs> | undefined]>;
}

/**
 * Week 2 Day 4, Concept 4 — optimistic delete.
 *
 * The classic three-callback pattern:
 *   • onMutate  — cancel in-flight ["jobs"] fetches, snapshot the cache, then
 *                 remove the job from every cached page so it vanishes instantly.
 *   • onError   — restore the snapshot (the server rejected the delete).
 *   • onSettled — invalidate ["jobs"] so the list reconciles with the server.
 *
 * The infinite list is keyed `["jobs", filters]`, so we target the cache by the
 * `["jobs"]` PREFIX (`getQueriesData`/`setQueriesData`) — that updates every
 * filter combination the user has visited, not just the active one.
 */
export function useDeleteJob(onDeleted?: (id: string) => void) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteContext>({
    mutationFn: (id: string) => deleteJob(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["jobs"] });

      // Snapshot every ["jobs", *] entry so a failure can roll back exactly.
      const previous = queryClient.getQueriesData<InfiniteData<PaginatedJobs>>({
        queryKey: ["jobs"],
      });

      // Optimistically drop the job from each cached page's `items`.
      queryClient.setQueriesData<InfiniteData<PaginatedJobs>>(
        { queryKey: ["jobs"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((job) => job.id !== id),
              totalCount: Math.max(0, page.totalCount - 1),
            })),
          };
        },
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSuccess: (_data, id) => {
      onDeleted?.(id);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
