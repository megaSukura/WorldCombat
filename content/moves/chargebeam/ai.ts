/**
 * 充电光束 / chargebeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上；带充电光束的伙伴把它当中距离的持续压束。
 *   对可见、敌对、存活、在 `ai.maxChase`（默认 13）以内、且中间有一条通视线的目标出手；更远交给共享接近逻辑。
 * 对谁出手：`accepts` 只筛阵营、存活与可见；`priority` 偏好**走得慢或站定**的目标——细束要连续压在同一个点
 *   直到收束才拿得到余流，慢目标更可能被压满。`ai.chargeFirst`（默认开）在自己特攻还没到 +4 级时抬价，
 *   先蓄下这 1 级特攻；特攻已经很高时降一档整备加分，但仍保留它作小伤点射的价值。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再出手；靠墙的目标先等共享接近逻辑找到射界。
 * 放完之后：命中者身上的余流已回灌成特攻等级，伙伴交回共享顺序继续交战。
 */
namespace PokemonSkills {
    /** 目标当刻的水平速度；读不到速度就当作未知、不加分。 */
    function chargebeamSlow(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const velocity = CompanionBehavior.velocity(context, target);
        if (velocity === null) return false;
        const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
        return speed < 0.06;
    }

    CompanionBehavior.registerUse("chargebeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return false;
            return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > CompanionBehavior.ai<number>(capability, "maxChase", 13)) return 0;
            let value = gap <= capability.data.range ? 22 : 4;
            const stage = CompanionBehavior.stage(context, self, "spa");
            if (CompanionBehavior.ai<boolean>(capability, "chargeFirst", true) && (typeof stage === "number" ? stage : 0) < 4) value += 10;
            else if ((typeof stage === "number" ? stage : 0) >= 4) value -= 4;
            // 慢目标或站定的目标更可能被束压满，余流更容易兑现。
            if (chargebeamSlow(context, target)) value += 6;
            return value;
        }
    });

    addPreferences("chargebeam", {}, [
        field(pathOf("overcharge"), "过充", "boolean", {
            help: "开启：起手多 5 刻、冷却更久，但射程 ×1.2、威力 ×1.2、回灌几率更高、电弧更密；关闭（速射）：更短更便宜，射程更短、威力 ×0.9、回灌几率更低。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动点射，先走近；越大越愿意从更远处先手压血。"
        }),
        field(pathOf("ai.chargeFirst"), "先蓄特攻", "boolean", {
            help: "开启：自己特攻还没到 +4 级时抬价，先把这 1 级特攻蓄下来；关闭则不特意为增益出手。"
        })
    ]);
}
