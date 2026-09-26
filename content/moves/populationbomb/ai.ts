/**
 * 鼠数儿 / populationbomb 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 9）格内；更远交给共享接近逻辑。
 *   伙伴从自己身边直线扑出，所以施术者→目标这条线必须通视；狭窄障碍路（隔墙、拐角）不叫长队，
 *   直接让位给别的招。
 * 为什么对残血出手：这是一串**不确定长度的小伤害**——`ai.finishLow`（默认开）下，残血目标的 priority
 *   更高，用这一串去收尾；满血目标只当普通中距离连段。
 * 对谁出手：静止或宽身体目标更不容易被一串直线扑击错过，排得更前；`accepts` 只筛阵营、存活与可见。
 * 群体目标仍只集中选一个（候选排序由共享逻辑逐个打分，不按人数加长）。
 * 放完之后：伙伴一串扑完自己收场，交回共享交战计划；带着冷却时不会重复叫。
 */
namespace PokemonSkills {
    /** 施术者到目标之间是否通视：直线扑击被挡就不叫长队。 */
    function populationbombCorridor(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
    }

    CompanionBehavior.registerUse("populationbomb", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            return populationbombCorridor(context, self, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!populationbombCorridor(context, self, target)) return 0;
            let score = 22;
            const velocity = CompanionBehavior.velocity(context, target);
            const moving = velocity !== null && velocity.length === 3
                && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.01;
            // 静止或宽身体目标更容易被一串直线扑击连续命中。
            if (!moving) score += 6;
            if ((target.width || 0.9) >= 1.1) score += 4;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 12;
            return score;
        }
    });

    addPreferences("populationbomb", {}, [
        field(pathOf("swarm"), "鼠海", "boolean", {
            help: "开启：连段上限 ×1.7（到十只）、间隔 −1 刻、冷却 +4 刻，但每下 ×0.85、命中率 −5%%——长而不稳。关闭（精锐合击）：上限 ×1、每下 ×1.3、命中率 +5%%、间隔 +1.5 刻、冷却 −2 刻——短而可靠。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动叫伙伴，先走近。越大越愿意从远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一串不确定长度的连段收尾；关闭则所有目标同价。"
        })
    ]);
}
