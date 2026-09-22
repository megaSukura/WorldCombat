/**
 * 毒千针 / barbbarrage 的 AI 用途。
 *
 * 什么局面下出手：物理远程齐射，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 它对已中毒的目标整轮翻倍、也能自己把毒撒上：优先打没有毒的目标（去上毒），中毒的目标 priority 也高（去吃倍率）。
 * 具体偏好：没毒 30、有毒 22——都高于普通兜底，让它比单体爆破更常被选中。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("barbbarrage", {
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
            return CompanionBehavior.status(context, target, "poison") ? 22 : 30;
        }
    });

    addPreferences("barbbarrage", {}, [
        field(pathOf("hail"), "倾泻", "boolean", {
            help: "开启：针数 ×1.4、中毒概率 ×1.15，但整轮威力 ×0.85，收招与冷却各多 2／3 刻。关闭：针少而重，单体更痛。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动齐射，先走近。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
