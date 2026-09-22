/**
 * 追打的 AI：短距扑击，专门惩罚正在拉开距离的目标。
 *
 * 局面：有敌对目标就可用；目标被共享感知判为正在逃离时给出高优先，先于普通攻击出手。
 * 出手：贴近到扑击距离内再扑；够不到时共享任务负责逼近。放完后回到常规交战。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(pursuitId, {
        protocols: ["world_combat:attack"],
        reach: function () { return 5; },
        available: function (context, item, purpose, target) { return !!target && target.health > 0; },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            // 目标正背身撤离时，这一扑翻倍，值得插在普通攻击之前。
            return CompanionBehavior.fleeing(context, target) ? 60 : 0;
        }
    });
}
