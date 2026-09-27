/**
 * 渴望 / covet —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 排序按“这一贴值不值”：自己空手、未被封禁且目标持物时最优先（能真的换手并降攻）；自己有物/被封禁时不再沿用
 * 持物高分，只按普通打击评估；目标物攻已降到底（−6）时降攻无收益，回落到最低分。物攻威胁越高、目标正加攻时
 * 这份降攻越值钱。`ai.stealOnly` 开启后只在目标持物时出手，作为专门的夺取手段；关闭则空手时也照常压上去。
 * `polite` 属于本招配置（更轻但降攻更深），不影响候选排序。
 */
namespace CompanionBehavior {
    function covetTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.covetHeldOf(world, actor) !== null;
    }
    function covetSelfEmpty(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && PokemonSkills.covetHeldOf(world, actor) === null;
    }
    /**
     * 这一贴还值不值：降攻有没有位置、目标物攻是否值得削。目标已到 −6 或原生免疫降阶时返回负值，
     * 表示只剩普通打击的价值；否则按目标当前物攻与已有加攻给出正分。
     */
    function covetSoftWorth(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        if (CompanionBehavior.stage(context, target, "atk") <= -6) return -1;
        var stats = CompanionBehavior.combatStats(context, target);
        var attack = stats && stats.stats && isFinite(Number(stats.stats.atk)) ? Number(stats.stats.atk) : 0;
        var self = CompanionBehavior.source(context);
        var score = 0;
        if (attack > self.health) score += 10;
        if (CompanionBehavior.stage(context, target, "atk") > 0) score += 8;
        return score;
    }

    registerUse("covet", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) {
            if (target.friendly || target.health <= 0 || !target.visible) return false;
            if (CompanionBehavior.ai<boolean>(item, "stealOnly", false)) return covetTargetHeld(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var worth = covetSoftWorth(context, target);
            if (worth < 0) return 14;
            var held = covetTargetHeld(context, target);
            if (!held) return 24 + worth;
            // 自己有物或被封禁时这一贴拿不到东西，不再沿用持物高分，只按普通打击加物攻威胁排序。
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            var canSteal = covetSelfEmpty(context) && actor !== null && !NativeItems.sealed(world, actor);
            return (canSteal ? 58 : 24) + worth;
        }
    });

    PokemonSkills.addPreferences("covet", { ai: { maxChase: 12, leaveStation: false, stealOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.stealOnly", "只对有物者出手")
    ]);
}
