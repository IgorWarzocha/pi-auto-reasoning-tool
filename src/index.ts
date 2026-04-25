import { StringEnum, Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

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
		description: "Set your reasoning level for the current task.",
		promptSnippet:
			"Set reasoning level sparingly: low default/simple/back-and-forth/cleanup; medium complex single task or feature planning; high multiple tasks, architecture-spanning work, or unexpectedly hard issues.",
		promptGuidelines: [
			"Use change_reasoning sparingly; it is often unnecessary because low is the default operating mode.",
			"Prefer calling change_reasoning in parallel with other useful tool calls so you do not waste a turn only changing reasoning.",
			"Use low for single simple tasks, back-and-forth conversations, or simple cleanup after harder tasks.",
			"Use medium for complex single tasks or planning features.",
			"Use high for handling multiple tasks in one turn, work spanning different architecture elements, or unexpected hard-to-solve issues during a turn.",
		],
		parameters: Type.Object({
			level: StringEnum(TOOL_REASONING_LEVELS, {
				description: "Reasoning level to use for this task: low, medium, or high.",
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
