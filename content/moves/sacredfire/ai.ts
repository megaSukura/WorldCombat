/**
 * 神圣之火 / sacredfire 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时残血目标排前，用这一记近身重击收尾；已经带着共享灼伤
 *   身份的目标排后（再点一次意义不大）。它是唯一的近身火，适合在对手贴身时反打。
 * 够不到怎么办：reach 是本招冲刺距离，不够就靠近到冲刺起点。
 * 放完之后：一记近身重击，圣火式还会在撞击点留下余焰；交回共享交战计划。
 */
namespace PokemonSkills {
    function sacredfireWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    CompanionBehavior.registerUse("sacredfire", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return sacredfireWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !sacredfireWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 25;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 13;
            if (CompanionBehavior.status(context, target, "burn")) score -= 6;
            return score;
        }
    });

    addPreferences("sacredfire", {}, [
        field(pathOf("smite"), "天罚式", "boolean", {
            help: "开启：撞击威力 ×1.15、击退更强、冷却 −6 刻，但点燃概率 ×0.55 且落点不留余焰，用来点杀。关闭（圣火式）：点燃概率拉满、撞击点留一片虹彩余焰反复烫人，代价是威力略低、冷却 +8 刻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 18, step: 1,
            help: "超过这个距离就不主动俯冲，先靠近；越大越愿意从更远处起跳。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这记近身重击收尾；关闭则只按普通攻击排序。"
        })
    ]);
}
