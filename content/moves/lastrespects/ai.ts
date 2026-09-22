/**
 * 扫墓 / lastrespects 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享 attack 位上；这是走向对手的一记重扫，够不到时交给共享接近逻辑把身位收进射程，
 *   `ai.maxChase` 只决定「多远之内值得先手」，超过时压低排序但仍会走近。它不挑目标，只挑时机。
 * 对谁出手：`accepts` 只排除友方、已死、看不见的。
 * 什么时候抬价：`ai.mournful`（默认开）打开时，同阵营每有一位伙伴倒下就 +6 分（上限 +24）——替他们送行的
 *   时机；一位没倒时压到 15 分，只在没有更好的选择时用它。关闭则不问记录，一律按普通近身攻击排序。
 * 放完接什么：交回共享交战计划；倒下记录不因这一扫清空，之后的扫墓继续吃同一份哀悼。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的同阵营倒下伙伴数。 */
    CompanionBehavior.registerFact("world_combat:move_lastrespects/fallen", function (access, actor, _argument) {
        return access.valid(actor) ? lastrespectsCount(access, actor) : 0;
    });

    function lastrespectsFallenNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_lastrespects/fallen", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(lastrespectsId, {
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
            const limit = CompanionBehavior.ai<number>(capability, "maxChase", 9);
            let value = gap <= capability.data.range ? 26 : gap <= limit ? 14 : 4;
            if (CompanionBehavior.ai<boolean>(capability, "mournful", true))
                value += Math.min(24, lastrespectsFallenNow(context, self) * 6);
            return Math.min(80, value);
        }
    });

    addPreferences(lastrespectsId, {}, [
        field(pathOf("trail"), "随行", "boolean", {
            help: "开启（随行）：鬼影沿路随行，这一扫变成一条走廊、打到路上所有人（每人 ×0.85），扫过更宽、冷却 +4——适合沿路清场。关闭（送行）：鬼影聚到一点，只打一个目标、单发 ×1.1、顶得更开、节奏更快。"
        }),
        field(pathOf("ai.maxChase"), "先手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "这个距离之内愿意先走过去扫，超出则压到低优先（仍会交给共享接近逻辑走近）。它要走一段才落扫，调大也只是稍微更早起步。"
        }),
        field(pathOf("ai.mournful"), "为倒下者出手", "boolean", {
            help: "开启：同阵营每有一位伙伴倒下就抬高优先级——替他们送行正是这一记的时机；关闭：不问倒下记录，一律按普通近身攻击排序。"
        })
    ]);
}
