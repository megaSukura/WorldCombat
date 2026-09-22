/**
 * 魂舞烈音爆 / clangoroussoul 的 AI 用途。
 *
 * 什么局面下出手（fortify）：附近有威胁、但还没有贴到脸上（距离不小于 4 格）时，先站定把五项拉起来再交战。
 * 生命不足以支付「拍数×每拍 + 保底」时不用，避免把自己烧到危险区。
 * 没有威胁时只在整备命令（驻守／自主／工作）下起舞，跟随与近战优先。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("clangoroussoul", {
        protocols: ["world_combat:fortify"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            var self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            var reserve = CompanionBehavior.ai<number>(capability, "reserveHealth", 0.2);
            var extended = !!(capability.data.config && capability.data.config.extended);
            if (CompanionBehavior.ratio(self) < (extended ? 0.204 * 2 : 0.3) + reserve) return false;
            if (!threat)
                return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
            var distance = CompanionBehavior.distance(self.point, threat.point);
            return distance >= 4 && distance <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
        },
        accepts: function (context, capability, target) {
            return target.ref === CompanionBehavior.source(context).ref;
        },
        priority: function (context, capability, target) {
            var threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            // 有安全窗口时抢在接触前起舞。
            return 105;
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
