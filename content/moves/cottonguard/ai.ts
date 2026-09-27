/**
 * 棉花防守 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：有威胁且在 ai.maxChase 内时先裹上绒衣再扛；被近身围攻（离得近的敌人达到两个）时最值得，
 *   因为绒层能压掉近战接触并把打击者推开一步，换出脱身空间。
 * 什么时候最想出手：血量掉到 ai.panic 以下，或已被围住时 priority 110 抢在共享次序前——防招要在被打崩之前裹上；
 *   只是面对远处火力或还没贴近就退回普通次序，先走位或输出。
 * 对谁出手：自己；不需要接近，由共用任务直接施放。
 * 放完之后：绒层窗口内不再重复，被磨掉或到期后才重新考虑。
 */
namespace PokemonSkills {
    function cottonGuardThreatGap(context: WorldBehavior.Context): number {
        const threat = context.senses["world_combat:threat"];
        if (!threat) return -1;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point);
    }

    /** 贴身敌人数量（不含自己），用于判断是否被近身围攻。 */
    function cottonGuardSwarm(context: WorldBehavior.Context): number {
        const self = CompanionBehavior.source(context);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other || other.ref === self.ref || !other.hostile) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= 4) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("cottonguard", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, "cottonguard")) return false;
            const gap = cottonGuardThreatGap(context);
            if (gap < 0) return false;
            return gap <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const panic = CompanionBehavior.ai<number>(capability, "panic", 0.6);
            const desperate = CompanionBehavior.ratio(CompanionBehavior.source(context)) < panic || cottonGuardSwarm(context) >= 2;
            return desperate ? 110 : 45;
        }
    });

    addPreferences("cottonguard", {}, [
        field(pathOf("ai.maxChase"), "裹身距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑先裹绒衣；越大越早准备。"
        }),
        field(pathOf("ai.panic"), "紧急血量", "number", {
            min: 0.2, max: 0.9, step: 0.05,
            help: "血量比例低于这个值时抢在共享次序前裹身；调高更早进入防守姿态，调低只在濒危时才裹。被两个贴身敌人围攻时同样抢前。"
        })
    ]);
}
