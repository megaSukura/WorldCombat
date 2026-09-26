/**
 * 追打的 AI：短距扑击，专门惩罚正在拉开距离的目标。
 *
 * 局面：有敌对目标、可见、存活，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑，不越过用户设定的追击距离。
 * 对谁出手：目标被共享感知判为正在逃离时给出高优先（这一扑翻倍），否则按普通近战排序。
 * 出手：reach 取本个体 resolve 出的实际扑击距离（`distance` 参数，随速度变化），到距离内再扑。
 */
namespace PokemonSkills {
    addPreferences(pursuitId, { ai: { maxChase: 6 } }, [
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 1, max: 12, step: 1,
            help: "目标离自己这么远以内才主动扑过去；调大愿意从更远处起扑，调小只贴脸追击。"
        })
    ]);

    CompanionBehavior.registerUse(pursuitId, {
        protocols: ["world_combat:attack"],
        reach: function (context) { return p(pursuitId, "distance", CompanionBehavior.world(context)); },
        available: function (context, item, purpose, target) {
            if (!target || target.health <= 0) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 6);
        },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            // 目标正背身撤离时，这一扑翻倍，值得插在普通攻击之前。
            return CompanionBehavior.fleeing(context, target) ? 60 : 0;
        }
    });
}
