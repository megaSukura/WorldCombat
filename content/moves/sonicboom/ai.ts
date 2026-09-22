/**
 * 音爆 / sonicboom 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 它是最便宜、最快的一记固定伤害，所以在别的招式都不划算时被当作填充；`ai.finish`（默认开）在目标生命
 * 已经很低时把它排到前面——固定 20 点不看防御，正好用来补刀；代价是可能把这一发浪费在满血目标上。
 * 回响式不改变出手条件，只把第二声与更长的冷却带进来。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("sonicboom", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) <= 0.35) score += 22;
            return score;
        }
    });

    addPreferences("sonicboom", {}, [
        field(pathOf("reverb"), "回响式", "boolean", {
            help: "开启：第一声之后隔一小段沿同一方向再爆一声，对当时还在线上的人再削固定的 20；代价是第二声把施法者多定住一段、冷却更长。关闭（单声式，默认）：一声了事，更快更省。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不出手，先走近。越大越会在更远处先手发一声。"
        }),
        field(pathOf("ai.finish"), "残血优先", "boolean", {
            help: "开启：目标生命很低时优先用它补刀（固定 20 点不看防御）；关闭：只把它当普通填充招式。"
        })
    ]);
}
