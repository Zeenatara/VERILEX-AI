import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS (analyses_select_own) restricts this to the caller's own rows even
    // without the explicit filter below; the filter just avoids an unneeded
    // round-trip of other users' ids being considered at all.
    const { data, error } = await context.supabase
      .from("analyses")
      .select("id, question, summary, jurisdiction, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[history] Failed to list analyses:", error);
      throw new Error("Could not load your analysis history.");
    }

    return (data ?? []).map((row) => {
      const result = row.result as { issueCount?: number } | null;
      return {
        id: row.id as string,
        question: row.question as string,
        summary: row.summary as string | null,
        jurisdiction: row.jurisdiction as string | null,
        issueCount: typeof result?.issueCount === "number" ? result.issueCount : null,
        createdAt: row.created_at as string,
      };
    });
  });

export const getAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    if (!data || typeof data !== "object" || typeof (data as { id?: unknown }).id !== "string") {
      throw new Error("An analysis id is required.");
    }
    return { id: (data as { id: string }).id };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("analyses")
      .select("id, question, answer, jurisdiction, summary, result, created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      console.error("[history] Failed to load analysis:", error);
      throw new Error("Could not load that analysis.");
    }
    if (!row) {
      throw new Error("Analysis not found.");
    }

    return row;
  });
