/**
 * 千变万花 / flowertrick —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 14）格内；够不到交给共享接近逻辑。
 * 对谁出手：默认先看「一个值得点掉的重要目标」——一次承诺、锁点不追，沉没成本全押在一击上，所以把可靠伤害压在
 *   残血或高价值单敌身上；`ai.finish`（默认开）按目标生命比例提高排序。高抛配置的射程略短、飞得更慢，
 *   更适合停在掩体后或移动慢的目标；对手横移快或头顶低矮时收益下降，这一点留给试玩观察，不额外虚加权重。
 * 够不到怎么办：reach 就是本招实际射程，先走近。
 * 放完之后：花束碰地只散瓣、不铺花地，也没有二次爆；交回共享交战计划继续。
 */
namespace PokemonSkills {
    function flowertrickWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
    }

    CompanionBehavior.registerUse(flowertrickId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return flowertrickWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flowertrickWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const range = capability.data.range;
            let score = CompanionBehavior.distance(self.point, target.point) <= range ? 22 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true)) score += Math.round((1 - CompanionBehavior.ratio(target)) * 10);
            return score;
        }
    });

    addPreferences(flowertrickId, {}, [
        field(pathOf("highArc"), "高抛", "boolean", {
            help: "开启（高抛）：按可达范围里最高的解抛出，越过低掩体落到掩体后，但花束速度 ×0.85、射程 ×0.92、绽开威力 ×0.85、起手 +2 刻、冷却 +6 刻。关闭（平掷）：更快更远威力更高，但低掩体就能挡住弧线。一个换「越掩体」，一个换「快而准」。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 22, step: 1,
            help: "超过这个距离就不主动投花，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finish"), "残血补刀", "boolean", {
            help: "开启：目标生命比例越低排得越前（这一招一次承诺、锁点不追，把可靠的一击留给要收尾的目标）；关闭则只按普通远程攻击排序。"
        })
    ]);
}
