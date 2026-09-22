/**
 * 毒液冲击 / venoshock 的 AI 用途。
 *
 * 什么局面下出手：远程消耗手段，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 对已经中毒的目标 priority 抬到 55（那一下翻倍、还把毒升格为剧毒），否则 14——
 * 它会先让别的招或自己把毒点上，再用毒液冲击收。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("venoshock", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            return CompanionBehavior.status(context, target, "poison") ? 55 : 14;
        }
    });

    addPreferences("venoshock", {}, [
        field(pathOf("corrode"), "侵蚀取向", "boolean", {
            help: "开启：即时威力 ×0.85，但升格后的剧毒持续 ×1.6，收招与冷却各多 2／4 刻。关闭：更重的一泼，毒性按基准持续。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 24, step: 1,
            help: "超过这个距离就不主动泼毒，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时泼毒。"
        })
    ]);
}
