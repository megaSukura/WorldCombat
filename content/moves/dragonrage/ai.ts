/**
 * 龙之怒 / dragonrage 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是固定 40 的重击，所以 `ai.finish`（默认开）在目标生命已经掉到一半以下时把它排到前面——
 * 固定伤害不看防御与相性，残血高防的目标正是它最划算的场合；代价是可能把这一发用在并不最危险的目标上。
 * 关闭则只按威胁本身排序。怒爆式与猛撞式不改变出手条件，只改变作用形状。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("dragonrage", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.5) score += 18;
            return score;
        }
    });

    addPreferences("dragonrage", {}, [
        field(pathOf("erupt"), "怒爆式", "boolean", {
            help: "开启：龙息弹抵达时在落点炸开，范围内所有敌人各吃固定 40 并被向外推开，但射程更短、冷却更长、不再按住目标。关闭（猛撞式，默认）：单体、撞退更直、并短暂按住目标。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手砸出。"
        }),
        field(pathOf("ai.finish"), "残血优先", "boolean", {
            help: "开启：目标生命掉到一半以下时优先用它收尾（固定伤害不看防御）；关闭：只按威胁本身排序。"
        })
    ]);
}
