/**
 * 光墙 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、自己还没被幕罩住，且它在 ai.maxChase 以内；
 *   ai.opening=受压时张幕（默认）只在对手正攻击自己或主人、或自己刚被打过时张；=随时时见威胁就先张上。
 *   ai.protectWeak 开启时，只在自己或半径内友方生命低于 65% 时才张幕——留着护残血。
 * 对谁出手：自己；光幕会以自身为锚顺手把队友一起罩住。
 * 候选之间怎么排：正在被打时抬到 100 越过分派顺序，先把幕张起来；其余情况 44。
 * 放完之后：光幕替自己与队友削特殊、滤附带效果；幕还在时不再重复。
 * 配置 thick（厚幕／柔幕）改变减伤与滤淡；ai.maxChase、ai.opening、ai.protectWeak 决定追多远、什么时候张幕。
 */
namespace PokemonSkills {
    function lightscreenPressured(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"], self = CompanionBehavior.source(context);
        if (!threat) return false;
        const owner = context.facts.owner;
        return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
    }
    function lightscreenWeak(context: WorldBehavior.Context): boolean {
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.ratio(self) < 0.65) return true;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, self.point) > 6) continue;
            if (CompanionBehavior.ratio(other) < 0.65) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(lightscreenId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, lightscreenStatus)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") === "incoming" && !lightscreenPressured(context, capability)) return false;
            if (CompanionBehavior.ai<boolean>(capability, "protectWeak", false) && !lightscreenWeak(context)) return false;
            return true;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) { return lightscreenPressured(context, capability) ? 100 : 44; }
    });

    const lightscreenAiChase = number("ai.maxChase", "考虑距离", 4, 26, 1);
    lightscreenAiChase.help = "伙伴只在威胁离自己这么远以内时才考虑张光幕；调小只在贴身受压时张，调大在更远处就先准备好。";
    const lightscreenAiOpening = choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时张幕", "随时"]);
    lightscreenAiOpening.help = "受压时张幕：只在对手正攻击自己或主人、或自己刚被打过时张；随时：见威胁就先罩上。";
    const lightscreenAiWeak = flag("ai.protectWeak", "留到有人残血才张");
    lightscreenAiWeak.help = "开启后，只有自己或身边 6 格内友方生命低于 65% 时才张光幕；关闭则见威胁就张。";
    const lightscreenAiStation = flag("ai.leaveStation", "驻守时允许离位");
    lightscreenAiStation.help = "开启后，收到「驻守」指令时也会离开原位去张光幕。";

    addPreferences(lightscreenId, { ai: { maxChase: 14, opening: "anytime", protectWeak: false, leaveStation: false } },
        [lightscreenAiChase, lightscreenAiOpening, lightscreenAiWeak, lightscreenAiStation]);
}
