/**
 * Frisk inspects nearby enemies' gear as a fight begins.
 *
 * Main path (every combatant): every hostile in 12 blocks is revealed for 120 ticks (6 s) and
 * gets the harmful MC MobEffect world_combat:frisk_exposed, which lowers the native armor attribute by
 * 2 points. Armor is a vanilla attribute every living entity owns, so the ability reads enemy
 * equipment and finds the gaps for players and armored mobs alike.
 *
 * Pokemon layer: the nearest Pokemon enemy has its held item inspected and temporarily
 * suppressed (shared temporary-modifier mechanism) for 100 ticks (5 s). Pokemon items are their
 * own system, so this is the same "read the held thing" idea expressed with native mechanics.
 *
 * Numbers: once per encounter (state flag reset on disengage); the reveal/armor shred lasts 6 s
 * and the item suppression 5 s, so the opener opens a window without removing the item forever.
 * Source: Cobblemon/Bulbapedia Frisk inspects the opponent's held item on entry.
 *
 * Presentation: the sweep, each revealed enemy and the read item play one-shot scenes; a per-victim
 * "exposed" scene is renewed every 20 ticks while the effect holds. The sweep and each discrete
 * moment float one localized line; the sustained exposure stays silent to avoid spamming.
 */
namespace WorldCombatAbilityFrisk {
    var RADIUS = 12;
    var EXPOSE_TICKS = 120;
    var ITEM_TICKS = 100;
    var EFFECT = "world_combat:frisk_exposed";
    var GLOWING = "minecraft:glowing";
    var SCENE = "world_combat:ability_frisk";
    var TEXT_SCAN = "world_combat.ability.frisk.text.scan";
    var TEXT_MARK = "world_combat.ability.frisk.text.mark";
    var TEXT_SUPPRESS = "world_combat.ability.frisk.text.suppress";

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function notice(context: NativeAbilities.Context, value: any): void {
        if (!value.engaged) { context.state.flags.friskScan = 0; return; }
        if (context.state.flags.friskScan) return;
        var world = context.world!, self = context.actor!, body = world.observe(self);
        if (!body) return;
        context.state.flags.friskScan = 1;
        var origin = body.position();
        var actors = world.query(origin, RADIUS, false);
        var nearest: CombatActor | null = null, nearestRange = RADIUS + 1;
        var caught: CombatActor[] = [];
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (String(actor.key()) === String(self.key()) || world.friendly(actor)) continue;
            // Keep the original call order; the return value only tells presentation what applied.
            var revealed = MobEffects.apply(world, actor, EFFECT, EXPOSE_TICKS, 0) !== null;
            MobEffects.apply(world, actor, GLOWING, EXPOSE_TICKS, 0);
            var view = world.observe(actor);
            if (!view) continue;
            if (revealed) caught.push(actor);
            var range = view.position().minus(origin).length();
            if (range < nearestRange) { nearest = actor; nearestRange = range; }
        }
        // Presentation only; the mutations above are the accepted mechanic. The pulse hook's source
        // is the holder, so `scan` binds `source`; every marked enemy binds `target`.
        if (caught.length) {
            WorldFeedback.emit(world, SCENE, 1, origin, { moment: "scan" }, 60);
            WorldFeedback.text(world, above(origin), TEXT_SCAN, [caught.length], 50);
            for (var j = 0; j < caught.length; j++) {
                var at = world.observe(caught[j]);
                if (at === null) continue;
                var victimRef = String(caught[j].ref()), point = at.position();
                WorldFeedback.emit(world, SCENE, 1, point, { moment: "mark", target: victimRef }, 40);
                WorldFeedback.text(world, above(point), TEXT_MARK, [], 40);
            }
        }
        if (nearest === null || String(nearest.domain()) !== "cobblemon") return;
        if (!String(CobblemonCombat.pokemon(nearest).heldItem())) return;
        NativeModifiers.apply(world, nearest, { suppressItems: true }, ITEM_TICKS);
        var read = world.observe(nearest);
        if (read === null) return;
        WorldFeedback.emit(world, SCENE, 1, read.position(), { moment: "suppress", target: String(nearest.ref()) }, 40);
        WorldFeedback.text(world, above(read.position()), TEXT_SUPPRESS, [], 40);
    }

    function exposed(event: CombatWorldEvent): void {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== EFFECT) return;
        if (event.world().tick() % 20 !== 0) return;
        var world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        var body = world.observe(victim);
        if (!body) return;
        // The state is carried by the victim, so key it by that ref and bind `target`.
        WorldFeedback.keep(world, "exposed:" + String(victim.ref()), SCENE, 1, body.position(),
            { moment: "exposed", target: String(victim.ref()) }, 40);
    }

    NativeAbilities.define("frisk", {}, { pulse: notice });
    WorldCombat.on("world_combat:ability_frisk/tick", "world_combat:mob_effect_tick", "", exposed);
}
