/**
 * 电力上升 / risingvoltage 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 17）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.seekCharged`（默认开）打开时，优先脚下带着电场电荷（共享身份 electricterrain）的目标——
 *   这一柱对它们翻倍，正是最值的时候；没带电的目标按普通远程攻击排序。够不到就靠近。
 * 放完之后：落点是一圈会一起挨打的地面区域，交回共享交战计划。
 */
namespace CompanionBehavior {
    function risingVoltageWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    CompanionBehavior.registerUse(PokemonSkills.risingvoltageId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return risingVoltageWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !risingVoltageWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 15;
            if (CompanionBehavior.ai<boolean>(capability, "seekCharged", true) && CompanionBehavior.status(context, target, "electricterrain"))
                score += 30;
            return score;
        }
    });

    const risingVoltageChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 24, 1);
    risingVoltageChase.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处点着地脉。";
    const risingVoltageSeek = PokemonSkills.flag("ai.seekCharged", "专打带电目标");
    risingVoltageSeek.help = "开启：脚下带着电场电荷的目标排到最前，因为这一柱对它们翻倍；关闭则只按普通远程攻击排序。";

    PokemonSkills.addPreferences(PokemonSkills.risingvoltageId, { ai: { maxChase: 17, seekCharged: true } },
        [risingVoltageChase, risingVoltageSeek]);
}
