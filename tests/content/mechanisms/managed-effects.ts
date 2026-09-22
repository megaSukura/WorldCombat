namespace ManagedEffects {
    export var wallPreview = { cells: [[-1, 0, 0], [-1, 1, 0], [0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 0]], rotation: "cardinal", ground: true };
    export function shield(action: CombatAction, reduction: number, ticks: number): void {
        var target = action.target(); if (target === null) { action.reject("choose-friend"); return; }
        action.effect("world_combat:shield", target, JSON.stringify({ reduction: reduction, reach: 5 }), ticks);
    }
    export function wall(action: CombatAction, ticks: number): void {
        action.effect("world_combat:placed_terrain", action.actor(), JSON.stringify({ point: WorldAI.coordinates(action.targetPosition()), direction: WorldAI.coordinates(action.direction()) }), ticks);
    }
    export function placeWall(world: CombatWorld, point: CombatPoint, direction: CombatPoint, ticks: number): void {
        var cells: { x: number; y: number; z: number; block: string }[] = [];
        wallPreview.cells.forEach(function (offset) {
            var x = offset[0], z = offset[2];
            if (Math.abs(direction.x()) >= Math.abs(direction.z())) { var previous = x; x = direction.x() >= 0 ? z : -z; z = direction.x() >= 0 ? -previous : previous; }
            else if (direction.z() < 0) { x = -x; z = -z; }
            cells.push({ x: Math.floor(point.x()) + x, y: Math.floor(point.y()) + offset[1], z: Math.floor(point.z()) + z, block: "world_combat_core:temporary_rock" });
        });
        world.terrain(JSON.stringify({ cells: cells, ground: wallPreview.ground }), ticks);
    }
}
WorldCombat.effect("world_combat:placed_terrain", 1, 1200, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
WorldCombat.effectHandler("world_combat:placed_terrain", "start", function (effect) {
    var state = JSON.parse(effect.state());
    ManagedEffects.placeWall(effect.world(), WorldAI.point(state.point), WorldAI.point(state.direction), effect.remaining());
});
WorldCombat.effect("world_combat:shield", 1, 1200, "action", function (json) {
    var state = JSON.parse(json);
    if (typeof state.reduction !== "number" || state.reduction < 0 || state.reduction > 0.8 ||
        typeof state.reach !== "number" || state.reach < 0 || state.reach > 16) throw new Error("Invalid shield parameters");
    return JSON.stringify(state);
}, EffectProtocols.unchanged);
WorldCombat.effectHandler("world_combat:shield", "start", function (effect) {
    effect.listen("world_combat:incoming", "world_combat:modify", "intercept");
    effect.schedule("mark", "mark", 1, "{}");
});
WorldCombat.effectHandler("world_combat:shield", "intercept", function (effect) {
    if (effect.event().target().key() !== effect.target().key()) return;
    var world = effect.world(), state = JSON.parse(effect.state()), target = world.observe(effect.target()), source = world.observe(effect.source());
    if (target === null || source === null || !world.friendly(effect.target()) || target.position().minus(source.position()).length() > state.reach) return;
    var value = JSON.parse(effect.event().payload());
    var best = typeof value.shieldReduction === "number" ? value.shieldReduction : 0;
    if (state.reduction > best) { value.amount = value.amount / (1 - best) * (1 - state.reduction); value.shieldReduction = state.reduction; }
    effect.event().payload(JSON.stringify(value));
});
WorldCombat.effectHandler("world_combat:shield", "mark", function (effect) {
    var world = effect.world(), target = world.observe(effect.target()), source = world.observe(effect.source());
    if (target !== null && source !== null && world.friendly(effect.target()) && target.position().minus(source.position()).length() <= JSON.parse(effect.state()).reach)
        world.marker(effect.target(), "world_combat_core:ward", 10, 0);
    effect.schedule("mark", "mark", 5, "{}");
});
WorldCombat.effectHandler("world_combat:shield", "end", function (effect) {
    var world = effect.world(), others = world.effects(effect.target(), "world_combat:shield");
    if (others.length <= 1) world.marker(effect.target(), "world_combat_core:ward", 0, 0);
});
