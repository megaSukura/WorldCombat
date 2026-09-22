/**
 * 精神突进 / psychoboost 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 16）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.tough`（默认开）打开时，生命比例最高的目标排前——把全族最重的一记交给最硬的对手，
 *   而不是浪费在已经残血的目标上；特攻高于物攻的个体更愿意用它（这是它的本行）。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记最高威力的单体特殊并大幅削自己的特攻；回响式还会在片刻后补一响；交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function psychoboostWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
    }

    CompanionBehavior.registerUse("psychoboost", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psychoboostWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psychoboostWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 26;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "tough", true) && CompanionBehavior.ratio(target) > 0.5) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            return score;
        }
    });

    addPreferences("psychoboost", {}, [
        field(pathOf("echo"), "回响式", "boolean", {
            help: "开启：主爆威力 ×0.86，但片刻后在原爆点再内爆一次、补上第二响的伤害；起手 +3 刻、冷却 +7 刻，目标走出范围就能躲掉第二响。关闭（瞬爆式）：一下全力、瞬时结算、单点更重、更快。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 7, max: 22, step: 1,
            help: "超过这个距离就不主动内爆，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.tough"), "挑最硬的打", "boolean", {
            help: "开启：生命比例最高的目标排前，把最重的一记交给最硬的对手；关闭则所有目标同价。"
        })
    ]);
}
