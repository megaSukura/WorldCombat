/**
 * 晶光转转 / mortalspin 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记原地撒晶放毒的脱缚招。缠在身上的 rooted 世界效果或共享身份 partiallytrapped／trapped／
 *   leechseed 还在时，它立刻出手（priority 112，抢在所有行动前）。没有束缚时，目标是可见、敌对、存活、
 *   且在 `ai.maxChase`（默认 8）格内的敌人——目标还没中毒时最值（priority 46），已经中毒时优先级降到 24。
 * 对谁出手：没有束缚时由共享任务把目标带进 `radius` 内再原地撒晶；`ai.cluster`（默认开）打开时，目标身边
 *   3.5 格内还挤着别的敌人就抬高 priority，一次把毒晶撒向一圈人。
 * 够不到怎么办：交给共享接近逻辑；走不到就先不撒。
 * 放完之后：束缚被甩掉、身周的人沾到毒晶中毒，交回共享交战计划。毒免疫的 Boss 仍会被毒晶砸中吃到基础晶击，
 *   只是挂不上毒（命中层的原生免疫判断），所以不因毒免疫就不出手。
 */
namespace PokemonSkills {
    function mortalspinBound(context: WorldBehavior.Context): boolean {
        return CompanionBehavior.bound(context, CompanionBehavior.source(context));
    }
    function mortalspinCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 1;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("mortalspin", {
        protocols: ["world_combat:attack", "world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (mortalspinBound(context)) return true;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            const self = CompanionBehavior.source(context);
            return target.ref === self.ref || (!target.friendly && target.health > 0 && target.visible);
        },
        approachTarget: function (context, capability, target) { return target || CompanionBehavior.source(context); },
        priority: function (context, capability, target) {
            if (context.facts.mounted) return 0;
            if (mortalspinBound(context)) return 112;
            if (!target || target.friendly) return 0;
            let score = CompanionBehavior.poisoned(context, target) ? 24 : 46;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && mortalspinCluster(context, target) >= 2) score += 12;
            return score;
        }
    });

    addPreferences("mortalspin", {}, [
        field(pathOf("virulent"), "剧毒式", "boolean", {
            help: "开启：命中目标改为剧毒（掉血更快）、毒时长 ×1.4；代价是威力 ×0.85、半径 ×0.9、起手 +2 刻、冷却 +8 刻，用来慢慢磨掉一个硬目标。关闭（晶光式）：半径 ×1.15、威力 ×1.1，上普通毒，用来一次给一群人上毒。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "没有束缚时，威胁进入这个距离内才主动旋一记；越大越早旋开并放毒，也越容易空转。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先晶光转转，一次给一圈人上毒；关闭则只按普通攻击节奏出手。"
        })
    ]);
}
