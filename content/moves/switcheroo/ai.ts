/**
 * 掉包 / switcheroo —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑走过去。
 * AI 仍只为攻击用途在敌人里筛选；玩家手动可以空放或选友方，那是另一套自由。
 * 排序按「这一换值不值」与「冒险能不能承受」：目标持物而自己空手最优先（稳赚）；双方都有物按更换到的数量差加减；
 * 只有自己持物是一次纯送出，手里的东西越多、对手越危险，分越低，不因“有物可给”就偏好送给空手敌人。
 * 两边都空时不再当作交换来打分，只保留一次纯机动的低分（`ai.tradeOnly` 开启时直接不用）。
 * 已知拒绝持有物交换的目标（黏着/查封）同样不高估：它换不走，只值机动的分。
 * `through`（穿身而过）需要目标身后有落点；freeSpace 探针认脚点（不是身体中心），没有空间时分数下调，不假装能穿到后背。
 */
namespace PokemonSkills {
    function switcherooTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && switcherooHeldOf(world, actor) !== null;
    }
    function switcherooSelfHeld(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && switcherooHeldOf(world, actor) !== null;
    }
    function switcherooRefuses(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && switcherooBlocked(world, actor);
    }
    function switcherooThrough(item: WorldBehavior.Capability): boolean {
        var config = item.data && item.data.config;
        return !!(config && config.through === true);
    }
    /** 穿身落点：从自身穿过目标的方向再往前一格，用只读 freeSpace 探针核实确实放得下这具身体；探针认脚点，不认身体中心。 */
    function switcherooBackSpace(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
        if (!switcherooThrough(item)) return true;
        var world = CompanionBehavior.world(context);
        var self = world.actor(CompanionBehavior.source(context).ref), foe = world.actor(target.ref);
        if (!self || !foe) return false;
        var me = world.observe(self), them = world.observe(foe);
        if (!me || !them) return false;
        var heading = them.position().minus(me.position());
        if (heading.length() < 0.05) return false;
        var behind = them.position().plus(heading.unit().scale(Math.max(0.6, them.width() * 0.5 + 0.4)));
        return world.freeSpace(WorldCombat.point(behind.x(), them.boundsMin().y(), behind.z()), me.width(), me.height());
    }
    /** 一侧当前的持有物数量；用来估计这一换是净赚还是净亏（空手记 0）。 */
    function switcherooHeldCount(context: WorldBehavior.Context, ref: string): number {
        var world = CompanionBehavior.world(context), actor = world.actor(ref);
        if (!actor) return 0;
        var held = switcherooHeldOf(world, actor);
        return held === null ? 0 : Math.max(1, held.count);
    }

    CompanionBehavior.registerUse("switcheroo", {
        protocols: ["world_combat:attack"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 10);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "tradeOnly", false))
                return !switcherooRefuses(context, target)
                    && (switcherooTargetHeld(context, target) || switcherooSelfHeld(context));
            return true;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var mine = switcherooSelfHeld(context), blocked = switcherooRefuses(context, target);
            var held = !blocked && switcherooTargetHeld(context, target);
            var base: number;
            if (!held && !mine) base = 18;
            else if (blocked) base = 16;
            else if (held && !mine) base = 62;                       // 空手夺物：稳赚
            else if (held && mine) {
                // 两边都有物是整栈互换：换来更多才更值得，换亏就压低。
                var gain = switcherooHeldCount(context, target.ref) - switcherooHeldCount(context, CompanionBehavior.source(context).ref);
                base = 50 + Math.max(-8, Math.min(8, gain * 2));
            } else {
                // 只有自己持物：这一换是纯送出，不因“有物可给”就偏好；手里的东西越多代价越大。
                base = Math.max(16, 36 - switcherooHeldCount(context, CompanionBehavior.source(context).ref) * 2);
                // 交换后敌威胁：目标正压着自己时，把手里那件递过去只会更难受。
                if (target.attacking === CompanionBehavior.source(context).ref) base -= 6;
            }
            // 穿身需要目标身后有落点；没有空间就按一次触到即停的交换估值。
            if (base > 20 && !switcherooBackSpace(context, item, target)) base -= 12;
            return base;
        }
    });

    addPreferences("switcheroo", { ai: { maxChase: 10, leaveStation: false, tradeOnly: false } }, [
        number("ai.maxChase", "掠影距离", 3, 16, 1),
        flag("ai.leaveStation", "驻守时允许离位"),
        flag("ai.tradeOnly", "只在有物可换时出手")
    ]);
}
