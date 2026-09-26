/**
 * 折弯汤匙 的伙伴 AI 用途：这招自己的一套出手计划——从最远处点名一个看得见的对手。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、它与自己之间通视（没有掩体），并且它还没被
 *   任何「引开注意」类状态罩住。ai.opening=迎击时只在对方正打自己或主人、或自己刚被打过时举匙。
 * 对谁出手：当前威胁；已经带着共享身份 aim_impaired 的目标跳过。
 * 够不到怎么办：reach 就是凝注距离（全族最远），超出先走近；被掩体挡住时交回共享接近逻辑找视线。
 * 放完之后：目标命中下降，伙伴交回共享顺序继续交战。正在攻击自己或主人的目标更值得先掰（重点强敌）。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("kinesis", { ai: { maxChase: 9, opening: "anytime", leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.choice("ai.opening", "出手时机", ["anytime", "targeting"], ["随时", "迎击时"]),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function kinesisWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        if (status(context, threat, "aim_impaired")) return false;
        if (!world(context).clear(point(self.point), point(threat.point))) return false;
        if (ai<string>(item, "opening", "anytime") !== "targeting") return true;
        const owner = context.facts.owner;
        return threat.attacking === self.ref || !!owner && threat.attacking === owner.ref || self.hurtAgo < 40;
    }

    registerUse("kinesis", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || kinesisWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !kinesisWants(context, item, target)) return 0;
            // 这招最擅长在远处点名：距离越远、越贴近射程上限，越优先。
            const self = source(context), owner = context.facts.owner;
            let score = 45 + Math.round(distance(self.point, target.point) * 3);
            // 正在攻击自己或主人的目标就是这场戏的点名对象。
            if (target.attacking === self.ref || !!owner && target.attacking === owner.ref) score += 12;
            return Math.min(92, score);
        }
    });
}
