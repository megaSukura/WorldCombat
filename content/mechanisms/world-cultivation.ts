/** Reusable plant care over native block facts and item hooks, including compatible mod plants. */
namespace WorldCultivation {
    export interface Site { key: string; point: number[]; state: string; growable: boolean; }
    export function inspect(world: CombatWorld, point: CombatPoint): Site | null {
        var block = world.block(point); if (!block || !block.growable()) return null;
        // Soil remains a valid manual bonemeal target, while recurring work selects plants with finite growth.
        var tags: string[] = JSON.parse(String(block.tags()));
        if (tags.indexOf("minecraft:dirt") >= 0 || tags.indexOf("minecraft:nylium") >= 0) return null;
        var pos = block.position(), coordinates = [pos.x(), pos.y(), pos.z()];
        return { key: coordinates.join(","), point: coordinates, state: String(block.state()), growable: true };
    }
    export function sites(world: CombatWorld, centre: CombatPoint, radius: number): Site[] {
        var result: Site[] = [], width = Math.max(1, Math.min(4, Math.floor(radius))), offsets: number[][] = [];
        for (var x = -width; x <= width; x++) for (var z = -width; z <= width; z++) if (x * x + z * z <= width * width) offsets.push([x, z]);
        // Rotate bounded scans so large plots are covered without holding a world handle between ticks.
        var offset = Math.floor(world.tick() / 20) * 25;
        for (var i = 0; i < Math.min(25, offsets.length); i++) {
            var cell = offsets[(offset + i) % offsets.length];
            var point = WorldCombat.point(Math.floor(centre.x()) + cell[0], Math.floor(centre.y()), Math.floor(centre.z()) + cell[1]);
            var site = inspect(world, point) || inspect(world, point.plus(WorldCombat.point(0, 1, 0)));
            if (site) result.push(site);
        }
        return result;
    }
    export function use(world: CombatWorld, site: Site, item: string = "minecraft:bone_meal"): string {
        return String(world.useItem(WorldCombat.point(site.point[0], site.point[1], site.point[2]), item, site.state));
    }
}
