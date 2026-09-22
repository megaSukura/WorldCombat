/**
 * 火花 / ember 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 14）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时残血目标排前，用这一粒便宜的火种点掉；已经带着共享灼伤
 *   身份的目标排后（再点一次意义不大）。它出手快、冷却短，是缺手段时最稳的一招。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记轻快的单体点射，交回共享交战计划。
 */
namespace PokemonSkills {
    function emberWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse("ember", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return emberWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !emberWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 14;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 14;
            if (CompanionBehavior.status(context, target, "burn")) score -= 5;
            return score;
        }
    });

    addPreferences("ember", {}, [
        field(pathOf("charged"), "蓄力式", "boolean", {
            help: "开启：威力 ×1.4、点燃概率 +5%%、火粒更大，但起手 +4 刻、冷却 +8 刻、射程 −1 格。关闭（速射式）：出手更快、弹得更远、冷却更短，代价是威力与引燃都低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 22, step: 1,
            help: "超过这个距离就不主动弹火种，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这粒便宜的火种点掉；关闭则只按普通远程攻击排序。"
        })
    ]);
}
