/**
 * 日光束 / solarbeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 18）格内，且自己与目标之间视线畅通
 *   （光走直线，被墙挡住就不值得起手，交给共享接近去换位）。
 * 对谁出手：`ai.lineUp`（默认开）打开时，从自己到目标拉出的走廊里敌人越多越优先——一束光能一次串几个，
 *   那是它最值的时候；关闭则只按普通远程攻击排序。
 * 优先级：站在强日光下（context.facts.sunlight）时抬价，因为不用聚光、没有站桩空档（`ai.sunFirst` 控制）；
 *   目标已经贴到 `ai.minRange` 以内时压价，避免站着挨打断。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位收进光程之后再射。
 * 放完接什么：交回共享交战计划；它是一束贯穿，不负责收尾。
 */
namespace PokemonSkills {
    /** 从自己指向 target 的走廊里当前可见敌人的数量；用于站位排序。 */
    function solarbeamLineup(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 12;
        const broad = !!(capability.data.config && capability.data.config.broad);
        const half = (broad ? 1.1 : 0.5) + (self.height === undefined ? 0 : Math.max(0, self.height - 1.4) * 0.2);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const hx = dx / length, hz = dz / length;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * hx + oz * hz;
            if (along <= 0.2 || along > reach) continue;
            if (Math.abs(ox * hz - oz * hx) > half) continue;
            count++;
        }
        return Math.max(1, count);
    }

    function solarbeamSunlit(context: WorldBehavior.Context): boolean {
        const value = context.facts.sunlight;
        return typeof value === "number" && value >= 0.85;
    }

    /** Line of sight for the straight beam; kept out of the `ready` hook so pre-commit scanning stays simple. */
    function solarbeamSight(context: WorldBehavior.Context, goal: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context);
        return CompanionBehavior.world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(goal.point));
    }

    CompanionBehavior.registerUse("solarbeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            if (proposed.friendly || !(proposed.health > 0) || !proposed.visible) return proposed;
            if (!CompanionBehavior.ai<boolean>(capability, "lineUp", true)) return proposed;
            const self = CompanionBehavior.source(context);
            const reach = typeof capability.data.range === "number" ? capability.data.range : 12;
            const nearby = context.facts.nearby as CompanionBehavior.Entity[];
            let best = proposed, bestScore = CompanionBehavior.distance(self.point, proposed.point) <= reach
                ? solarbeamLineup(context, capability, proposed) : -1;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.friendly || !(other.health > 0) || !other.visible) continue;
                if (CompanionBehavior.distance(self.point, other.point) > reach) continue;
                const score = solarbeamLineup(context, capability, other);
                if (score > bestScore) { best = other; bestScore = score; }
            }
            return best;
        },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 18);
        },
        accepts: function (_context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            const lineup = solarbeamLineup(context, capability, target);
            let score = lineup >= 3 ? 44 : lineup >= 2 ? 32 : 24;
            if (CompanionBehavior.ai<boolean>(capability, "sunFirst", true) && solarbeamSunlit(context)) score += 12;
            if (distance < CompanionBehavior.ai<number>(capability, "minRange", 3)) score -= 10;
            return score;
        },
        ready: function (context, _capability) {
            const goal = CompanionBehavior.goalEntity(context);
            return !goal || solarbeamSight(context, goal);
        }
    });

    const solarbeamBroad = field(pathOf("broad"), "散光形态", "boolean", {
        help: "开启（散光）：光带更宽（×1.6）、最多多贯穿 3 个，但单发威力 ×0.66、收招与冷却各多 2/3 刻，适合扫成排的敌人；关闭（聚焦）：光带收窄（×0.7）、单发威力更高，适合点名单体重击。"
    });
    const solarbeamChase = number("ai.maxChase", "考虑距离", 5, 26, 1);
    solarbeamChase.help = "超过这个距离就不主动起手，先走近；越大越愿意在更远处先手放光。";
    const solarbeamMin = number("ai.minRange", "最近起手距离", 0, 8, 1);
    solarbeamMin.help = "目标进到这个距离以内时压低出手优先级，避免站着聚光被打断；调到 0 表示贴身也照放。";
    const solarbeamLine = flag("ai.lineUp", "瞄准成排");
    solarbeamLine.help = "开启：目标身后同一条走廊里还排着别的敌人时优先出手，一束光能多穿一个；关闭则只按普通远程攻击排序。";
    const solarbeamSun = flag("ai.sunFirst", "阳光优先");
    solarbeamSun.help = "开启：站在强日光下时抬高出优先级——那时不用聚光、当回合就能打出，且威力不减；关闭则不看天气。";

    addPreferences("solarbeam", { broad: false, ai: { maxChase: 18, minRange: 3, lineUp: true, sunFirst: true } },
        [solarbeamBroad, solarbeamChase, solarbeamMin, solarbeamLine, solarbeamSun]);
}
