/**
 * 食梦 / dreameater 的伙伴 AI 用途。
 *
 * 什么局面下出手：**只在有可见、敌对、且正带着共享睡眠身份的目标时**才有意义——醒着的人没有梦可吃，
 *   这一招会白花一次 PP（`ready` 也会在提交前作废）。目标进入 `ai.maxChase`（默认 13）格内列入候选。
 * 对谁出手：当前威胁；友方、倒下、不可见或没睡着的不接受。
 * 优先次序：自身生命低于 `ai.healBelow`（默认 0.75）时抬一档（这是续航手段）；不然按普通远程排序。
 * 够不到怎么办：射程交给 `reach`，共享接近逻辑把身位收进射程后再出手。
 * 放完之后：共享睡眠在受伤时解除，所以一次抽取后目标会醒；交回共享顺序，等下一个睡眠窗口。
 */
namespace CompanionBehavior {
    function dreameaterWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (!CompanionBehavior.status(context, target, "sleep")) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 13);
    }

    registerUse("dreameater", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return false;
            return dreameaterWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && CompanionBehavior.status(context, target, "sleep");
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            if (!dreameaterWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const injured = CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "healBelow", 0.75);
            return injured ? 36 : 22;
        }
    });

    PokemonSkills.addPreferences("dreameater", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("deep"), "深潜梦境", "boolean", {
            help: "开启：回血比例 ×1.3，但威力 ×0.85、起手 +4 刻、冷却 +4 刻，用来续航。关闭（浅尝）：威力 ×1.12、回血 ×0.9、出手快。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 4, max: 22, step: 1,
            help: "只在睡着目标进入这个距离时才主动抽取；越大越愿意从更远处下手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healBelow"), "回血优先阈值", "number", {
            min: 0.3, max: 1, step: 0.05,
            help: "自身生命低于这个比例时，把食梦当续航手段优先出手；越高越早靠它回血。"
        })
    ]);
}
