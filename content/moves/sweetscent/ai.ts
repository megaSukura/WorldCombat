/** Prefer fast, evasive or concealing subjects; a stationary exposed target has little tracking value. */
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
            const dx = other.point[0] - target.point[0], dy = other.point[1] - target.point[1], dz = other.point[2] - target.point[2];
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius) count++;
        }
        return count;
    }

    function sweetscentWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", true)) return false;
        if (status(context, target, "scented")) return false;
        if (distance(source(context).point, target.point) > ai<number>(item, "maxChase", 9)) return false;
        // 目标脚下已经有一片甜云就不重复铺：读共享的场地查询，用场地实际半径与三维距离，而不是自己再扫一遍世界。
        const areas = WorldEffects.areas(world(context), PokemonSkills.sweetscentField);
        for (let i = 0; i < areas.length; i++) {
            const dx = areas[i].position[0] - target.point[0], dy = areas[i].position[1] - target.point[1], dz = areas[i].position[2] - target.point[2];
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= areas[i].radius) return false;
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
            // 簇判断按本招香气半径的当前取向估算（基准 2.2，馥郁 0.8／清甜 1.2），不再用固定值。
            const aroma = !!(item.data.config && item.data.config.aroma === true);
            const cloud = 2.2 * (aroma ? 0.8 : 1.2);
            const elusive = fleeing(context, target) || target.hidden || stage(context, target, "evasion") > 0;
            return (elusive ? 52 : 10) + (sweetscentCluster(context, target, cloud) >= needed ? 15 : 0);
        }
    });
}
