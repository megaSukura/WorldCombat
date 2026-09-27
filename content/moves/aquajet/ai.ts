/** 用水击进攻并打湿目标；施放者身在水里时水柱更猛，因此略微上调这种出手的优先级；清除敌方灼伤会损失持续伤害，因此默认降低这种出手的优先级。 */
namespace PokemonSkills {
    /** 沿朝向目标的水平扫掠实际盖到多少非友方身体，并核对这条线是否被墙截断。 */
    function aquajetLane(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): { open: boolean; enemies: number } {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const from = CompanionBehavior.point(self.point), goal = CompanionBehavior.point(target.point);
        const delta = goal.minus(from);
        if (delta.length() < 0.05) return { open: false, enemies: 0 };
        const open = world.clear(from, goal);
        const values = { world: world, actor: world.source(), detail: { values: capability.data.config || {} } };
        const half = Math.max(0.3, p(aquajetId, "collisionRadius", values));
        let enemies = 0;
        try {
            WorldGeometry.selectBodies(world, WorldGeometry.bodyLane(from, delta, capability.data.range, half),
                function (_actor, facts) { if (!facts.friendly()) enemies++; });
        } catch (ignored) { }
        return { open: open, enemies: enemies };
    }

    CompanionBehavior.registerUse(aquajetId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            // 水柱是直线：墙截断就够不到，不为这条路线加分。
            const lane = aquajetLane(context, capability, target);
            if (!lane.open) return 0;
            let score = 23;
            if (self.wet) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "preserveBurn", true) && CompanionBehavior.status(context, target, "burn")) score -= 16;
            if (CompanionBehavior.ai<boolean>(capability, "preferDry", true) && CompanionBehavior.status(context, target, "soaked")) score -= 8;
            if (CompanionBehavior.ratio(target) <= 0.3) score += 8;
            // 激流式能沿路贯穿多人：同一路线上有两个及以上非友方时更值。
            if (capability.data.config && capability.data.config.deluge === true && lane.enemies >= 2) score += 8;
            return score;
        }
    });

    addPreferences(aquajetId, {}, [
        field(pathOf("deluge"), "激流贯注", "boolean", {
            help: "开启：水柱贯穿整条路径、浇透并打伤碰到的每个人、判定更宽、湿得更久，但单点伤害 ×0.82、冷却多 6 刻。关闭：单发鱼雷，命中即停、这一下最重。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才主动喷射；本招射得比电光一闪远，设大愿意更早放。"
        }),
        field(pathOf("ai.preserveBurn"), "保留灼伤", "boolean", {
            help: "开启：对带有灼伤的敌人降低本招优先级，优先保留持续伤害；紧急顶退和残血补刀仍可出手。关闭：按普通进攻收益排序。"
        }),
        field(pathOf("ai.preferDry"), "先浇没湿的", "boolean", {
            help: "开启：已经带着 soaked 的目标排后，先换一个干的浇；关闭：当普通先制候选排序。"
        })
    ]);
}
