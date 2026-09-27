/**
 * 戏法 / trick —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase`（默认 10）格内；更远交给共享接近逻辑走过去。
 * AI 仍把戏法当作攻击用途并在敌人里筛选；手动目标可选友方，但那是玩家的自由，AI 不推荐。
 * 已知拒绝持有物交换的目标（黏着/查封）不出手，避免白费；换不动的目标不高估。
 * 排序按「这一换值不值」：真实比较自己交出与收到的持有物——数量之外，用真实事实判断（浆果是否有疗效、
 * 是否只是纯负担；武器/工具带耐久别轻易送）。目标持物而自己空手最优先（净赚一件）；双方都有物按净值加减；
 * 只有自己持物是一次纯送出，手里越有价值分越低，不因「有物可给」就给空手敌人送武器，只有纯负担才勉强出手。
 * 两边都空不给分——没有东西可换，空放毫无收益。
 * `ai.tradeOnly` 开启后只在至少一方持物时才出手；关闭时也仍不给两空局面任何分数。
 * `ai.leaveStation` 控制驻守/静止命令下是否愿意离位去拉线；关闭时只在当前射程内原地出手。
 * `snap` 是本招配置（瞬时抓取），只收紧射程与起手，不改变候选排序。
 */
namespace PokemonSkills {
    function trickHeldOfActor(context: WorldBehavior.Context, ref: string): TrickHeld | null {
        var world = CompanionBehavior.world(context), actor = world.actor(ref);
        return actor ? trickHeldOf(world, actor) : null;
    }
    function trickTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        return trickHeldOfActor(context, subject.ref) !== null;
    }
    function trickSelfHeld(context: WorldBehavior.Context): boolean {
        return trickHeldOfActor(context, CompanionBehavior.source(context).ref) !== null;
    }
    function trickRefuses(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && trickBlocked(world, actor);
    }
    /** 一件真实持有物的估值：数量之外，用真实事实（浆果疗效/代价、有无耐久）判断留着还是递出去更值。 */
    function trickWorth(held: TrickHeld | null): number {
        if (!held) return 0;
        var value = Math.max(1, held.count);
        var berry = NativeItems.berryOfItem(held.id);
        if (berry) {
            if (berry.heal > 0) value += 6;
            if (berry.cures && berry.cures.length) value += 3;
            if (berry.boost) value += 4;
            if (berry.recoil > 0 && berry.heal <= 0 && !berry.boost) value -= 6;   // 纯负担，递出去反而划算
        }
        if (held.durability && held.durability.maximum > 0 && !held.durability.unbreakable) value += 5;   // 武器/工具，别送
        if (held.pokemon) value += 1;
        return value;
    }

    CompanionBehavior.registerUse("trick", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (context.facts.mounted) return false;
            if (!target) return true;
            var distance = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (distance > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
            // 驻守/静止且未开 leaveStation：只在当前射程内原地拉线，不为换装离位。
            if ((context.facts.intent === "hold" || context.facts.intent === "stay")
                && !CompanionBehavior.ai<boolean>(item, "leaveStation", false) && distance > item.data.range) return false;
            return true;
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (trickRefuses(context, target)) return false;
            if (CompanionBehavior.ai<boolean>(item, "tradeOnly", false))
                return trickTargetHeld(context, target) || trickSelfHeld(context);
            return true;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var mine = trickHeldOfActor(context, CompanionBehavior.source(context).ref);
            var theirs = trickHeldOfActor(context, target.ref);
            if (!mine && !theirs) return 0;
            var gain = trickWorth(theirs) - trickWorth(mine);
            if (!mine) return 62 + Math.max(0, Math.min(6, gain));                 // 空手接手：净赚
            if (!theirs) return Math.max(0, 12 + gain);                           // 纯送出：越有价值越不该递，只有负担才勉强
            return 48 + Math.max(-14, Math.min(14, gain));                        // 整栈互换：换亏就压低
        }
    });

    addPreferences("trick", { ai: { maxChase: 10, leaveStation: false, tradeOnly: false } }, [
        number("ai.maxChase", "心线距离", 3, 16, 1),
        flag("ai.leaveStation", "驻守时允许离位"),
        flag("ai.tradeOnly", "只在有物可换时出手")
    ]);
}
