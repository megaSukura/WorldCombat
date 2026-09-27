/**
 * 杂技 / acrobatics —— AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、还活着的活体，且在 `ai.maxChase`（默认 12）格内；更远交给共享接近逻辑。
 * 本招靠身侧的短弧切入：目标左右至少一侧有落脚空域时排到前面（空手更优先），两侧都被墙夹住、只能正面直撞时降低推荐，
 * 让位给电光一闪／撞击这类正面直线招。
 * `ai.emptyOnly` 开启后只在自身空手时出手，专门吃翻倍的那一档；关闭则带物时也照常补刀。
 * `sweep` 属于本招配置（侧弧更长、本击略轻、收招更久）。
 */
namespace CompanionBehavior {
    function acrobaticsBare(context: WorldBehavior.Context): boolean {
        var world = CompanionBehavior.world(context), actor = world.actor(CompanionBehavior.source(context).ref);
        return !!actor && PokemonSkills.acrobaticsHeldOf(world, actor) === null;
    }

    /** 目标身侧是否有可容身的落脚弧：两侧任一侧空出足够空间才算有侧路；按决策帧缓存一次原生空域探针。 */
    function acrobaticsSideSpace(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "world_combat:move_acrobatics/side:" + target.ref, function () {
            var world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            var actor = world.actor(self.ref), body = actor === null ? null : world.observe(actor);
            if (body === null) return true;
            var at = body.position(), width = Math.max(0.3, body.width()), height = Math.max(0.5, body.height());
            var feet = WorldCombat.point(at.x(), at.y() - height / 2, at.z());
            var foe = world.actor(target.ref), foeBody = foe === null ? null : world.observe(foe);
            var targetCentre = foeBody !== null ? foeBody.position() : CompanionBehavior.point(target.point);
            var targetWidth = Math.max(0.25, foeBody !== null ? foeBody.width() : 0.9);
            var toTarget = WorldCombat.point(targetCentre.x() - at.x(), 0, targetCentre.z() - at.z());
            var forward = toTarget.length() > 0.01 ? toTarget.unit() : WorldGeometry.flatUnit(WorldCombat.point(0, 0, 1));
            var side = WorldCombat.point(-forward.z(), 0, forward.x());
            var clearance = PokemonSkills.acrobaticsClearance(width, targetWidth), carry = PokemonSkills.p("acrobatics", "carry", world);
            for (var sign = -1; sign <= 1; sign += 2) {
                var candidate = WorldCombat.point(targetCentre.x() + side.x() * sign * clearance + forward.x() * (clearance + carry),
                    targetCentre.y(), targetCentre.z() + side.z() * sign * clearance + forward.z() * (clearance + carry));
                if (PokemonSkills.acrobaticsStandable(world, candidate, width, height, feet.y(), 1.8)) return true;
            }
            return false;
        });
    }

    registerUse("acrobatics", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.ai<boolean>(item, "emptyOnly", false) && !acrobaticsBare(context)) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(item, "maxChase", 12);
        },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target) return 0;
            var bare = acrobaticsBare(context), side = acrobaticsSideSpace(context, item, target);
            // 空手且有侧向空隙时最愿意出手；只剩正面直线时降低推荐，让位给正面招。
            var score = bare ? 42 : 20;
            return side ? score + (bare ? 6 : 2) : score - 10;
        }
    });

    PokemonSkills.addPreferences("acrobatics", { ai: { maxChase: 12, leaveStation: false, emptyOnly: false } }, [
        PokemonSkills.number("ai.maxChase", "追击距离", 2, 14, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位"),
        PokemonSkills.flag("ai.emptyOnly", "只在空手时出手")
    ]);
}
