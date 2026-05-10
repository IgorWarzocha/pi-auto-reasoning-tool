import { StringEnum, Type } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type ToolReasoningLevel = "low" | "medium" | "high";
type AppliedReasoningLevel = "off" | "minimal" | ToolReasoningLevel | "xhigh";

type LastSelection = {
	requestedLevel: ToolReasoningLevel;
	appliedLevel: AppliedReasoningLevel;
	previousLevel: AppliedReasoningLevel;
};

const TOOL_REASONING_LEVELS = ["low", "medium", "high"] as const;
const DEFAULT_REASONING_LEVEL = "low" satisfies ToolReasoningLevel;

function formatModelNote(
	ctx: ExtensionContext,
	requestedLevel: ToolReasoningLevel,
	appliedLevel: AppliedReasoningLevel,
): string | undefined {
	if (!ctx.model) return "No model is selected yet; Pi may clamp this level after a model is selected.";
	if (!ctx.model.reasoning && appliedLevel === "off") {
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
		description: "Change reasoning level.",
		promptSnippet: "Change reasoning effort when task complexity changes.",
		promptGuidelines: [
			"change_reasoning: You start on low by default; do not call with level=low unless lowering after a prior increase.",
			"change_reasoning: You may change reasoning level during your turn if task complexity changes.",
			"change_reasoning: Use sparingly; avoid standalone calls when another useful tool call can run in parallel.",
			"change_reasoning: Use medium for complex single tasks, feature planning, or multi-step implementation.",
			"change_reasoning: Use high for multi-area architecture work, hard debugging, or unexpectedly difficult tasks.",
		],
		parameters: Type.Object({
			level: StringEnum(TOOL_REASONING_LEVELS, {
				description: "low | medium | high",
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

	pi.on("agent_end", async () => {
		pi.setThinkingLevel(DEFAULT_REASONING_LEVEL);
	});
}
