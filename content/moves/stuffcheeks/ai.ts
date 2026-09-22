/**
 * 大快朵颐 的伙伴 AI：这一口只吃自己手里的树果，把它变成一层防御。
 *
 * 什么局面有意义：手里握着树果（`cobblemon:berries`），并且要么有威胁进到 ai.maxChase（默认 12）以内，
 *   要么处在驻守／自主／工作这类有闲的时候。没有树果时这一口根本吃不了，`available` 直接不成立。
 * 对谁出手：自己；由共用增益任务直接施放，不需要接近。
 * 候选之间怎么排：有威胁且血量掉到一半以下时 priority 110 抢在共享次序前先撑起来；其余 50，排在普通增益里。
 * 放完之后：树果被吃掉、防御提升、果子效果落到自己身上；手里空了之后 `available` 不再成立，不会重复吃。
 * 配置：savor 在参数层换「细嚼吸收好」与「囫囵吞得快」；ai.maxChase 是愿意在多远的威胁下先吃。
 */
namespace CompanionBehavior {
    function stuffcheeksHolds(context: WorldBehavior.Context): boolean {
        const access = world(context), actor = access.actor(source(context).ref);
        if (!actor || String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        return !!String(pokemon.heldItem()) && pokemon.heldTag("cobblemon:berries");
    }

    const stuffcheeksChase = PokemonSkills.number("ai.maxChase", "开吃距离", 2, 20, 1);
    stuffcheeksChase.help = "威胁进入这个距离内才考虑先吃掉手里的树果撑起防御；调小只在贴身时吃，调大敢在远处提前吃。";

    PokemonSkills.addPreferences("stuffcheeks", {}, [stuffcheeksChase]);

    registerUse("stuffcheeks", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            if (!stuffcheeksHolds(context)) return false;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (threat && !threat.friendly && threat.health > 0 && distance(source(context).point, threat.point) <= ai<number>(item, "maxChase", 12)) return true;
            return context.facts.intent === "hold" || context.facts.intent === "autonomous" || context.facts.intent === "work";
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); },
        approachTarget: function (context) { return source(context); },
        priority: function (context, _item, _target) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return 0;
            return ratio(source(context)) < 0.5 ? 110 : 50;
        }
    });
}
