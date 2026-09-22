/**
 * 觉醒力量的 AI：一枚远程特殊单发。
 *
 * 局面：有敌对目标且在其射程内就用它；优先打特防低的目标（这是它属性与特殊伤害能拉开差距的地方）。
 * 出手：目标在射程内直接点射，够不到时共享任务负责走近。放完后继续常规交战，不做额外收尾。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(hiddenpowerId, {
        protocols: ["world_combat:attack"],
        reach: function () { return p(hiddenpowerId, "reach"); },
        available: function (context, item, purpose, target) { return !!target && target.health > 0; },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            // 特殊攻击手用远程特殊招更划算；面对高物防目标时略提高。
            return 5;
        }
    });
}
