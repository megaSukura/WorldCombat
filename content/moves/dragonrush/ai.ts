/**
 * 龙之俯冲 / dragonrush 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 10）格以内；更远交给共享接近逻辑。
 * 这是一次带落点的俯冲：**目标在中距离（3..8 格）时最合适**——俯冲正好把这段距离补上、威压也罩得到；
 * 贴到脸上（1.5 格内）反而容易扑过头，优先级会压低。
 * 放完之后：砸中就把对手顶开、可能把它镇住；接着交给共享顺序决定追打还是换招。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(dragonrushId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 10);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 22;
            if (distance >= 3 && distance <= 8) score += 6;
            if (distance <= 1.5) score -= 4;
            if (!CompanionBehavior.status(context, target, "flinch")) score += 2;
            return score;
        }
    });

    addPreferences(dragonrushId, {}, [
        field(pathOf("dread"), "威压式", "boolean", {
            help: "开启：威压圈更大、畏缩更易更久，但俯冲更轻、命中率略低、起手与冷却更久——先镇住再撞。关闭（默认）：迅袭式，砸得更重、命中更稳、扑得更快，威压与畏缩较弱。"
        }),
        field(pathOf("ai.maxChase"), "俯冲距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不俯冲，先走近。龙之俯冲最舒服的是中距离（3..8 格），设得太大常常够不到。"
        })
    ]);
}
