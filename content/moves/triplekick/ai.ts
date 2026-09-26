/**
 * 三连踢 / triplekick 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 4）格以内；这是近身直踢，更远先走近。
 * 对谁出手：稳定贴着、移动不多的单体优先——三脚沿释放方向锁定，目标横移会自己走出踢线；
 *   已在射程边缘（reach 附近）时不再强凑三踢，压到低档让位给更稳的近身招。
 * 放完之后：三脚踢完交回共享交战计划；冷却比三旋击短，一轮接一轮更容易。
 */
namespace PokemonSkills {
    /** 目标当前移动速度（格/刻）；宿主未给速度事实时按静止处理，不臆造。 */
    function triplekickTargetSpeed(target: CompanionBehavior.Entity): number {
        const velocity = target.velocity;
        if (!velocity) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1] + velocity[2] * velocity[2]);
    }

    CompanionBehavior.registerUse(triplekickId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 25;
            if (gap <= capability.data.range * 0.65) score += 5;
            if (gap > capability.data.range * 0.85) score -= 8;
            if (triplekickTargetSpeed(target) > 0.15) score -= 7;
            return Math.max(6, score);
        }
    });

    addPreferences(triplekickId, {}, [
        flag("drive", "抽射式"),
        number("ai.maxChase", "出手距离", 2, 8, 1)
    ]);
}
