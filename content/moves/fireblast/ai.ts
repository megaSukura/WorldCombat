/**
 * 大字爆炎 / fireblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 17）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时残血目标排前，用这一记高威力特殊火收尾；已经带着共享灼伤
 *   身份的目标排后（再点一次意义不大）。它是本组里最重的一记，冷却长，留给值得的目标。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记高威力单体火，刻印式还会在地上留字痕；交回共享交战计划。
 */
namespace PokemonSkills {
    function fireblastWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    CompanionBehavior.registerUse("fireblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return fireblastWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !fireblastWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 14;
            if (CompanionBehavior.status(context, target, "burn")) score -= 7;
            return score;
        }
    });

    addPreferences("fireblast", {}, [
        field(pathOf("inscribe"), "刻印式", "boolean", {
            help: "开启：崩字威力 ×0.85，但余烬在地上烧出字痕、按间隔反复烫站在上面的人，冷却 +10 刻，用来封地。关闭（爆燃式）：威力 ×1.15、一记更重、冷却更短，代价是字不留痕。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 24, step: 1,
            help: "超过这个距离就不主动写字，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这记高威力大字收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
