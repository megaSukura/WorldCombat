/**
 * 大爆炸 / explosion 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是最重的一张自爆牌。默认要求身周 `ai.maxChase`（默认 7）格内至少有
 *   `ai.minFoes`（默认 2）个可见、敌对、存活的目标；因为打击面比自爆更大、代价也更大，它比自爆更挑，
 *   自己生命掉到 `ai.cornered`（默认 0.3）以下时门槛放宽到 1 个。
 * 对谁出手：候选是当前威胁；`accepts` 只排除友方、已死、看不见的。走到圈够大就引爆。
 * 够不到怎么办：交给共享接近逻辑；贴身人数不足 `minFoes` 时先不炸。
 * 放完接什么：没有「之后」——使用者随之倒下，动作结束；弹坑与余烬留在原地自行消散。
 * 排序：目标每多一个 +12（上限 +36），残血再 +10；上限 98，压过普通攻击但不到「紧急」的 100。
 */
namespace PokemonSkills {
    function explosionCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 7);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function explosionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 7);
    }

    CompanionBehavior.registerUse("explosion", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false || context.facts.mounted) return false;
            const needed = CompanionBehavior.ratio(CompanionBehavior.source(context))
                <= CompanionBehavior.ai<number>(capability, "cornered", 0.3) ? 1 : CompanionBehavior.ai<number>(capability, "minFoes", 2);
            return explosionCount(context, capability) >= needed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return explosionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !explosionWants(context, capability, target)) return 0;
            const count = explosionCount(context, capability);
            let base = 70 + Math.min(36, Math.max(0, count - 1) * 12);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) <= CompanionBehavior.ai<number>(capability, "cornered", 0.3)) base += 10;
            return Math.min(98, base);
        }
    });

    addPreferences("explosion", {}, [
        field(pathOf("charged"), "蓄爆式", "boolean", {
            help: "开启（蓄爆式）：威力约 ×1.12、爆心 ×1.12、弹坑停留 ×1.6，但起手 +6 刻、冷却 +14——蓄得越久回报越大，也越容易被对手打断。关闭（瞬爆式）：威力约 ×0.95、爆心 ×0.95、冷却 −8，出手更快、坑更短。无论哪个方向，使用者都会倒下。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动凑上去引爆，先走近；它是一圈之内的牌。"
        }),
        field(pathOf("ai.minFoes"), "引爆人数", "number", {
            min: 1, max: 6, step: 1,
            help: "爆心半径内至少这么多可见、存活的目标才引爆；调大只在被围住时用，调 1 见一个也炸。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自己生命低于这个比例时，引爆门槛放宽到 1 个目标；越高越早拼命。"
        })
    ]);
}
