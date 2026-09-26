/**
 * 气场轮的 AI：一段较长的贴地滚动重击，附带自身提速，也可用来拉近或拉开身位。
 *
 * 局面：有可见、敌对的存活目标就列入候选；reach 取本招的选择射程（12 格），从较远处就能滚过去，
 *   够不到交给共享接近逻辑。放完后自身更快，继续常规交战。
 * 对谁出手：能直接滚撞到目标（距离在本个体滚动距离 `distance` 内）时收益最大；只能用位移拉近时按普通排序。
 * 速度满阶时提速没有收益——那时它只被当作攻击或位移使用，不再为提速而多给分。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(aurawheelId, {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            return !!target && !target.friendly && target.visible && target.health > 0;
        },
        accepts: function (context, item, target) { return !target.friendly && target.visible && target.health > 0; },
        priority: function (context, item, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            const strike = p(aurawheelId, "distance", CompanionBehavior.world(context));
            let score = CompanionBehavior.ratio(target) > 0.3 ? 10 : 4;
            if (gap <= strike) score += 8;
            else if (CompanionBehavior.stage(context, self, "spe") >= 6) score -= 6;
            return score;
        }
    });
}
