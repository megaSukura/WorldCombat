/**
 * 烟幕 的伙伴 AI 用途：这招自己的一套出手计划——把一片云铺在一小簇敌人脚下，而不是对单个人点一下。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、它的落点附近至少挤着 ai.minFoes 个非友方；
 *   目标已经站在一片烟云里就跳过。
 * 对谁出手：当前威胁；以它的位置为落点，挤在一起的人越多越值得。
 * 够不到怎么办：reach 就是喷烟距离，超出先走近；这是落点招，铺空了就白费一次冷却。
 * 放完之后：云里的人命中下降，云还会留在原地影响后来者，伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("smokescreen", { ai: { maxChase: 9, minFoes: 2, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 16, 1),
        PokemonSkills.number("ai.minFoes", "最少人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function smokescreenCluster(context: WorldBehavior.Context, target: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function smokescreenWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 9)) return false;
        if (status(context, threat, "smoked")) return false;
        // 目标脚下已经有一片烟云就不重复铺：读共享的场地查询，而不是自己再扫一遍世界。
        const areas = WorldEffects.areas(world(context), PokemonSkills.smokescreenField);
        for (let i = 0; i < areas.length; i++) {
            const dx = areas[i].position[0] - threat.point[0], dz = areas[i].position[2] - threat.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius) return false;
        }
        return smokescreenCluster(context, threat, 2.4) >= ai<number>(item, "minFoes", 2);
    }

    registerUse("smokescreen", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || smokescreenWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !smokescreenWants(context, item, target)) return 0;
            const cluster = smokescreenCluster(context, target, 2.4);
            return Math.min(90, 50 + (cluster - 1) * 8);
        }
    });
}
