/**
 * 尖石攻击 / stoneedge 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 11）之内，并且从自己到对手之间没有方块挡住
 *   （脊要沿地面裂过去，一堵墙就断了这条路）。更远交给共享接近逻辑。
 * 对谁出手：这是一条从脚下裂向对手的直线，所以够远时更值——`ai.snipe`（默认开）在对手离自己超过射程六成时
 *   抬高一档，趁对方还没贴上来先把缝裂过去；贴身的目标让位给更快的近身招。
 * 够不到怎么办：裂线长度交给 `reach`，共享任务把身位收进射程内再裂。
 * 放完接什么：交回共享交战计划；被刺中的人脚下留着会合上的裂痕，接下来由共享顺序决定追击还是脱离。
 */
namespace PokemonSkills {
    function stoneedgeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    CompanionBehavior.registerUse(stoneedgeId, {
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
            return stoneedgeWants(context, capability, target as CompanionBehavior.Entity);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !stoneedgeWants(context, capability, target as CompanionBehavior.Entity)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            const base = 20;
            if (!CompanionBehavior.ai<boolean>(capability, "snipe", true)) return base;
            return gap > capability.data.range * 0.6 ? base + 9 : base;
        }
    });

    addPreferences(stoneedgeId, {}, [
        field(pathOf("wide"), "散刺式", "boolean", {
            help: "开启：脊带铺宽 1.8 倍、石刺段数 +2，一条缝罩住并排的人，代价是威力 ×0.9、裂线更短、起手与冷却更久。关闭：尖刺式，窄而长的一条缝，威力 ×1.06、射程 ×1.1，但只能刺到线正上的人。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不裂地，先走近。越大越愿意从更远处先手，目标也越有时间在石刺顶到之前横移出脊带。"
        }),
        field(pathOf("ai.snipe"), "远程优先", "boolean", {
            help: "开启：对手离自己超过射程六成时优先裂地，把远距离目标先手逼开；关闭：只按普通攻击排序，贴身后也一样会裂。"
        })
    ]);
}
