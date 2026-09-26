/**
 * 力量转换 / powershift 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁、在 ai.maxChase（默认 14）内、还没贴身，而且这次交换真的把你换到需要的形态：
 *   攻高防低、血量又低时换成守势硬扛；防高攻低、血量健康时换成攻势输出。两项差距太小（未达 ai.minEdge）
 *   或方向不对时都不换——单纯差距大并不值得削弱自己。
 * 什么时候最想出手：满足方向与血量条件时 priority 100；低血转守时 priority 104，抢在共享交战次序前先扛住。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：数值已经换过来，窗口内不再重复；窗口走完自动换回，再看局面。
 * 配置 hold（维持）改变窗口与冷却；ai.low 决定多低算「低血」，ai.minEdge 决定差距多小就不值得换。
 */
namespace PokemonSkills {
    /**
     * 只读、决策内缓存：这次交换会把攻防倒向哪一边。2 = 低血且攻高防低，转守势；
     * 1 = 健康且防高攻低，转攻势；0 = 换了会削弱自己，不做。argument 传 {low, edge}。
     */
    CompanionBehavior.registerFact("world_combat:move_powershift/intent", function (access, actor, argument) {
        if (String(actor.domain()) !== "cobblemon" || !access.valid(actor)) return 0;
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(access, actor);
        const attack = NativeEffects.stat(pokemon, state, "atk"), defence = NativeEffects.stat(pokemon, state, "def");
        if (!isFinite(attack) || !isFinite(defence)) return 0;
        const low = argument && typeof argument.low === "number" ? argument.low : 0.6;
        const edge = argument && typeof argument.edge === "number" ? argument.edge : 1.05;
        const high = Math.max(attack, defence), small = Math.max(1, Math.min(attack, defence));
        if (high / small < edge) return 0;
        const body = access.observe(actor);
        const ratio = body ? body.health() / Math.max(1, body.maxHealth()) : 1;
        if (attack > defence) return ratio < low ? 2 : 0;
        if (defence > attack) return ratio >= low ? 1 : 0;
        return 0;
    });

    CompanionBehavior.registerUse("powershift", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (CompanionBehavior.status(context, self, "powershift")) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 14)) return false;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 3)) return false;
            return powershiftIntent(context, capability) > 0;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "powershift")) return 0;
            return powershiftIntent(context, capability) === 2 ? 104 : powershiftIntent(context, capability) > 0 ? 100 : 0;
        }
    });

    function powershiftIntent(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const self = CompanionBehavior.source(context);
        const intent = CompanionBehavior.fact<number>(context, "world_combat:move_powershift/intent", self,
            { low: CompanionBehavior.ai<number>(capability, "low", 0.6), edge: CompanionBehavior.ai<number>(capability, "minEdge", 1.05) });
        return typeof intent === "number" ? intent : 0;
    }

    addPreferences("powershift", {}, [
        field(pathOf("ai.maxChase"), "转换距离", "number", {
            min: 3, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑转换；越大越早把形态换好。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再转换、直接应对；调大更常在近身时放弃转换。"
        }),
        field(pathOf("ai.minEdge"), "最小差距", "number", {
            min: 1.0, max: 2.0, step: 0.05,
            help: "攻防差距（大值 / 小值）小于它就不转换；调高只在高攻或高防的极端个体上才换，避免无意义的来回。"
        }),
        field(pathOf("ai.low"), "低血阈值", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于它就算「低血」：攻高防低时转成守势硬扛；调高会更早转入守势，调低则只在濒危时才防守转换。"
        })
    ]);
}
