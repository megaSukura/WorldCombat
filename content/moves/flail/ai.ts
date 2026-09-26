/**
 * 抓狂 / flail 的伙伴 AI 用途。
 *
 * 什么局面下出手：抓狂只有在**自己血少、对手又贴得近**时才打得动——每下威力与下数都随缺失血量涨，
 * 满血时它只是一串软拳头。所以 `available` 要求有可见、敌对、存活且在 `ai.maxChase` 内的目标；
 * `priority` 随自己血量下降抬高，被围得越紧（身前实际能扫到的敌人越多）越值，开了 `ai.finishLow`
 * 时对残血目标再加一档。
 *
 * 拼命式（根配置 `reckless`，不是 `ai.reckless`）每下自损：`available` 按本次真实会甩出的下数
 * 估算整段自损（`swings × recoil`），扣完后仍低于 `ai.recklessFloor` 就放弃，避免低血自杀性误选。
 * 这是玩家能预见、也看得见的取舍。
 */
namespace PokemonSkills {
    function flailWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 4);
    }

    /** 身前射程内实际能扫到的非友方数量；乱打是解围招，贴得越密越值。 */
    function flailPress(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        var self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[],
            range = capability.data.range, count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) <= range) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("flail", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            var config = capability.data.config;
            if (config && config.reckless === true) {
                // 根配置开了拼命式：按当前血量会甩出的下数估整段自损，扣完仍低于血线就放弃。
                var world = CompanionBehavior.world(context);
                var ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
                var swings = Math.max(2, Math.round(p("flail", "swings", world)));
                var recoil = p("flail", "recoil", world);
                if (ratio - swings * recoil < CompanionBehavior.ai<number>(capability, "recklessFloor", 0.22)) return false;
            }
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
            const pressed = flailPress(context, capability);
            if (pressed >= 2) score += Math.min(12, (pressed - 1) * 4);
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
            help: "开启拼命式后，按整段自损扣完自己血量仍低于这个比例时就不再乱打，免得自损把自己打空。越高越保守。"
        })
    ]);
}
