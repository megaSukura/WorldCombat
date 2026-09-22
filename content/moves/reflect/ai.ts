/**
 * 反射壁 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、自己还没被壁罩住，且它在 ai.maxChase 以内；
 *   ai.opening=受压时立壁（默认）只在对手正攻击自己或主人、或自己刚被打过时立；=随时时见威胁就先立上。
 * 对谁出手：自己；壁会以自身为锚顺手把队友一起罩住，所以不需要选中队友。
 * 候选之间怎么排：正在被打时抬到 100 越过分派顺序，先把壁立起来；其余情况 44，排在共用增益里。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 放完之后：壁替自己与队友削物理、镜面还会弹回近身一击；壁还在时不再重复，离开范围的人随补给停止失去。
 * 配置 mirror（镜面／坚壁）改变减伤份额与反弹；ai.maxChase、ai.opening 决定追多远、什么时候立壁。
 */
namespace PokemonSkills {
    function reflectPressured(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
        if (!threat) return false;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
    }

    CompanionBehavior.registerUse(reflectId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, reflectStatus)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") !== "incoming") return true;
            return reflectPressured(context, capability);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) { return reflectPressured(context, capability) ? 100 : 44; }
    });

    const reflectAiChase = number("ai.maxChase", "考虑距离", 4, 26, 1);
    reflectAiChase.help = "伙伴只在威胁离自己这么远以内时才考虑立壁；调小只在贴身受压时立，调大在更远处就先准备好。";
    const reflectAiOpening = choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时立壁", "随时"]);
    reflectAiOpening.help = "受压时立壁：只在对手正攻击自己或主人、或自己刚被打过时立壁；随时：见威胁就先罩上。";
    const reflectAiStation = flag("ai.leaveStation", "驻守时允许离位");
    reflectAiStation.help = "开启后，收到「驻守」指令时也会离开原位去立壁。";

    addPreferences(reflectId, { ai: { maxChase: 14, opening: "anytime", leaveStation: false } },
        [reflectAiChase, reflectAiOpening, reflectAiStation]);
}
