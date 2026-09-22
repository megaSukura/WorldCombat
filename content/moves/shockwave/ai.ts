/**
 * 电击波 / shockwave 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见的敌对目标就列入候选；够不到交给共享接近逻辑。
 * `ai.preferWet`（默认开）：目标湿身或在雨里时抬高 priority，因为电沿水传导更狠。
 * 便宜、快、射程中等，所以它不是最后的近身选择，而是先手消耗与收尾手段。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("shockwave", {
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
            var base = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range ? 18 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "preferWet", true) && target.wet) return base + 16;
            return base;
        }
    });

    addPreferences("shockwave", {}, [
        field(pathOf("ground"), "地导形态", "boolean", {
            help: "开启：电流扫过身前的整条走廊，命中沿途所有敌人、射程更远，但每个目标承受地导威力、起手多 2 刻、冷却多 5 刻。关闭：单体直击，威力更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 3, max: 24, step: 1,
            help: "超过这个距离就不主动放电，先走近。越大越会在更远处先手点电。"
        }),
        field(pathOf("ai.preferWet"), "优先湿处", "boolean", {
            help: "开启后，湿身或在雨中的目标会被优先放电，因为电沿水传导更狠；关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时放电。"
        })
    ]);
}
