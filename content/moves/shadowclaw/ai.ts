/**
 * 暗影爪 / shadowclaw 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * `ai.strikeUnseen`（默认开）打开时，目标当前正攻击别人、没有看着施法者的那一刻 priority 抬到 42——
 * 那正是暗算窗口，这一爪吃满加成；关闭则不挑时机，按普通中近距离抓击排序。
 * 放完之后：交回共享交战计划；这一爪不改站位、也不退开。
 */
namespace PokemonSkills {
    function shadowclawUnseen(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return !(typeof target.attacking === "string" && target.attacking === self.ref);
    }

    CompanionBehavior.registerUse(shadowclawId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (CompanionBehavior.ai<boolean>(capability, "strikeUnseen", true) && shadowclawUnseen(context, target)) return 42;
            return 24;
        }
    });

    addPreferences(shadowclawId, {}, [
        field(pathOf("deep"), "深影式", "boolean", {
            help: "开启：威力 ×1.12、影铺远 0.6 格、影痕久 30 刻、暗算加成多 0.1，代价是起手多 3 刻、冷却多 8 刻；关闭：出手更快、爪面宽 0.12 格、冷却更短，威力 ×0.94。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出手，先走近；越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.strikeUnseen"), "偷袭窗口", "boolean", {
            help: "开启：目标没在看着自己、正在打别人时优先出手（暗算加成满额）；关闭：不挑时机，按普通中近距离抓击排序。"
        })
    ]);
}
