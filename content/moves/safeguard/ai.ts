/**
 * 神秘守护 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、真实守护半径内还有人（含自己）没被守护罩住，且威胁在 ai.maxChase 以内；
 *   ai.opening=受压时张罩（默认）只在对手正攻击自己或主人、或自己刚被打过时张；
 *   =随时时见威胁就先罩上，当常备防御。
 * 对谁出手：自己；光罩会以自身为锚顺手把队友一起罩住，所以不需要选中队友。
 * 半径怎么取：读本招实际的守护半径公式（身高／特防／守护方式），因此“要护住几个人”按真实范围算，
 *   而不是写死一个距离；非宝可梦来源无从求值时回退到保守距离。
 * 候选之间怎么排：范围内有人没被罩住时排得更前，人越多、越有人在挨打越急（54 起，封顶 70）；
 *   已经罩满（自己与范围内友方都有守护）就不再重复出手。
 * 够不到怎么办：不需要够——威胁太远就先不理会，等它靠近。
 * 放完之后：光罩替自己与队友挡下异常状态，交回共享顺序沿原战术继续战斗；离开光罩的人随剩余守护走完失去。
 * 配置 ward（深守／早守）改变半径、时长与节奏；ai.maxChase、ai.opening 决定追多远、什么时候张罩。
 */
namespace PokemonSkills {
    /** 本招实际守护半径，来自参数公式；非宝可梦来源回退到保守距离。 */
    function safeguardReach(context: WorldBehavior.Context): number {
        try {
            const value = p(safeguardId, "wardRadius", CompanionBehavior.world(context));
            return isFinite(value) && value > 0 ? value : 6;
        } catch (error) { return 6; }
    }
    /** 真实半径内（含自己）被守护罩住的人数；用于“是否还有值得张罩的人”。 */
    function safeguardUncovered(context: WorldBehavior.Context, radius: number): { total: number; urgent: number } {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let total = 0, urgent = 0;
        if (!CompanionBehavior.status(context, self, safeguardStatus)) { total++; if (self.hurtAgo < 60) urgent++; }
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (String(other.ref) === String(self.ref)) continue;
            if (CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (CompanionBehavior.status(context, other, safeguardStatus)) continue;
            total++;
            if (other.hurtAgo < 60 || other.attacking === self.ref) urgent++;
        }
        return { total: total, urgent: urgent };
    }

    CompanionBehavior.registerUse(safeguardId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (safeguardUncovered(context, safeguardReach(context)).total === 0) return false;
            const self = CompanionBehavior.source(context);
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "incoming") !== "incoming") return true;
            const owner = context.facts.owner;
            return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context) {
            const uncovered = safeguardUncovered(context, safeguardReach(context));
            if (uncovered.total === 0) return 46;
            return Math.min(70, 54 + uncovered.total * 2 + uncovered.urgent * 3);
        }
    });

    addPreferences(safeguardId, { ai: { maxChase: 14, opening: "incoming", leaveStation: false } }, [
        number("ai.maxChase", "考虑距离", 4, 26, 1),
        choice("ai.opening", "出手时机", ["incoming", "anytime"], ["受压时张罩", "随时"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
