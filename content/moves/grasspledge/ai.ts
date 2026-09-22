/**
 * 草之誓约 / grasspledge 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、存活、非友方，且在 `ai.maxChase`（默认 12）格内。草柱指哪打哪，是一张
 *   中距离输出＋控制；落点附近已有火／水的誓约印时 priority 抬到 54——共鸣更重，还会把地面换成火海或湿地。
 * 对谁出手：当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 怎么够到：共享接近把身位收进射程（`kind: point`，以目标位置为落点）。
 * 放完接什么：交回共享交战计划；誓约印与组合场留在原地按自己的寿命消散。
 * 排序：共鸣可用 54，否则 34。
 */
namespace PokemonSkills {
    function grasspledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    function grasspledgeComboReady(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const point = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const kinds = ["world_combat:field/pledge_fire", "world_combat:field/pledge_water"];
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i]);
            for (let j = 0; j < areas.length; j++) {
                if (WorldCombat.point(areas[j].position[0], areas[j].position[1], areas[j].position[2]).minus(point).length() <= 5) return true;
            }
        }
        return false;
    }

    CompanionBehavior.registerUse(grasspledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return grasspledgeTarget(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !grasspledgeTarget(context, capability, target)) return 0;
            return grasspledgeComboReady(context, target) ? 54 : 34;
        }
    });

    addPreferences(grasspledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("entangle"), "缠誓", "boolean", {
            help: "开启（缠誓）：缠住时长 ×1.5、誓约印 ×0.8、冷却 +10——锁人优先。关闭（茂誓）：威力 ×1.06、誓约印 ×1.2、冷却更短——打得重、地面留得久。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立草柱，超过就先走近。"
        })
    ]);
}
