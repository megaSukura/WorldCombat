/** powertrip：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 只读、回调内缓存的正面能力等级总数（宝可梦读原生等级，其他生物读 CombatStages）。 */
    CompanionBehavior.registerFact("world_combat:move_powertrip/boost", function (access, actor, _argument) {
        return access.valid(actor) ? powertripBoosts(access, actor) : 0;
    });

    function powertripBoostNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_powertrip/boost", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(powertripId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            return !context.facts.mounted;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            const limit = CompanionBehavior.ai<number>(capability, "maxChase", 10);
            let value = gap <= capability.data.range ? 28 : gap <= limit ? 15 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "boostFirst", true)) value += Math.min(34, powertripBoostNow(context, self) * 4);
            return Math.min(86, value);
        }
    });

    addPreferences(powertripId, {}, [
        field(pathOf("drive"), "猛进", "boolean", {
            help: "开启（猛进）：冲势穿堂，最多撞到两个人（每人 ×0.88），但顶开更弱、收招 +3、冷却 +5——适合撞进人堆。关闭（收敛）：停在第一个目标上，单发 ×1.1、顶得更开、节奏更快。"
        }),
        field(pathOf("ai.maxChase"), "先手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "这个距离之内愿意先冲，超出则压到低优先（仍会交给共享接近逻辑走近）。它是接触招，调大也只是稍微更早起步。"
        }),
        field(pathOf("ai.boostFirst"), "架势优先", "boolean", {
            help: "开启：身上每有 1 级正面能力就抬高出手优先级，攒了等级才值得冲；关闭：不问架势，一律按普通近身攻击排序。"
        })
    ]);
}
