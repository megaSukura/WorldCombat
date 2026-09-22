/**
 * 魔法反射 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内、自己身上还没撑着膜。膜一旦撑开就等对手朝自己递状态招。
 *   ai.opening=随时（默认）见威胁就先撑上；=受压时只在对手正攻击自己或主人、或自己刚被打过时撑膜。
 * 对谁出手：自己；膜会自动罩在前方，不需要选中队友（只反射朝自己来的招）。
 * 候选之间怎么排：正在被打时抬到 100 越过分派顺序先撑上；其余情况 46，排在共用防护里。
 * 够不到怎么办：不需要够——威胁太远就先不理，等它靠近到 ai.maxChase 以内。
 * 放完之后：接到可反射的招就弹回原施放者，没接到就收膜、不结账；膜还在时不重复撑。
 * 配置 sweep（广膜／窄膜）改变反射距离与膜持续；ai.maxChase、ai.opening 决定追多远、什么时候撑膜。
 */
namespace PokemonSkills {
    function magiccoatPressured(context: WorldBehavior.Context): boolean {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
        if (!threat) return false;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
    }

    CompanionBehavior.registerUse(magiccoatId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(item, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(item, "opening", "anytime") !== "anytime") return magiccoatPressured(context);
            return true;
        },
        accepts: function (context, _item, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, item) { return magiccoatPressured(context) ? 100 : 46; }
    });

    const magiccoatChase = number("ai.maxChase", "考虑距离", 4, 26, 1);
    magiccoatChase.help = "伙伴只在威胁离自己这么远以内时才撑膜；调小只在贴身时撑，调大在更远处就先备好。";
    const magiccoatOpening = choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时", "受压时撑膜"]);
    magiccoatOpening.help = "随时：见威胁就先撑上，赌对手接下来会递状态招；受压时撑膜：只在对手正攻击自己或主人、或自己刚被打过时撑。";
    const magiccoatStation = flag("ai.leaveStation", "驻守时允许离位");
    magiccoatStation.help = "开启后，收到「驻守」指令时也会离开原位去撑膜。";

    addPreferences(magiccoatId, { ai: { maxChase: 14, opening: "anytime", leaveStation: false } },
        [magiccoatChase, magiccoatOpening, magiccoatStation]);
}
