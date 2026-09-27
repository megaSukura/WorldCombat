/**
 * 诡计 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有一个真实威胁进入 ai.maxChase 内、且还没贴身到 ai.minGap 以内（留出起手空档），
 *   并且自己确实有一套能在本短窗内兑现的特殊输出方案时，才值得停下来盘一算计——没有能打到的特殊攻击，
 *   这条毒计就只是一段很短的特攻，不如把出手让给真正的输出。窗口很短，敌人还在很远处先算容易白费；
 *   空地没有对手时不循环施放，玩家可以战前手动先垫。
 * 什么时候最想出手：差距还在 ai.minGap 之外时 priority 越过共享交战次序；特攻不低于物攻时再优先一档——
 *   以特殊攻击为主的个体最能吃满这条毒计。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：特攻等级已写进公共能力阶梯（载体窗口拥有）；诡计窗口内不重复施放，先打出去，窗口走完才重新考虑。
 */
namespace PokemonSkills {
    /** 短窗的保守下限（刻）：用来估计接近后能否在本窗口内打出。 */
    const nastyPlotWindowFloor = 50;

    /** 特殊输出能力：变化招与辅助招不算；原生威力或直接指向敌人的脚本伤害都可兑现，不把回合制威力当唯一判据。 */
    function nastyPlotSpecialOutput(capability: WorldBehavior.Capability): boolean {
        try {
            const move = CobblemonCombat.moveTemplate(String(capability.data.move));
            if (String(move.category()).toLowerCase() !== "special") return false;
            return move.power() > 0 || String(capability.data.kind) === "enemy";
        } catch (error) { return false; }
    }

    /**
     * 本短窗能否真正兑现：从当前决策帧的实际特殊输出 capability 读就绪（含冷却）、剩余 PP 与射程，
     * 按当前威胁距离估算接近后能否落在窗口内。原生行为体没有可读招式表时按有攻击能力处理。
     */
    function nastyPlotSpecialPlan(context: WorldBehavior.Context, threat: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        if (!actor || !world.valid(actor)) return false;
        if (String(actor.domain()) !== "cobblemon") return true;
        const gap = CompanionBehavior.distance(self.point, threat.point);
        const speed = typeof self.speed === "number" && isFinite(self.speed) && self.speed > 0 ? self.speed : 0;
        const closeable = speed * nastyPlotWindowFloor;
        for (let i = 0; i < context.capabilities.length; i++) {
            const item = context.capabilities[i];
            if (!item || !item.data || item.data.use === "nastyplot") continue;
            if (item.data.available === false || item.data.ready === false) continue;
            if (!nastyPlotSpecialOutput(item)) continue;
            const range = Number(item.data.range);
            if (!isFinite(range) || range < 0) continue;
            // 现在就能打到，或剩余距离能在窗口内走完，这一档毒计才有处可下。
            if (gap <= range || gap - range <= closeable) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("nastyplot", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "nastyplot")) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (!nastyPlotSpecialPlan(context, threat)) return false;
            const gap = CompanionBehavior.distance(self.point, threat.point);
            if (gap < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 14);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return 0;
            const focused = (context.facts.specialAttack || 0) >= (context.facts.attack || 0);
            return focused ? 106 : 98;
        }
    });

    addPreferences("nastyplot", {}, [
        field(pathOf("ai.maxChase"), "算计距离", "number", {
            min: 4, max: 26, step: 1,
            help: "威胁进入这个距离内才考虑起念；越大越早开始算计。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再算计、直接攻击；调大更常在近身时放弃强化。"
        })
    ]);
}
