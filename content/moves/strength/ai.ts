/**
 * 怪力 / strength 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记干净、无副作用的贴身直拳。它的独有打法是**把人往障碍上打**：以目标**真实身体后缘**出发，
 * 沿本次实际 `shove` 距离探一次，只有身体退无可退、后面真的贴墙时才抬高优先级；开阔地按普通近战排序。
 * 用完交回共享交战计划——它只出一拳，不改变自身站位。
 */
namespace PokemonSkills {
    /** 目标真实身体后缘沿本次实际顶退距离是否撞墙：有的话这一拳能把人拍在墙上。 */
    function strengthBacked(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "strength:backed:" + target.ref, function () {
            const world = CompanionBehavior.world(context);
            const targetActor = world.actor(target.ref);
            const body = targetActor === null ? null : world.observe(targetActor);
            if (body === null) return false;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length < 0.3) return false;
            const axis = WorldCombat.point(dx / length, 0, dz / length);
            const shove = Math.max(0.35, p("strength", "shove", world));
            const min = body.boundsMin(), max = body.boundsMax();
            const reach = Math.abs(axis.x()) * (max.x() - min.x()) * 0.5 + Math.abs(axis.z()) * (max.z() - min.z()) * 0.5;
            const from = body.position().plus(axis.scale(reach));
            return WorldGeometry.blockHit(world, from, from.plus(axis.scale(shove))) !== null;
        });
    }

    CompanionBehavior.registerUse("strength", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            return strengthBacked(context, self, target) ? 38 : 20;
        }
    });

    addPreferences("strength", {}, [
        field(pathOf("plant"), "扎根式", "boolean", {
            help: "开启：出拳更重、把目标顶得更远、撞墙更疼，但起手、收招与冷却都更长。关闭：发力式，出手更快、循环更短，代价是单下更轻、撞墙加成更小。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动出拳，先走近。越大越早贴身出手，也越容易在赶路时被拉开。"
        })
    ]);
}
