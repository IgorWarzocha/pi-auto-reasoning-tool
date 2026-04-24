import { StringEnum, Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

type LastSelection = {
	requestedLevel: ThinkingLevel;
	appliedLevel: ThinkingLevel;
	previousLevel: ThinkingLevel;
};

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

function formatModelNote(ctx: ExtensionContext, requestedLevel: ThinkingLevel, appliedLevel: ThinkingLevel): string | undefined {
	if (!ctx.model) return "No model is selected yet; Pi may clamp this level after a model is selected.";
	if (!ctx.model.reasoning && appliedLevel === "off" && requestedLevel !== "off") {
		return `Current model ${ctx.model.provider}/${ctx.model.id} does not advertise reasoning support, so Pi clamped the level to off.`;
	}
	if (requestedLevel !== appliedLevel) {
		return `Pi clamped ${requestedLevel} to ${appliedLevel} for ${ctx.model.provider}/${ctx.model.id}.`;
	}
	return undefined;
}

export default function autoReasoningSelector(pi: ExtensionAPI) {
	let lastSelection: LastSelection | undefined;

	pi.registerTool({
		name: "change_reasoning",
		label: "Change Reasoning",
		description: "Set your reasoning level for the current task.",
		promptSnippet: "Set reasoning level when the user prompt implies substantial follow-up work: default medium; low for small/simple, high for hard/risky/broad, xhigh extreme.",
		promptGuidelines: [
			"Consider change_reasoning only after analyzing whether the user prompt implies substantial follow-up work; it often does not need to be called.",
			"Default to medium for substantial normal coding/debugging work or when unsure.",
			"Skip change_reasoning for answers, quick checks, or obvious/simple/mechanical tasks unless the current level is clearly wrong.",
		],
		parameters: Type.Object({
			level: StringEnum(THINKING_LEVELS, {
				description: "Reasoning level to use for this task.",
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const previousLevel = pi.getThinkingLevel();
			pi.setThinkingLevel(params.level);
			const appliedLevel = pi.getThinkingLevel();

			lastSelection = {
				requestedLevel: params.level,
				appliedLevel,
				previousLevel,
			};

			const note = formatModelNote(ctx, params.level, appliedLevel);
			return {
				content: [
					{
						type: "text",
						text: [
							`Reasoning level: ${previousLevel} → ${appliedLevel}${params.level !== appliedLevel ? ` (requested ${params.level})` : ""}.`,
							"The new level applies to subsequent model calls.",
							note,
						]
							.filter(Boolean)
							.join("\n"),
					},
				],
				details: lastSelection,
			};
		},
	});
}
