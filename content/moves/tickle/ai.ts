/**
 * 挠痒 的伙伴 AI 用途：这招自己的一套出手计划——先把距离压到伸手可及，再挠下去。
 *
 * 什么局面有意义：有可见威胁、目标还没在痒意里、且离自己不超过 ai.maxChase。挠痒射程极短，
 *   所以真正决定是否可行的是「能不能贴上去」；共享任务负责把身体带到 reach 之内。
 * 对谁出手：当前威胁；已经带着痒意身份的目标跳过，避免重复。
 * 出手时机：ai.opening=迎击时只在目标正攻自己或主人、或自己刚被打过时伸手；随时则贴身就挠。
 * 够不到怎么办：reach 就是挠痒距离，够不到交给共享接近逻辑继续贴上去；它没有弹道，绕远没用。
 * 放完之后：目标攻击与防御一起下降，伙伴交回共享顺序，再决定继续追击还是拉开。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("tickle", { ai: { maxChase: 9, opening: "anytime", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 2, 16, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function tickleWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        if (status(context, threat, "ticklish")) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("tickle", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || tickleWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !tickleWants(context, item, target)) return 0;
            return item.data.config && item.data.config.firm ? 58 : 52;
        }
    });
}
