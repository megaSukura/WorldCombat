/**
 * 水之誓约 / waterpledge 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、存活、非友方，且在 `ai.maxChase`（默认 12）格内。水柱指哪打哪、还带推开，
 *   是一张中距离输出＋走位；落点附近已有火／草的誓约印时 priority 抬到 54——共鸣更重，还会挂彩虹或塌湿地。
 * 对谁出手：当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 怎么够到：共享接近把身位收进射程（`kind: point`，以目标位置为落点）。
 * 放完接什么：交回共享交战计划；誓约印与组合场留在原地按自己的寿命消散。
 * 排序：共鸣可用 54，否则 34。
 */
namespace PokemonSkills {
    function waterpledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    function waterpledgeComboReady(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const point = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const kinds = ["world_combat:field/pledge_fire", "world_combat:field/pledge_grass"];
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i]);
            for (let j = 0; j < areas.length; j++) {
                if (WorldCombat.point(areas[j].position[0], areas[j].position[1], areas[j].position[2]).minus(point).length() <= 5) return true;
            }
        }
        return false;
    }

    CompanionBehavior.registerUse(waterpledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return waterpledgeTarget(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !waterpledgeTarget(context, capability, target)) return 0;
            return waterpledgeComboReady(context, target) ? 54 : 34;
        }
    });

    addPreferences(waterpledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("deluge"), "涌誓", "boolean", {
            help: "开启（涌誓）：威力 ×1.10、誓约印 ×1.2、推开 ×1.25，但射程 ×0.9、冷却 +12——涌得更猛更大，却要站得更近、回手更慢。关闭（缓流）：射程 ×1.1、冷却 −4、推开 ×0.9——远、快、推得轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立水柱，超过就先走近。"
        })
    ]);
}
