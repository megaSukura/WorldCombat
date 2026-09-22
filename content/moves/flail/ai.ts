/**
 * 抓狂 / flail 的伙伴 AI 用途。
 *
 * 什么局面下出手：抓狂只有在**自己血少、对手又贴得近**时才打得动——每下威力与下数都随缺失血量涨，
 * 满血时它只是一串软拳头。所以 `available` 要求有可见、敌对、存活且在 `ai.maxChase` 内的目标；
 * `priority` 随自己血量下降抬高，开了 `ai.finishLow` 时对残血目标再加一档。够不到交给共享接近逻辑。
 * 拼命式（`reckless`）每下自损：`available` 在开启它且自己血量低于 `ai.recklessFloor` 时直接放弃，
 * 避免把自己打空——这是玩家能预见、也看得见的取舍。
 */
namespace PokemonSkills {
    function flailWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
    }

    CompanionBehavior.registerUse("flail", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.ai<boolean>(capability, "reckless", false)
                && CompanionBehavior.ratio(CompanionBehavior.source(context)) < CompanionBehavior.ai<number>(capability, "recklessFloor", 0.22))
                return false;
            if (!target) return true;
            return flailWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !flailWants(context, capability, target)) return 0;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            const threat = target.health / Math.max(1, target.maximum);
            let score = 16;
            if (ratio < 0.5) score += 12;
            if (ratio < 0.28) score += 12;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && threat < 0.35) score += 8;
            return score;
        }
    });

    addPreferences("flail", {}, [
        field(pathOf("reckless"), "拼命式", "boolean", {
            help: "开启：每次乱打威力 ×1.25、下数 ×1.35，但每一下自损最大生命的一小部分，残血时可能把自己打空；关闭（稳住式）＝不自损，下数与单发都低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 1, max: 8, step: 1,
            help: "超过这个距离就不主动乱打，先朝目标走近。抓狂是近身招，越大越会在更远处就起手（多半会落空）。"
        }),
        field(pathOf("ai.finishLow"), "收残优先", "boolean", {
            help: "开启：目标血量低于三成时抬高抓狂的排序，用它做最后一段；关闭则只看自己有多残。"
        }),
        field(pathOf("ai.recklessFloor"), "拼命血线", "number", {
            min: 0.05, max: 0.6, step: 0.05, display: { scale: 100, suffix: "%" },
            help: "开启拼命式后，自己血量低于这个比例时不再乱打，免得自损把自己打空。越高越保守。"
        })
    ]);
}
