/**
 * 精神利刃 / psychocut 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 13）格内；更远交给共享接近逻辑。
 * `ai.finishLow`（默认开）在残血目标上加分：目标生命低于 45% 时 priority 抬到 42，把这一刃当远程收尾；
 * 关闭后只按普通远程斩击排序。它射程长、会追人，适合单点拔除。
 * 选择倾向：只有当敌人正好落在这一刃命中后十字的延伸线上时，才把波及收益算进去——`ai.cross`（默认开）
 * 用实际入射方向与实际十字半径量到那个距离，绝不把圆内所有人都当成会被扫到。
 * 放完之后：交回共享交战计划；掷完站在原地，由共享顺序决定接着打还是走位。
 */
namespace PokemonSkills {
    /** 目标周围正好落在实际入射方向撑起的十字两笔上的敌人数量，供波及加分。 */
    function psychocutAligned(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
        target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const arc = p(psychocutId, "arc", world);
        const self = CompanionBehavior.point(CompanionBehavior.source(context).point);
        const at = CompanionBehavior.point(target.point);
        const heading = WorldGeometry.flatUnit(at.minus(self));
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const up = WorldCombat.point(0, 1, 0);
        const arms: CombatPoint[][] = [
            [at.plus(side.scale(-arc)).plus(up.scale(-arc)), at.plus(side.scale(arc)).plus(up.scale(arc))],
            [at.plus(side.scale(-arc)).plus(up.scale(arc)), at.plus(side.scale(arc)).plus(up.scale(-arc))]
        ];
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || !(other.health > 0) || other.ref === target.ref || !other.visible) continue;
            const point = CompanionBehavior.point(other.point);
            const thickness = arc * 0.4 + (typeof other.width === "number" ? other.width / 2 : 0.45);
            for (let arm = 0; arm < arms.length; arm++) {
                if (WorldGeometry.closestOnSegment(point, arms[arm][0], arms[arm][1]).minus(point).length() <= thickness) {
                    count++;
                    break;
                }
            }
        }
        return count;
    }

    CompanionBehavior.registerUse(psychocutId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 25;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.45) score = 42;
            if (CompanionBehavior.ai<boolean>(capability, "cross", true)) {
                const aligned = psychocutAligned(context, capability, target);
                if (aligned > 0) score += Math.min(20, aligned * 10);
            }
            return score;
        }
    });

    addPreferences(psychocutId, {}, [
        field(pathOf("keen"), "凝刃式", "boolean", {
            help: "开启：威力 ×1.12、十字大 0.35 格、波及比例多 0.06，代价是飞行 ×0.85、冷却多 8 刻；关闭：飞行 ×1.15、冷却少 6 刻，代价是威力 ×0.94、十字小 0.2 格。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不主动凝刃，先走近；越大越愿意从远处掷刃。"
        }),
        field(pathOf("ai.finishLow"), "优先收尾", "boolean", {
            help: "开启：目标生命低于 45% 时优先掷出这一刃收尾；关闭：无论血量都按普通远程斩击排序。"
        }),
        field(pathOf("ai.cross"), "十字波及", "boolean", {
            help: "开启：有敌人正好落在命中后十字的两道亮笔延长线上时优先出手，把刃风波及算进收益；关闭则只看单体追击。"
        })
    ]);
}
