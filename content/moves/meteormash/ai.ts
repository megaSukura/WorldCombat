/**
 * 彗星拳 / meteormash —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一记短靠后向下砸实的流星重拳。`available` 要求目标可见、敌对、存活，且在自己
 *   `ai.maxChase`（默认 9）格内；焦点目标不受距离限制。总接触距离是固定的，够不着的目标只能先走近。
 * 选择倾向：`ai.finishLow`（默认开）打开时，生命比例低的目标排前——这一拳是拿来收残的。
 *   落拳有真实的向下下扫与首碰判定，移动慢或体型大的目标更难躲开，因此它们额外加一点权重；
 *   落点震开只是顺带，不改变目标选择。
 * 够不到交给共享接近逻辑；进了拳程就短靠并砸下。放完交回共享交战计划。
 */
namespace PokemonSkills {
    /** 慢或大的目标更难躲开这一记可走位的落拳，给它们一点权重。 */
    function meteormashSteady(target: CompanionBehavior.Entity): number {
        const speed = target.velocity ? Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) : 0;
        let bonus = 0;
        if (speed < 0.08) bonus += 6;
        else if (speed < 0.18) bonus += 3;
        const width = typeof target.width === "number" ? target.width : 0.9;
        const height = typeof target.height === "number" ? target.height : 1.4;
        if (width * height > 1.7) bonus += 4;
        return bonus;
    }

    CompanionBehavior.registerUse("meteormash", {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            let base = 19;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true)) {
                const ratio = CompanionBehavior.ratio(target);
                if (ratio <= 0.4) base += 12;
                else if (ratio <= 0.7) base += 5;
            }
            base += meteormashSteady(target);
            return base;
        }
    });

    addPreferences("meteormash", {}, [
        field(pathOf("comet"), "陨星式", "boolean", {
            help: "开启：总距离约 ×1.3、拳程约 ×1.15、落点半径约 ×1.35、震威约 ×1.3，但拳威约 ×0.9、冷却 +6 刻，适合靠进人堆一次连震带砸。关闭（重拳式，默认）：拳更重、出手更利落，适合点名单体重击。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动冲拳，先走近；越大越愿意对更远的目标冲进去。总接触距离固定，够不着就得先走近。"
        }),
        field(pathOf("ai.finishLow"), "先收残血", "boolean", {
            help: "开启后，生命比例低的可见敌人优先——这一拳拿来收残最划算；关闭则只按普通攻击排序。"
        })
    ]);
}
