import { defineTool } from "eve/tools";
import z from "zod";
import { policies } from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Search the institutional grievance policy repository. Use this for appeal procedures, SLA rules, escalation requirements, scholarship rules, finance procedures, residence issues, sensitive conduct cases, and department process questions.",
  inputSchema: z.object({
    query: z.string(),
    category: z.string().optional(),
  }),
  async execute(input) {
    const query = input.query.trim().toLowerCase();
    const category = input.category?.trim().toLowerCase();

    if (!query) {
      return {
        found: false,
        message: "A policy search query is required.",
      };
    }

    const matches = policies
      .map((policy) => {
        const searchable = [
          policy.title,
          policy.category,
          policy.summary,
          policy.escalationRule,
          policy.source,
          ...policy.keywords,
          ...policy.steps,
        ]
          .join(" ")
          .toLowerCase();

        const queryTerms = query
          .split(/\s+/)
          .filter(Boolean);

        const score = queryTerms.reduce(
          (total, term) =>
            total + (searchable.includes(term) ? 1 : 0),
          0,
        );

        const categoryMatch = category
          ? policy.category.toLowerCase() === category
          : true;

        return {
          policy,
          score,
          categoryMatch,
        };
      })
      .filter(
        (item) =>
          item.score > 0 && item.categoryMatch,
      )
      .sort((a, b) => b.score - a.score);

    return {
      found: matches.length > 0,
      count: matches.length,
      results: matches.slice(0, 5).map((item) => ({
        policyId: item.policy.policyId,
        title: item.policy.title,
        category: item.policy.category,
        summary: item.policy.summary,
        steps: item.policy.steps,
        slaHours: item.policy.slaHours ?? null,
        escalationRule: item.policy.escalationRule,
        source: item.policy.source,
      })),
    };
  },
});
