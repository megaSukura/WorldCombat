/**
 * 冰锤 / icehammer 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记近身的裹冰单体重砸。目标可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；
 *   更远交给共享接近逻辑。和臂锤一样，这一记会让自身速度下降，所以只在够得到时用。
 * 对谁出手：`ai.chill`（默认开）打开时，**已经冰缓**的目标多一档分——冰壳更脆，这一记打得更重，
 *   也把冰缓接下去；关闭则所有目标同价。
 * 够不到怎么办：reach 就是本招射程，不够先走近；目标在起手期间跑掉就只留扑空的冰屑。
 * 放完之后：命中才付自身速度 −1；目标带着冰缓身份；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function icehammerWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("icehammer", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icehammerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icehammerWants(context, capability, target)) return 0;
            const distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 16;
            if (distance <= capability.data.range) score += 8;
            if (CompanionBehavior.ai<boolean>(capability, "chill", true) && CompanionBehavior.status(context, target, "chilled")) score += 10;
            return score;
        }
    });

    addPreferences("icehammer", {}, [
        field(pathOf("glaciate"), "积冰式", "boolean", {
            help: "开启：冰缓时长 ×1.4、冰面更大更久，彻底冻住目标；代价是威力 ×0.92、起手 +2 刻、收招 +2 刻、冷却 +6 刻。关闭（碎冰式）：一击更重、出手更快，但冰缓短、冰面小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动发起冰锤，先走近。调大愿意从稍远处上前砸，也越容易在起手期间被走位甩开。"
        }),
        field(pathOf("ai.chill"), "优先冰缓目标", "boolean", {
            help: "开启：已经带着冰缓身份的目标排得更前，冰壳更脆、这一记更重也把冰缓接下去；关闭则所有目标同价。"
        })
    ]);
}
