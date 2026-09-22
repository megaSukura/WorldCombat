/**
 * 攀瀑 / waterfall 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.preferUnflinched`（默认开）打开时，已经带着共享畏缩身份的目标排后——刚被震懵的人
 *   再拍一下意义不大；施法者自己湿透（雨里、水里）时水势更盛，这时排得更前。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：冲退与震懵留下的身位差交回共享交战计划。
 */
namespace PokemonSkills {
    function waterfallWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
    }

    CompanionBehavior.registerUse("waterfall", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterfallWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !waterfallWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "preferUnflinched", true) && CompanionBehavior.status(context, target, "flinch")) score -= 8;
            if (self.wet) score += 8;
            return score;
        }
    });

    addPreferences("waterfall", {}, [
        field(pathOf("torrent"), "瀑落式", "boolean", {
            help: "开启：水帘更厚，扑得更远更重、震得更久，但扑速更慢、起手与冷却更久——重击又锁人。关闭（急流式）：扑得更短更快、循环更顺，代价是单下更轻、震得更短。"
        }),
        field(pathOf("ai.maxChase"), "扑击距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动扑，先靠近。越大越早发起，也越容易扑空。"
        }),
        field(pathOf("ai.preferUnflinched"), "先扑没被震懵的", "boolean", {
            help: "开启：已经带着共享畏缩身份的目标排后，把这一扑留给还能行动的对手；关闭则所有目标同价。"
        })
    ]);
}
