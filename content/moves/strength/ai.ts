/**
 * 怪力 / strength 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一记干净、无副作用的贴身直拳。它的独有打法是**把人往障碍上打**：当目标背后一米多就是墙或方块、
 * 退无可退时，撞墙冲击会额外兑现一截伤害，priority 明显抬高；开阔地则按普通近战排序。
 * 用完交回共享交战计划——它只出一拳，不改变自身站位。
 */
namespace PokemonSkills {
    /** 目标背后（背离施法者方向）一米多是否有障碍：有的话这一拳能把人拍在墙上。 */
    function strengthBacked(context: WorldBehavior.Context, self: WorldMethods.Subject, target: WorldMethods.Subject): boolean {
        const world = CompanionBehavior.world(context);
        if (!world) return false;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.3) {
            // 贴在一起时按施法者朝向推不出方向，用施法者到目标的水平朝向兜底。
            return false;
        }
        const ux = dx / length, uz = dz / length;
        const front = WorldCombat.point(target.point[0], target.point[1] + 0.4, target.point[2]);
        const behind = WorldCombat.point(target.point[0] + ux * 1.5, target.point[1] + 0.4, target.point[2] + uz * 1.5);
        return !world.clear(front, behind);
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
