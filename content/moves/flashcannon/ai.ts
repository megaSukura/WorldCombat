/**
 * 加农光炮 / flashcannon —— AI 用途。
 *
 * 出手局面：目标可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内时列入候选；焦点目标不受距离限制。
 * 对谁出手：`ai.lineUp`（默认开）且当前是贯穿形态时，若目标身后同一条线上还有别的敌人，抬高优先级——
 *   一发扫掉一排正是它最值的时候；集束形态不穿透，只按普通远程攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进射程后再射。
 * 放完接什么：交回共享交战计划；光矛不留场，不改变后续决策。
 */
namespace PokemonSkills {
    /** 目标身后同一直线上还有多少敌人（水平垂直距 < 1.2 格且投影在目标之后）。 */
    function flashcannonLined(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.5) return 0;
        const ux = dx / length, uz = dz / length;
        const nearby = (context.facts.nearby || []) as WorldMethods.Subject[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || other.ref === self.ref || other.ref === target.ref) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * ux + oz * uz;
            if (along <= length + 0.5) continue;
            const perpendicular = Math.abs(ox * uz - oz * ux);
            if (perpendicular < 1.2) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("flashcannon", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            let score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 21 : 0;
            const config = capability.data.config || {};
            if (CompanionBehavior.ai<boolean>(capability, "lineUp", true) && config.focus !== true
                && flashcannonLined(context, target) > 0) score += 14;
            return score;
        }
    });

    addPreferences("flashcannon", {}, [
        field(pathOf("focus"), "集束形态", "boolean", {
            help: "开启：威力 ×1.2、只命中第一个目标、冷却 −3 刻，适合点名单体。关闭（贯穿）：威力 ×0.92、可穿透 2 个后续目标（逐个衰减）、冷却 +3 刻，适合扫一条线。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 5, max: 26, step: 1,
            help: "超过这个距离就不主动起手，先走近；越大越愿意在更远处先收光。"
        }),
        field(pathOf("ai.lineUp"), "瞄准排成一线的", "boolean", {
            help: "开启后，贯穿形态下目标身后同一条线上还有别的敌人时抬高优先级；集束形态或不看排队时按普通远程攻击排序。"
        })
    ]);
}
