/**
 * 滚动 / rollout 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活且在自己 `ai.maxChase`（默认 6）格以内；更远交给共享接近逻辑。
 * 对谁出手：当前威胁；命中后把人顶开，伙伴会重新贴上再滚下一趟。
 * 为什么优先接着滚：`ai.pressOn`（默认开）下，身上带着连滚身份时优先级抬高——层数断掉就从最轻的一趟重来。
 * 放完之后：只要还在连滚窗口里，伙伴会倾向继续滚动；被打断或被拉开距离就交回共享顺序重新判断。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse(rolloutId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const pressing = CompanionBehavior.ai<boolean>(capability, "pressOn", true)
                && CompanionBehavior.status(context, self, rolloutStreak);
            return pressing ? 32 : 21;
        }
    });

    addPreferences(rolloutId, {}, [
        flag("heavy", "重滚式"),
        number("ai.maxChase", "出手距离", 2, 12, 1),
        flag("ai.pressOn", "接住滚动")
    ]);
}
