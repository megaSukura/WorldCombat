/**
 * 电球 / electroball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在自己 `ai.maxChase`（默认 14）格以内；更远交给共享接近逻辑。
 * 这一招以「快」为燃料，**自己速度越快越倾向用它**；它是射程最长的几招之一，所以伙伴会站在远处先手开火，
 * 对手贴上来之前尽量多投几发。
 * 放完之后：对手离得近就交给别的近身招；只要还在投掷距离内就优先继续投，这是它最舒服的用法。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(electroballId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            let score = 21;
            if (context.facts.speed >= 95) score += 10;
            if (context.facts.speed >= 130) score += 5;
            if (distance >= 6) score += 4;
            return score;
        }
    });

    addPreferences(electroballId, {}, [
        field(pathOf("overcharge"), "过载式", "boolean", {
            help: "开启：威力与判定半径更高，但电团更重、飞得更慢（对手更容易走开）、起手与冷却更久。关闭（默认）：轻快式，飞得快、出手快、回得干净，单发略低。"
        }),
        field(pathOf("ai.maxChase"), "投掷距离", "number", {
            min: 4, max: 20, step: 1,
            help: "只对这么远以内的目标投弹；更远先走近。设大适合风筝型伙伴，设小则等对手靠近再打。"
        })
    ]);
}
