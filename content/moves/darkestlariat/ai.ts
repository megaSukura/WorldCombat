/**
 * ＤＤ金勾臂 / darkestlariat 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享 attack 位上；这是**以自己为圆心**的一整圈横扫，够不到时交给共享接近逻辑把身位收进圈子。
 * 对谁出手：`accepts` 只排除友方、已死、看不见的；`ai.crowd`（默认开）在半径内可选目标 ≥2 时显著抬分——
 *   一次抡开一圈才是它的本行；`ai.breakGuard`（默认开）在目标有正面防御等级时抬分（本招无视这些涨防）。
 * 出手位置：站到目标身边、让整圈把侧后方的人一起框进来。
 * 放完之后：交回共享交战计划；被抡开的人离开了贴身距离。
 */
namespace PokemonSkills {
    function darkestlariatValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    /** 只读、回调内缓存的「目标正面防御等级总数」；由参数层的同一份阶梯读取。 */
    CompanionBehavior.registerFact("world_combat:move_darkestlariat/guard", function (access, actor, _argument) {
        return access.valid(actor) ? darkestlariatGuard(access, actor) : 0;
    });

    function darkestlariatGuardNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_darkestlariat/guard", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(darkestlariatId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!darkestlariatValid(target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) { return darkestlariatValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true)) {
                let count = 0;
                const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
                nearby.forEach(function (other) {
                    if (darkestlariatValid(other) && CompanionBehavior.distance(self.point, other.point) <= capability.data.range) count++;
                });
                if (count >= 2) score += 14;
            }
            if (CompanionBehavior.ai<boolean>(capability, "breakGuard", true) && darkestlariatGuardNow(context, target) > 0) score += 12;
            return score;
        }
    });

    addPreferences(darkestlariatId, {}, [
        flag("wide", "广旋式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.crowd", "优先扫多目标"),
        flag("ai.breakGuard", "优先涨防目标")
    ]);
}
