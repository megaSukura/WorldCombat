/**
 * 礼物 / present 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记远程赌注盒。有可见、敌对、存活且落在 `ai.maxChase`（默认 10）格内的目标就列入候选；
 *   站在稍远处扔更安全（省得被贴脸），所以距离在 4 格以上时 priority 抬一档。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 什么时候不用：目标生命比例低于 `ai.riskBelow`（默认 0.4）时降档——盒子有可能反而把它治好，
 *   所以残血时不拿它赌。这个取舍会直接改变伙伴在追击残血目标时的出手选择。
 * 放完之后：交回共享顺序；它不占手，下一次决策就能再用。
 */
namespace CompanionBehavior {
    function presentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    registerUse("present", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return presentWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            if (!presentWants(context, capability, target)) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            let score = 16;
            if (gap >= 4) score += 6;
            if (CompanionBehavior.ratio(target) < CompanionBehavior.ai<number>(capability, "riskBelow", 0.4)) score -= 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("present", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("trick"), "戏耍盒", "boolean", {
            help: "开启：重击档几率升到 25%%、糖果几率升到 26%%，期望伤害更高但更常把对手治好（赌一把）。关闭（稳妥盒）：重击档 5%%、糖果 6%%，伤害更稳、几乎不会误放糖果。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "投掷距离", "number", {
            min: 4, max: 18, step: 1,
            help: "目标在这个距离以内才会递盒子；调大愿意从更远处先手，调小只在贴身时用。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.riskBelow"), "残血收手阈值", "number", {
            min: 0.1, max: 0.8, step: 0.05,
            help: "目标生命低于这个比例时，伙伴会降低这盒礼物的优先级——因为盒子有可能反而把它治好。调高更少对残血目标用它。"
        })
    ]);
}
