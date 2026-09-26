/**
 * 攻击指令 / attackorder 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 12）之内，并且从自己到对手之间没有方块挡住
 *   （手下要飞过去，墙后会堵死；`ready` 用共享的 world.clear 挡住这种情况）。更远交给共享接近逻辑。
 * 对谁出手：这是一道把手下派出去的远程命令，够远时更值——`ai.swarm`（默认开）在对手离自己超过射程六成时抬高一档，
 *   趁对方还没贴上来先把虫群放出去；贴身后让位给更快的近身招。持续可追踪的目标优先。
 * 够不到怎么办：指挥距离交给 `reach`，共享任务把目标收进射程内再下令。
 * 放完接什么：动作很快交回共享交战计划，施术者能继续战斗；手下在前方扑击，对手可以转而清掉它们——
 *   接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    function attackorderWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    CompanionBehavior.registerUse(attackorderId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context) {
            const target = CompanionBehavior.goalEntity(context);
            if (!target) return true;
            const world = context.services.world, self = CompanionBehavior.source(context);
            const from = CompanionBehavior.point(self.point), to = CompanionBehavior.point(target.point);
            const delta = to.minus(from), length = delta.length();
            if (length < 0.5) return true;
            return world.clear(from.plus(delta.unit().scale(0.5)), to);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return attackorderWants(context, capability, target as CompanionBehavior.Entity);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !attackorderWants(context, capability, target as CompanionBehavior.Entity)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            const base = 20;
            if (!CompanionBehavior.ai<boolean>(capability, "swarm", true)) return base;
            return gap > capability.data.range * 0.6 ? base + 8 : base;
        }
    });

    addPreferences(attackorderId, {}, [
        field(pathOf("swarm"), "虫海式", "boolean", {
            help: "开启：手下面数 +2、飞行速度 ×1，但每只威力 ×0.8、单只生命降到 3——更多次小刺、更容易撞上会心，也更容易被一口气清光；关闭：精锐式，每只威力 ×1.25、飞得更快、单只生命 7，代价是面数更少。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不下令，先走近；越大越愿意从更远处先把虫群放出去，留给对手的清场时间也越长。"
        }),
        field(pathOf("ai.swarm"), "远程优先", "boolean", {
            help: "开启：对手离自己超过射程六成时优先下令，把远距离目标先手压住；关闭：只按普通攻击排序。"
        })
    ]);
}
