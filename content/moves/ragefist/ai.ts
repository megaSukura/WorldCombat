/**
 * 愤怒之拳 / ragefist 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享 attack 位上；这是一串近距离鬼拳，够不到时交给共享接近逻辑把身位收进射程，
 *   `ai.maxChase` 只决定「多远之内值得先手」，超过时压低排序但仍会走近——被击退后也会走回来接着打。
 * 对谁出手：`accepts` 只排除友方、已死、看不见的；`approachTarget` 就是目标本人。
 * 什么时候抬价：`ai.vengeful`（默认开）打开时，**能维持接触**（在射程内）时身上每攒 1 记拳印就 +5 分；
 *   射程外但还在先手距离内只 +2 分/记、上限 10 分，免得抱着高优先却追不到。一记没攒时压到 14 分，
 *   只在没有更好的选择时用它。关闭则不问拳印，一律按普通近身攻击排序。
 * 放完接什么：交回共享交战计划；拳印不因出拳清空，接下来的愤怒之拳继续吃同一份积怨。
 */
namespace PokemonSkills {
    /** 只读、回调内缓存的拳印数；宝可梦与已被授权本招的普通主体读同一副载体。 */
    CompanionBehavior.registerFact("world_combat:move_ragefist/stored", function (access, actor, _argument) {
        if (!access.valid(actor) || !ragefistQualified(access, actor)) return 0;
        return ragefistStored(access, actor);
    });

    function ragefistStoredNow(context: WorldBehavior.Context, target: WorldMethods.Subject): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_ragefist/stored", target);
        return typeof value === "number" ? value : 0;
    }

    CompanionBehavior.registerUse(ragefistId, {
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
            const limit = CompanionBehavior.ai<number>(capability, "maxChase", 8);
            const close = gap <= capability.data.range;
            let value = close ? 30 : gap <= limit ? 14 : 4;
            // 拳印只在能维持接触时才算资本；离得远时压低，免得抱着高优先却追不到。
            if (CompanionBehavior.ai<boolean>(capability, "vengeful", true)) {
                const stored = ragefistStoredNow(context, self);
                if (close) value += Math.min(25, stored * 5);
                else if (gap <= limit) value += Math.min(10, stored * 2);
            }
            return Math.min(82, value);
        }
    });

    addPreferences(ragefistId, {}, [
        field(pathOf("fury"), "狂暴", "boolean", {
            help: "开启（狂暴）：拳印上限降到 4、最多 5 拳，但拳间隔 −1、起手 −1、冷却 −5——短促的快拳，适合面对脆皮。关闭（积怨）：拳印上限 6、最多 7 拳，节奏按标准——更慢但封顶更高，适合面对血厚的目标。上限与节奏的取舍。"
        }),
        field(pathOf("ai.maxChase"), "先手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "这个距离之内愿意先甩拳，超出则压到低优先（仍会交给共享接近逻辑走近）。它是一串近身拳，调大也只是稍微更早起步。"
        }),
        field(pathOf("ai.vengeful"), "拳印优先", "boolean", {
            help: "开启：身上每有 1 记拳印就抬高出手优先级，挨过打正是这一拳最重的时候；关闭：不问拳印，一律按普通近身攻击排序。"
        })
    ]);
}
