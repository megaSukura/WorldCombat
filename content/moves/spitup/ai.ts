/**
 * 喷出 / spitup 的 AI 用途。
 *
 * 什么局面下出手：**必须已经带着蓄力层数**（共享身份 world_combat:status/stockpile），否则这一招没有任何意义——
 *   `available` 在拿不到层数时直接不选它。层数少于 `ai.minLayers` 时也先不放，等蓄到够多再一次吐出去。
 * 对谁出手：可见、敌对、存活且在 `ai.maxChase` 内的目标；直喷式当远程单体重弹用，喷散式在目标成群时更值。
 * 放完之后：层数一次放空、防护等级一起交出去，所以 AI 放完这口会回到共享交战秩序；等蓄力再攒起来才会再考虑喷出。
 * 层数由本单元自己注册的探针读取共享身份（不依赖蓄力单元的探针是否已加载）；拿不到时按「至少 1 层」处理，
 * 保证这招在只装了本单元的场面里也放得出来。
 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_spitup/layers", function (access, actor, _argument) {
        return spitupLayers(access, actor);
    });

    CompanionBehavior.registerUse(spitupId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (!CompanionBehavior.status(context, self, "stockpile")) return false;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_spitup/layers", self);
            if (layers !== null && layers < CompanionBehavior.ai<number>(capability, "minLayers", 1)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(self.point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_spitup/layers", self) || 1;
            return 20 + layers * 6;
        }
    });

    addPreferences(spitupId, {}, [
        field(pathOf("spray"), "喷散式", "boolean", {
            help: "开启：把这一口摊成身前一整片锥形，一次罩住多个敌人，射程更近但更省更快，代价是每个目标威力 ×0.68。关闭：直喷式，一发沿直线飞出的重弹，单点威力最高、射程最远。"
        }),
        field(pathOf("ai.maxChase"), "喷出距离", "number", {
            min: 2, max: 24, step: 1,
            help: "目标超过这个距离就不吐，先走近。越大越会当作远程攻击从远处放，也越容易在起手时被躲开。"
        }),
        field(pathOf("ai.minLayers"), "蓄到几层才放", "number", {
            min: 1, max: 3, step: 1,
            help: "层数低于这个值就先不放，回去继续蓄力。调高更贪、等更重的发射；调低则一有两层就吐出去。"
        })
    ]);
}
