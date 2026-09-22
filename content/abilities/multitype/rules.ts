/**
 * Multitype harmonizes the holder with the ground it stands on, and shares that harmony.
 *
 * General path (any combatant): while engaged, the holder reads the block under its feet and
 * attunes to its element. Every friendly body within 5 blocks receives the real beneficial MC
 * MobEffect `world_combat:multitype_attuned` for 80 ticks, renewed every 20 ticks: +2 armor and
 * +10% movement speed. A Pokemon, a player, a vanilla mob and another mod's creature all read the
 * same effect, so the ability is a small shared field rather than a private buff.
 *
 * Pokemon layer: the holder's native types become the ground's element through the shared
 * temporary-modifier system, so its resistances and same-type attack bonus change with the
 * terrain. Native types are a Pokemon concept. If the block maps to no element, the holder keeps
 * its own types and only the shared attunement applies.
 *
 * Numbers: 5 blocks is a normal engagement; 80 ticks of +2 armor / +10% speed refreshed while
 * standing keeps the change responsive without being a big swing. The element map is deliberately
 * coarse (water, fire, ice, grass, dark, steel, ground, rock) so the player can predict it from
 * the ground they stand on.
 * Source: Cobblemon/Bulbapedia Multitype changes the holder's type with its held plate. Cobblemon
 * 1.8 does not implement plate items, so the "change with what you carry" idea is read as
 * "change with the ground you stand on" (see the unit report's rule feedback).
 *
 * Presentation: `attune` fires when the element changes and floats the new element, `aura` is the
 * kept field boundary, `share` marks each body caught. Numbers unchanged.
 */
namespace WorldCombatAbilityMultitype {
    var ATTUNED = "world_combat:multitype_attuned";
    var SCENE = "world_combat:ability_multitype";
    var RADIUS = 5;
    var TICKS = 80;
    var FEEDBACK_TICKS = 30;
    var TEXT_ATTUNE = "world_combat.ability.multitype.text.attune";
    var TEXT_SHARE = "world_combat.ability.multitype.text.share";
    // Index 0 is "no element"; the index doubles as the numeric state flag.
    var ELEMENTS = ["", "water", "fire", "ice", "grass", "dark", "steel", "ground", "rock"];

    function hasTag(tags: string[], tag: string): boolean {
        return tags.indexOf(tag) >= 0;
    }

    // A coarse, predictable map from the block underfoot to a native type id.
    function element(id: string, tags: string[]): string {
        if (id.indexOf("water") >= 0 || hasTag(tags, "minecraft:water")) return "water";
        if (id.indexOf("lava") >= 0 || id.indexOf("magma") >= 0 || id.indexOf("fire") >= 0) return "fire";
        if (id.indexOf("ice") >= 0 || id.indexOf("snow") >= 0) return "ice";
        if (id.indexOf("grass_block") >= 0 || id.indexOf("moss") >= 0 || id.indexOf("leaves") >= 0
            || id.indexOf("vine") >= 0 || id.indexOf("fern") >= 0 || hasTag(tags, "minecraft:leaves")) return "grass";
        if (id.indexOf("netherrack") >= 0 || id.indexOf("soul") >= 0 || id.indexOf("sculk") >= 0
            || id.indexOf("blackstone") >= 0) return "dark";
        if (id.indexOf("iron") >= 0 || id.indexOf("gold") >= 0 || id.indexOf("copper") >= 0) return "steel";
        if (id.indexOf("sand") >= 0 || id.indexOf("gravel") >= 0 || id.indexOf("clay") >= 0
            || id.indexOf("dirt") >= 0 || id.indexOf("mud") >= 0 || id.indexOf("farmland") >= 0) return "ground";
        if (id.indexOf("stone") >= 0 || id.indexOf("deepslate") >= 0 || id.indexOf("ore") >= 0
            || id.indexOf("obsidian") >= 0 || id.indexOf("basalt") >= 0 || id.indexOf("tuff") >= 0) return "rock";
        return "";
    }

    function above(point: CombatPoint): CombatPoint {
        return point.plus(WorldCombat.point(0, 1, 0));
    }

    function attune(context: NativeAbilities.Context, value: any): void {
        var world = context.world, holder = context.actor;
        if (world === null || holder === null) return;
        var body = world.observe(holder);
        if (body === null) return;
        var origin = body.position();
        var block = world.block(origin.plus(WorldCombat.point(0, -0.4, 0)));
        var kind = "";
        if (block !== null) kind = element(String(block.id()), JSON.parse(String(block.tags())));
        // The shared field is general; the type change below is the Pokemon layer.
        var actors = world.query(origin, RADIUS, false), shared = 0;
        for (var i = 0; i < actors.length; i++) {
            var actor = actors[i];
            if (!world.friendly(actor)) continue;
            if (MobEffects.apply(world, actor, ATTUNED, TICKS, 0) !== null) {
                shared++;
                var view = world.observe(actor);
                if (view !== null) WorldFeedback.emit(world, SCENE, 1, view.position(), { moment: "share", target: String(actor.ref()) }, 30);
            }
        }
        // The native type override is cheap; apply it on a change or when the last one nears expiry.
        // State flags hold numbers, so the element is stored by its index in ELEMENTS.
        var code = ELEMENTS.indexOf(kind);
        if (kind && String(holder.domain()) === "cobblemon"
            && (context.state.flags.multitypeBuilt !== code || world.tick() >= (context.state.flags.multitypeUntil || 0))) {
            NativeModifiers.apply(world, holder, { types: [kind] }, TICKS * 5);
            context.state.flags.multitypeBuilt = code;
            context.state.flags.multitypeUntil = world.tick() + TICKS * 5 - 60;
        }
        if ((context.state.flags.multitypeKind || 0) === code) {
            if (shared > 0 && value.engaged) WorldFeedback.keep(world, "aura", SCENE, 1, origin, { moment: "aura" }, 40);
            return;
        }
        context.state.flags.multitypeKind = code;
        WorldFeedback.emit(world, SCENE, 1, origin, { moment: "attune", target: String(holder.ref()) }, 40);
        WorldFeedback.text(world, above(origin), TEXT_ATTUNE, [], FEEDBACK_TICKS);
        if (shared > 0) WorldFeedback.text(world, above(origin).plus(WorldCombat.point(0, 0.4, 0)), TEXT_SHARE, [shared], FEEDBACK_TICKS);
    }

    NativeAbilities.define("multitype", {}, { pulse: attune });
}
