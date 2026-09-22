/**
 * 叶刃 / leafblade 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在自己 `ai.maxChase`（默认 6）格以内；更远交给
 *   共享接近逻辑。它是一记高威力单体接触斩并削防，`ai.finishLow`（默认开）在对手血量偏低时抬优先级——
 *   一刀收掉或至少压出错口；否则按普通近战重击排序。
 * 放完之后：主目标已被切开并削防，交回共享顺序决定是继续贴身还是走位。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(leafbladeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "finishLow", true)) return 26;
            const ratio = CompanionBehavior.ratio(target);
            return ratio <= 0.4 ? 42 : 26;
        }
    });

    addPreferences(leafbladeId, {}, [
        field(pathOf("twohand"), "双手式", "boolean", {
            help: "开启：威力 ×1.2、挥斩张角 ×1.1、削防多 1 档，但起手 +3 刻、收招 +2 刻、冷却 +6 刻，适合一击定胜负。关闭（单手式，默认）：起手更快、冷却少 4 刻，但威力 ×0.95、波及略窄，适合贴身连挥。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "超过这个距离就不主动出手，先贴近；叶刃必须贴身，数值比远程招小。"
        }),
        field(pathOf("ai.finishLow"), "收残血", "boolean", {
            help: "开启：对手血量低于四成时优先挥出这一记重斩，尝试收掉或压低；关闭：不看血量，按普通近战重击排序。"
        })
    ]);
}
