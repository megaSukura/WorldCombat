/**
 * 辅助力量 / storedpower 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享 attack 位上；这是**以自己为圆心**的范围释放，够不到时交给共享接近逻辑，
 *   把身位收进圈子后再放；`ai.maxChase` 只决定「多远之内值得先手」，超过时压低排序但仍会走近。
 * 对谁出手：`accepts` 只排除友方、已死、看不见的；`approachTarget` 就是目标本人（贴上去再放）。
 * 什么时候抬价：`ai.boostFirst`（默认开）打开时，自己身上每有 1 级正面能力就 +5 分——蓄积越深越值得放；
 *   一点没蓄时压到 12 分，只在没有更好的选择时用它。关闭则不问蓄积，一律按普通近距范围攻击排序。
 * 放完接什么：交回共享交战计划；倾囊会清空等级，接下来按没有蓄积的状态重新打算。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的正面能力等级总数（宝可梦读原生等级，其他生物读 CombatStages）。 */
    CompanionBehavior.registerFact("world_combat:move_storedpower/boost", function (access, actor, _argument) {
        return access.valid(actor) ? storedpowerBoosts(access, actor) : 0;
    });

    function storedpowerBoostNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_storedpower/boost", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(storedpowerId, {
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
            const limit = CompanionBehavior.ai<number>(capability, "maxChase", 6);
            let value = gap <= capability.data.range ? 30 : gap <= limit ? 16 : 5;
            if (CompanionBehavior.ai<boolean>(capability, "boostFirst", true)) value += Math.min(30, storedpowerBoostNow(context, self) * 5);
            return Math.min(84, value);
        }
    });

    addPreferences(storedpowerId, {}, [
        field(pathOf("spend"), "倾囊", "boolean", {
            help: "开启（倾囊）：命中后把全部正面能力等级一并打出去，威力 ×1.35、范围 ×1.2，但等级清零、冷却 +6——换来一记最大的爆发。关闭：等级保留，威力与范围按标准，冷却更短。攒等级与花等级，各有局面。"
        }),
        field(pathOf("ai.maxChase"), "先手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "这个距离之内愿意先用它起手，超出则压到低优先（仍会交给共享接近逻辑走近）。它是以自己为圆心的范围招，调大也只是稍微更早起手。"
        }),
        field(pathOf("ai.boostFirst"), "蓄积优先", "boolean", {
            help: "开启：身上每有 1 级正面能力就抬高出手优先级，蓄得越深越愿意放；关闭：不问蓄积，一律按普通近距范围攻击排序。"
        })
    ]);
}
