/**
 * 火之誓约 / firepledge 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、存活、非友方，且在 `ai.maxChase`（默认 12）格内。火柱指哪打哪，
 *   所以它是一张中距离的常规输出；落点附近已有草／水的誓约印时 priority 抬到 54——共鸣的那一击更重，
 *   还会把同一圈印扩成火海或彩虹，值得优先接上。落点已经压着一片组合场时不再出火柱：一记火柱不叠第二层场。
 * 对谁出手：当前威胁；`accepts` 只排除友方、已死、看不见的。
 * 怎么够到：共享接近把身位收进射程（`kind: point`，以目标位置为落点）。
 * 放完接什么：交回共享交战计划；短印与组合场留在原地按自己的寿命消散。
 * 排序：共鸣可用 54，否则 34；上限 54，压过普通攻击但不抢紧急救援。
 */
namespace PokemonSkills {
    function firepledgeTarget(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    function firepledgeComboReady(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const point = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const kinds = ["world_combat:field/pledge_grass", "world_combat:field/pledge_water"];
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i]);
            for (let j = 0; j < areas.length; j++) {
                if (WorldCombat.point(areas[j].position[0], areas[j].position[1], areas[j].position[2]).minus(point).length() <= 5) return true;
            }
        }
        return false;
    }

    /** 落点已经压着一片组合场：不再无脑叠场。 */
    function firepledgeArenaAt(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const point = WorldCombat.point(target.point[0], target.point[1], target.point[2]);
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (WorldCombat.point(areas[i].position[0], areas[i].position[1], areas[i].position[2]).minus(point).length() <= 1 + areas[i].radius) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(firepledgeId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (firepledgeArenaAt(context, target)) return false;
            return firepledgeTarget(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !firepledgeTarget(context, capability, target)) return 0;
            return firepledgeComboReady(context, target) ? 54 : 34;
        }
    });

    addPreferences(firepledgeId, { ai: { maxChase: 12 } }, [
        field(pathOf("fierce"), "烈誓", "boolean", {
            help: "开启（烈誓）：火柱威力 ×1.12、柱更粗、冷却 +12，但誓约印只留七成时间——烧得更狠、地面留不久。关闭（缓誓）：威力 ×0.96，誓约印 ×1.25、冷却更短——伤害低一点，靠一圈久烧的地面磨人。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才立火柱，超过就先走近。调小更贴身、调大愿意远程点火。"
        })
    ]);
}
