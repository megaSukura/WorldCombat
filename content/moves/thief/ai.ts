/**
 * 小偷 / thief —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 排序按“这一探值不值”：自己空手、未被封禁、目标持物且身后退路可达时最优先（能真的换手并脱离）；退路被堵时
 * 只按普通夺取排序；自己有物或被封禁时不因敌持物仍加 25，回落到普通近身打击。
 * `ai.stealOnly` 开启后只在目标持物时出手，作为专门的夺取手段；关闭则空手时也照常补刀。
 * `flee` 属于本招配置（开启后得手退得更远、收招更久）。
 */
namespace CompanionBehavior {
    function thiefTargetHeld(context: WorldBehavior.Context, subject: WorldMethods.Subject): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(subject.ref);
        return !!actor && PokemonSkills.thiefHeldOf(world, actor) !== null;
    }
    function thiefSelfEmpty(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && PokemonSkills.thiefHeldOf(world, actor) === null;
    }
    /** 得手后能不能真的拉开：身后一段在原生碰撞下是否畅通；退步距离读本招参数，不做预测。 */
    function thiefRetreatReachable(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        var world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        var me = CompanionBehavior.point(self.point), away = me.minus(CompanionBehavior.point(target.point));
        if (away.length() < 0.01) return true;
        var slip = 2.4;
        try {
            var values = { world: world, actor: world.actor(self.ref), detail: { values: item.data.config } };
            var value = PokemonSkills.p("thief", "slip", values);
            if (isFinite(value)) slip = Math.max(0.4, value);
        } catch (error) { }
        return world.clear(me, me.plus(away.unit().scale(slip)));
    }

    registerUse("thief", {
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
            if (CompanionBehavior.ai<boolean>(item, "stealOnly", false)) return thiefTargetHeld(context, target);
            return true;
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var held = thiefTargetHeld(context, target);
            if (!held) return 20;
            var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
            // 自己有物或被封禁时这一探拿不到东西，不因敌持物仍加 25，只按普通打击排序。
            if (!thiefSelfEmpty(context) || actor === null || NativeItems.sealed(world, actor)) return 20;
            // 高价值物（目标持物）且退路可达才提高冒险收益；退路被墙堵住时只按普通夺取排序。
            return thiefRetreatReachable(context, item, target) ? 60 : 45;
        }
    });

    PokemonSkills.addPreferences("thief", { ai: { maxChase: 12, leaveStation: false, stealOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.stealOnly", "只对有物者出手")
    ]);
}
