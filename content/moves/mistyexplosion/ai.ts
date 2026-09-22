/**
 * 薄雾炸裂 / mistyexplosion 的伙伴 AI 用途。
 *
 * 什么局面下出手：身周 `ai.maxChase`（默认 6）格内至少 `ai.minFoes`（默认 2）个可见、敌对、存活的目标；
 *   自己生命掉到 `ai.cornered`（默认 0.35）以下时门槛放宽到 1 个。它是「用一条命换一圈致盲」的牌。
 *   站在薄雾里时 priority 抬到 96——薄雾上更重，且本就该在雾里结束。
 * 对谁出手：候选是当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 放完接什么：没有「之后」——使用者随之倒下；残雾留在原地自行消散并拖慢走进去的敌人。
 */
namespace PokemonSkills {
    function mistyexplosionCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 6);
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= limit) count++;
        }
        return count;
    }

    function mistyexplosionWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 6);
    }

    CompanionBehavior.registerUse(mistyexplosionId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            if (capability.data.ready === false || context.facts.mounted) return false;
            const needed = CompanionBehavior.ratio(CompanionBehavior.source(context))
                <= CompanionBehavior.ai<number>(capability, "cornered", 0.35) ? 1 : CompanionBehavior.ai<number>(capability, "minFoes", 2);
            return mistyexplosionCount(context, capability) >= needed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return mistyexplosionWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !mistyexplosionWants(context, capability, target)) return 0;
            const count = mistyexplosionCount(context, capability);
            let base = 66 + Math.min(30, Math.max(0, count - 1) * 10);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) <= CompanionBehavior.ai<number>(capability, "cornered", 0.35)) base += 10;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), "mistyterrain")) base += 26;
            return Math.min(98, base);
        }
    });

    addPreferences(mistyexplosionId, {}, [
        field(pathOf("denseMist"), "浓雾式", "boolean", {
            help: "开启（浓雾式）：残雾半径 ×1.3、停留 ×1.3、致盲 +30 刻，但这一爆威力 ×0.92、起手 +3、冷却 +10——把一次爆发换成一整片持续控制的雾。关闭（薄爆式）：威力 ×1.08、残雾 ×0.8，炸得更脆更快。无论哪个方向，使用者都会倒下。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动凑上去引爆，先走近；它是一圈之内的牌。"
        }),
        field(pathOf("ai.minFoes"), "引爆人数", "number", {
            min: 1, max: 6, step: 1,
            help: "雾环半径内至少这么多可见、存活的目标才引爆；调大只在被围住时用，调 1 见一个也炸。"
        }),
        field(pathOf("ai.cornered"), "残血阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自己生命低于这个比例时，引爆门槛放宽到 1 个目标；越高越早拼命。"
        })
    ]);
}
