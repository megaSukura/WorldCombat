/** Replacement workshop. All combinations, timing and presentation choices are script content. */
namespace Workshop {
    export var prepare = function (action: CombatAction, design: string): void {};
    export var damage = function (action: CombatAction, target: CombatActor): void { action.world().hurt(target, 3, '{"type":"electric","bypassCooldown":true}'); };
    function plain(json: string): string { return JSON.stringify(JSON.parse(json)); }
    export function input(points: CombatPoint[], token: number = 0): string {
        return JSON.stringify({ version: 1, token: token, samples: points.map(function (point) { return { kind: "point", point: WorldAI.coordinates(point) }; }) });
    }
    function point(action: CombatAction, index: number): CombatPoint { return WorldAI.point(JSON.parse(action.control()).samples[index].point); }
    export function wet(world: CombatWorld, target: CombatActor): boolean { return world.observe(target)!.wet() || world.effects(target, "world_combat:wet").length > 0; }
    function insulated(world: CombatWorld, target: CombatActor): boolean { return world.effects(target, "world_combat:insulated").length > 0; }
    export function pulse(action: CombatAction, centre: CombatPoint): void {
        var world = action.world(), candidates = world.query(centre, 1.6, true), queue: CombatActor[] = [], visited: string[] = [], arcs: number[][] = [];
        for (var i = 0; i < candidates.length; i++) if (!world.friendly(candidates[i])) { queue.push(candidates[i]); break; }
        while (queue.length && visited.length < 6) {
            var target = queue.shift()!;
            if (!world.valid(target) || visited.indexOf(target.ref()) >= 0 || world.friendly(target) || insulated(world, target)) continue;
            visited.push(target.ref());
            var position = world.observe(target)!.position();
            if (!world.clear(centre, position)) continue;
            arcs.push(WorldAI.coordinates(position)); damage(action, target);
            if (!world.valid(target)) continue;
            WorldEffects.apply(world, target, "charge", {}, 30);
            if (!wet(world, target)) continue;
            var nearby = world.query(position, 4, true);
            for (var n = 0; n < nearby.length; n++) if (queue.length < 12 && visited.indexOf(nearby[n].ref()) < 0 && !world.friendly(nearby[n])
                && wet(world, nearby[n]) && !insulated(world, nearby[n]) && world.clear(position, world.observe(nearby[n])!.position())) queue.push(nearby[n]);
        }
        world.present("p4:beam", "p4:beam", 1, action.origin(), JSON.stringify({ origin: WorldAI.coordinates(action.origin()), point: WorldAI.coordinates(centre), arcs: arcs }));
    }
    WorldCombat.effect("p4:conduit", 1, 600, "actor", plain, EffectProtocols.unchanged);
    WorldCombat.effectHandler("p4:conduit", "start", function (effect) { effect.schedule("scan", "scan", 1, "{}"); });
    WorldCombat.effectHandler("p4:conduit", "scan", function (effect) {
        var world = effect.world(), data = JSON.parse(effect.state()), centre = WorldAI.point(data.point);
        if (centre.minus(world.observe(effect.source())!.position()).length() > 48) { effect.end(); return; }
        var actors = world.query(centre, 2, false);
        for (var i = 0; i < Math.min(actors.length, 12); i++) if (world.clear(centre, world.observe(actors[i])!.position())) WorldEffects.apply(world, actors[i], "wet", {}, 20);
        world.present("p4:field", "p4:field", 1, centre, JSON.stringify({ radius: 2, effect: effect.id(), selectable: true, charged: !!data.charged }));
        effect.schedule("scan", "scan", 5, "{}");
    });
    WorldCombat.effectHandler("p4:conduit", "operation:p4:link", function (effect) {
        if (effect.caller().key() !== effect.source().key()) effect.reject("effect-not-owned");
        var world = effect.world(), data = JSON.parse(effect.state()), input = JSON.parse(effect.input()), centre = WorldAI.point(data.point), destination = WorldAI.point(input.point);
        if (destination.minus(centre).length() > 12 || !world.clear(centre, destination)) effect.reject("path-blocked");
        data.charged = true; effect.state(JSON.stringify(data));
        WorldEffects.field(world, "world_combat:snare", destination, 2, {}, 100);
        world.present("p4:link", "p4:beam", 1, centre, JSON.stringify({ origin: data.point, point: input.point, arcs: [] }));
        effect.remaining(Math.min(120, effect.remaining()));
    });
    export function rain(action: CombatAction): void {
        var points = [point(action, 0), point(action, 1), point(action, 2)], distance = points[1].minus(points[0]).length() + points[2].minus(points[1]).length();
        if (distance > 24) action.reject("path-too-long");
        action.stage("preparing"); action.after(5, function (next) {
            next.commit(30); var world = next.world();
            for (var segment = 0; segment < 2; segment++) {
                var delta = points[segment + 1].minus(points[segment]), steps = Math.max(1, Math.ceil(delta.length() / 3));
                for (var index = 0; index < steps; index++) world.effect("p4:conduit", next.actor(), JSON.stringify({ point: WorldAI.coordinates(points[segment].plus(delta.scale(index / steps))) }), 400);
            }
            world.effect("p4:conduit", next.actor(), JSON.stringify({ point: WorldAI.coordinates(points[2]) }), 400); next.finish();
        });
    }
    export function current(action: CombatAction): void {
        action.commit(40); action.stage("maintaining"); var age = 0;
        function step(next: CombatAction): void {
            var centre = point(next, 0);
            if (!next.world().clear(next.origin(), centre)) { next.cancel(); return; }
            pulse(next, centre); age += 5;
            if (age >= 60) next.finish(); else next.after(5, step);
        }
        step(action);
    }
    export function link(action: CombatAction): void {
        var samples = JSON.parse(action.control()).samples, source = action.sense().actor(samples[0].ref);
        if (source === null || source.key() !== action.actor().key()) action.reject("effect-not-owned");
        var fields = action.sense().effects(source!, "p4:conduit"), selected: CombatEffectView | null = null;
        for (var i = 0; i < fields.length; i++) if (fields[i].id() === samples[0].effect) selected = fields[i];
        if (selected === null) action.reject("field-left");
        var centre = WorldAI.point(JSON.parse(selected!.data()).point), destination = WorldAI.point(samples[1].point);
        if (destination.minus(centre).length() > 12 || !action.sense().clear(centre, destination)) action.reject("path-blocked");
        action.commit(30); action.effectOperation(samples[0].effect, "p4:link", JSON.stringify({ point: samples[1].point })); action.finish();
    }
    export function insulation(action: CombatAction): void {
        action.commit(30); action.effect("world_combat:insulated", action.target()!, "{}", 140);
        action.effect("p4:insulation_mark", action.target()!, "{}", 140); action.finish();
    }
    WorldCombat.effect("p4:insulation_mark", 1, 200, "actor", plain, EffectProtocols.unchanged);
    WorldCombat.effectHandler("p4:insulation_mark", "start", function (effect) { effect.schedule("mark", "mark", 1, "{}"); });
    WorldCombat.effectHandler("p4:insulation_mark", "mark", function (effect) {
        var world = effect.world(), p = world.observe(effect.target())!.position();
        world.present("p4:mark", "p4:insulation", 1, p, "{}"); effect.schedule("mark", "mark", 4, "{}");
    });
    function register(id: string, move: string, kind: "point" | "friend", recipe: (a: CombatAction) => void, preview: any): void {
        WorldCombat.registerAction(id, "p4.8", 100, kind, 24, function (a) { prepare(a, move); recipe(a); }); WorldCombat.preview(id, JSON.stringify(preview));
    }
    register("p4:rain_path", "watergun", "point", rain, { radius: 2, input: { version: 1, steps: ["point", "point", "point"] } });
    register("p4:current", "thundershock", "point", current, { radius: 1.6, lineOfSight: true, input: { version: 1, steps: ["point"], sustained: true } });
    register("p4:link", "charge", "point", link, { radius: 2, input: { version: 1, steps: ["field", "point"] } });
    register("p4:insulation", "withdraw", "friend", insulation, { radius: 1 });
    WorldCombat.on("p4:insulated_target", "world_combat:actor_tick", "", function (event) {
        var world = event.world();
        if (WorldAI.tagged(world.observe(event.actor())!, "wc_p4_insulated") && !world.effects(event.actor(), "world_combat:insulated").length) {
            world.effect("world_combat:insulated", event.actor(), "{}", 140);
            world.effect("p4:insulation_mark", event.actor(), "{}", 140);
        }
    });
}
