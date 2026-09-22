/**
 * 甜甜香气 的伙伴 AI 用途：这是这招自己的一套出手计划——把一片容易打中的区域铺在敌人脚下。
 *
 * 什么局面有意义：有可见威胁、它在 ai.maxChase 以内、目标还没被浸透、脚下也没有别的甜云。
 * 对谁出手：当前威胁；目标身边挤着至少 ai.cluster 个敌人时最值得——一片甜云能同时让一小簇人变脆。
 * 够不到怎么办：reach 就是喷香距离，超出就先走近；以目标位置为落点，挤在一起的人越多越划算。
 * 放完之后：云里的人被浸透、挨打更疼，伙伴交回共享顺序让队友去收这个窗口。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("sweetscent", { ai: { maxChase: 9, cluster: 2, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "喷香距离", 3, 16, 1),
        PokemonSkills.number("ai.cluster", "簇优先人数", 1, 4, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function sweetscentCluster(context: WorldBehavior.Context, target: Entity, radius: number): number {
        const nearby = context.facts.nearby as Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (distance(other.point, target.point) <= radius) count++;
        }
        return count;
    }

    function sweetscentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (status(context, target, "scented")) return false;
        if (distance(source(context).point, target.point) > ai<number>(item, "maxChase", 9)) return false;
        // 目标脚下已经有一片甜云就不重复铺：读共享的场地查询，而不是自己再扫一遍世界。
        const areas = WorldEffects.areas(world(context), PokemonSkills.sweetscentField);
        for (let i = 0; i < areas.length; i++) {
            const dx = areas[i].position[0] - target.point[0], dz = areas[i].position[2] - target.point[2];
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius) return false;
        }
        return true;
    }

    registerUse("sweetscent", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || sweetscentWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !sweetscentWants(context, item, target)) return 0;
            const needed = ai<number>(item, "cluster", 2);
            return sweetscentCluster(context, target, 2.4) >= needed ? 55 : 30;
        }
    });
}
