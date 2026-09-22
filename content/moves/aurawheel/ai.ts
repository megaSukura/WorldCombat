/**
 * 气场轮的 AI：一段较长的贴地滚动重击，附带自身提速。
 *
 * 局面：有敌对目标就可用；目标还在半血以上、这段滚动能打完时给出中等优先。
 * 出手：从较远处就能滚过去（射程 9），共享任务负责对准与逼近；放完后自身更快，继续常规交战。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aurawheelId, {
        protocols: ["world_combat:attack"],
        reach: function () { return 8; },
        available: function (context, item, purpose, target) { return !!target && target.health > 0; },
        accepts: function (context, item, target) { return target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            // 目标血量健康时这一记重击收益最大；残血目标留给收尾招。
            return CompanionBehavior.ratio(target) > 0.3 ? 10 : 0;
        }
    });
}
