/**
 * 恶意追击 / assurance 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 10）格内时列入候选；够不到交给共享接近逻辑。
 * 对谁出手：`ai.pounce`（默认开）打开时，目标仍处在真实追击窗口内（与命中结算同一份 `assuranceWounded` 判读，
 *   窗口本身随施法者速度在 60~100 刻间变化）就被优先追击；残血只另给一档收尾分，它不是翻倍条件。
 *   否则按普通近战排序。
 * 放完接什么：交回共享交战计划；它是一记补刀追击，不主动缠斗。
 */
namespace PokemonSkills {
    /** 目标是否仍在真实追击窗口内：与命中时的翻倍判读共用 assuranceWounded，不再用固定 90 刻代替。 */
    function assuranceWoundedTarget(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const self = world.actor(CompanionBehavior.source(context).ref);
        const foe = target.ref ? world.actor(target.ref) : null;
        if (self === null || foe === null) return false;
        return assuranceWounded(withTarget({ world: world, actor: self }, foe)) > 0;
    }

    CompanionBehavior.registerUse(assuranceId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "pounce", true)) return 16;
            if (assuranceWoundedTarget(context, target)) return 52;
            return CompanionBehavior.ratio(target) < 0.6 ? 28 : 16;
        }
    });

    addPreferences(assuranceId, {}, [
        field(pathOf("relentless"), "穷追", "boolean", {
            help: "开启：追击窗口多 0.6 秒、追得更远 ×1.08，缠住带伤目标；但本击 ×0.90、冷却多 5 刻。关闭：本击 ×1.06，一记了结。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "目标离自己这么远以内才追过去；调大愿意主动扑向更远的残血目标。"
        }),
        field(pathOf("ai.pounce"), "追击带伤", "boolean", {
            help: "开启后，仍处在真实追击窗口内的目标会被优先追击（正是翻倍窗口）；残血只另给一档收尾分，不是翻倍条件。关闭则按普通近战排序。"
        })
    ]);
}
