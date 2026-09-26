/**
 * 喷水 / waterspout 的伙伴 AI 用途。
 *
 * 什么局面下出手：这是一道以自身为中心、带真实推进方向的潮墙。`available` 要求有可见、敌对、存活
 * 且在 `ai.maxChase`（默认 8）格内的目标；`priority` 在自己血量越满时越高——那正是这一记最值的时刻。
 * 选择倾向按两式分开：
 *   推涌式（默认）：贴身的敌人越多越值，用潮墙把人从脸上冲开（`ai.peel`）。
 *   回卷式（`undertow`）：按潮头距离内**真正拉得动**的敌人数量抬高，把人收拢到自己面前；
 *     抗位移的 Boss（击退抗性高）拉不动，不计聚拢收益。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function waterspoutWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
    }

    /** 击退抗性高到几乎推不动的目标：水伤照吃，但不该被算作「推开／聚拢」的收益。 */
    function waterspoutImmovable(world: CombatWorld, target: CompanionBehavior.Entity): boolean {
        const actor = world.actor(target.ref);
        if (actor === null) return false;
        const resistance = world.attributeValue(actor, "minecraft:generic.knockback_resistance");
        return resistance !== null && resistance.value() >= 0.5;
    }

    function waterspoutPress(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[],
            world = CompanionBehavior.world(context), undertow = capability.data.config && capability.data.config.undertow === true,
            range = capability.data.range, count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === self.ref || other.friendly || other.health <= 0) continue;
            var gap = CompanionBehavior.distance(other.point, self.point);
            if (undertow) {
                // 聚拢收益：潮头距离内、还拉得动的敌人才算。
                if (gap > range || gap < 0.8) continue;
                if (waterspoutImmovable(world, other)) continue;
            } else if (gap > 2.6) continue;
            count++;
        }
        if (count === 0 && CompanionBehavior.distance(self.point, target.point) <= range) count = 1;
        return count;
    }

    CompanionBehavior.registerUse("waterspout", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterspoutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !waterspoutWants(context, capability, target)) return 0;
            const ratio = CompanionBehavior.ratio(CompanionBehavior.source(context));
            const undertow = capability.data.config && capability.data.config.undertow === true;
            let score = 18 + Math.round(ratio * 14);
            if (undertow) {
                const movable = waterspoutPress(context, capability, target);
                if (movable >= 2) score += 18; else if (movable === 1) score += 6;
            } else if (CompanionBehavior.ai<boolean>(capability, "peel", true)) {
                const pressed = waterspoutPress(context, capability, target);
                if (pressed >= 2) score += 18; else if (pressed === 1) score += 6;
            }
            return score;
        }
    });

    addPreferences("waterspout", {}, [
        field(pathOf("undertow"), "回卷式", "boolean", {
            help: "开启：潮水反过来把人拉向自己、湿身更久，但浪头 ×0.82、推得更近、起手与冷却更长；关闭（推涌式）＝把人推开、威力更足，用来把人从脸上冲走。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在潮头外待命。越大越愿意先朝目标接近再掀潮。"
        }),
        field(pathOf("ai.peel"), "贴身时优先", "boolean", {
            help: "推涌式下，开启后自己身边 2.6 格内挤着敌人时优先喷水，用潮墙把人冲开；关闭则只按普通攻击排序。回卷式按拉得动的敌人数量排序。"
        })
    ]);
}
