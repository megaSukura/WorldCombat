/**
 * 致命针刺的 AI：短距收尾，专门找残血目标下手。
 *
 * 局面：有敌对目标就可用；目标生命比例低于 35% 时给出高优先，优先于普通攻击，以便据这一击拿击倒收益。
 * 出手：贴到突刺距离内再出手；够不到时共享任务负责逼近。放完若没击倒则回到常规交战。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(fellstingerId, {
        protocols: ["world_combat:attack"],
        reach: function () { return 3.6; },
        available: function (context, item, purpose, target) { return !!target && target.health > 0; },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            // 残血目标最可能被这一击带走，命中即触发攻击提升。
            return CompanionBehavior.ratio(target) < 0.35 ? 70 : 0;
        }
    });
}
