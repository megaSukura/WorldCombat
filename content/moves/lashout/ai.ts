/** lashout：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:lashout/stages", function (access, actor, argument) {
        return lashoutDown(access, actor);
    });

    CompanionBehavior.registerUse(lashoutId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "enraged", true)) return 12;
            const down = CompanionBehavior.fact<number>(context, "world_combat:lashout/stages", CompanionBehavior.source(context)) || 0;
            return down > 0 ? 50 : 12;
        }
    });

    addPreferences(lashoutId, {}, [
        field(pathOf("vent"), "宣泄", "boolean", {
            help: "开启：命中后一次清空全部负等级，并把怒气转成 1~3 级物攻提升（受挫越深越多、持续数秒），但起手多 3 刻、冷却多 8 刻。关闭：只消掉一级负等级且无提升，更快更省。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "威胁离自己这么远以内才欺身发泄；调大愿意主动靠近被削弱的对象。"
        }),
        field(pathOf("ai.enraged"), "怒火优先", "boolean", {
            help: "开启后，自身带负等级时优先出手发泄（正是翻倍窗口）；关闭则按普通近战排序。"
        })
    ]);
}
