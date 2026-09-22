/**
 * 连斩 / furycutter 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 5）格以内；更远交给共享接近逻辑。
 * 它是攒节奏的招，所以 `ai.pressOn`（默认开）让已经带着连斩身份的自己优先接着砍——
 * 带着层数时优先级抬高，因为断掉就归零；关掉后当成普通的中近距离连打排序。
 * 对谁出手：当前威胁；命中后层数继续攒，落空或换招才清空。
 * 放完之后：只要还在窗口里，伙伴会倾向继续连斩；被打断或被拉开距离就交回共享顺序重新判断。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(furycutterId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const pressing = CompanionBehavior.ai<boolean>(capability, "pressOn", true)
                && CompanionBehavior.status(context, self, furycutterStreak);
            return pressing ? 34 : 22;
        }
    });

    addPreferences(furycutterId, {}, [
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.pressOn", "接住连斩")
    ]);
}
