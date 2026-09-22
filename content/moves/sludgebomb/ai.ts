/**
 * 污泥炸弹 / sludgebomb —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一枚落点可预判、延时炸开的远程爆弹，挂在共享 attack／ranged 位上。目标可见、敌对、存活、
 *   在 `ai.maxChase`（默认 14）以内就考虑；落点附近还挤着别的敌人时最值（`ai.crowd`）——一次炸一圈。
 *   因为引信给对手留了走开的时间，落单的移动目标收益低于人堆。
 * 对谁出手：优先还没中毒的目标（毒会持续掉血）；已经中毒的目标只按普通攻击排序。
 * 够不到怎么办：射程交给 `reach`，共享任务把身位送进投掷距离。
 * 放完之后：爆心按概率带毒并把一圈人推开，伙伴交回共享顺序；引信空爆只走冷却。
 * 优先级：成堆（≥2 人）40 ／ 在射程内 24 ／ 还需先走近 6。
 */
namespace PokemonSkills {
    function sludgebombCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("sludgebomb", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return 0;
            var base = distance <= capability.data.range ? 24 : 6;
            if (!CompanionBehavior.status(context, target, "poison")) base += 6;
            if (CompanionBehavior.ai<boolean>(capability, "crowd", true) && sludgebombCluster(context, target) >= 2) return base + 16;
            return base;
        }
    });

    addPreferences("sludgebomb", {}, [
        field(pathOf("sealed"), "密封取向", "boolean", {
            help: "开启：爆心半径 ×1.3、推得更远、引信更长、中毒概率 ×1.2，但爆心威力 ×0.9，适合把一枚弹丢进人堆逼散。关闭：一枚更密更狠的弹（威力 ×1.12）、引信更短、范围更紧，适合精确炸单体。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 3, max: 20, step: 1,
            help: "只有在这个距离以内才把对方列为投弹候选，再由共享接近逻辑把身位送进投掷距离；调大就是更早开始追。"
        }),
        field(pathOf("ai.crowd"), "成堆时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先投弹，一次炸一圈；关闭则只按普通攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为投到目标离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
