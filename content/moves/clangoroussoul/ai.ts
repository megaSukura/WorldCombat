/**
 * 魂舞烈音爆 / clangoroussoul 的 AI 用途。
 *
 * 什么局面下出手（fortify）：附近有威胁、但还没有贴到脸上（距离不小于 4 格）时，先站定把五项拉起来再交战。
 * 只在还有至少一项能提升、且生命足够支付「本拍 + 保底」时使用，避免把自己烧到危险区。
 * 排序按真实收益与压力区分：还能提升的项目越多越值得；对手越远（远射/接近压力）越愿意先叠底牌；
 * 对手已经贴身输出时反而压低——先保命或还手，不是仅凭距离就给同一个高分。
 */
namespace PokemonSkills {
    /** 本个体这五项里还没到 +6 的项数；起势与正收益判断共用。 */
    function clangorousMissing(context: WorldBehavior.Context): number {
        const self = CompanionBehavior.source(context);
        let count = 0;
        for (let index = 0; index < clangorousStats.length; index++)
            if (CompanionBehavior.stage(context, self, clangorousStats[index]) < 6) count++;
        return count;
    }

    CompanionBehavior.registerUse("clangoroussoul", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (clangorousMissing(context) === 0) return false;
            var self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.2);
            var extended = !!(capability.data.config && capability.data.config.extended);
            if (CompanionBehavior.ratio(self) < (extended ? 0.204 * 2 : 0.3) + reserve) return false;
            var distance = CompanionBehavior.distance(self.point, threat.point);
            return distance >= 4 && distance <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            var threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            var self = CompanionBehavior.source(context);
            var distance = CompanionBehavior.distance(self.point, threat.point);
            var score = 12 + clangorousMissing(context) * 6;      // 还能升的项越多越值得
            if (distance > 10) score += 8;                          // 远距/远射压力，先叠底牌
            else if (distance > 4) score += 4;                       // 还在接近的窗口
            if (threat.attacking) score -= 16;                       // 已被贴身输出时先保命/还手
            if (CompanionBehavior.ratio(self) > 0.6) score += 6;     // 血线宽裕才敢卖
            return Math.max(0, score);
        }
    });

    addPreferences("clangoroussoul", {}, [
        field(pathOf("ai.reserveHealth"), "保留生命", "number", {
            min: 0.05, max: 0.6, step: 0.05,
            help: "起舞前要求留下的生命比例；越高越不肯卖血，生命不足时改为先攻击或走位。"
        }),
        field(pathOf("ai.maxChase"), "起舞距离上限", "number", {
            min: 5, max: 32, step: 1,
            help: "威胁超过这个距离就不再考虑先起舞；越大越愿意在远处先叠状态。"
        })
    ]);
}
