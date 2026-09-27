/**
 * Conversion (纹理) server behaviour.
 *
 * Rhythm: the shared prepare/execute choreography. `ready` reads the CURRENT effective types (temporary layers
 * included) and refuses only when the body is already exactly that single lead type; `windup` locks the lead
 * slot's type into the action snapshot before commit, so a moveset reorder between initiation and execution
 * cannot silently change the reweave; `execute` writes the temporary type layer through the shared modifier
 * effect (the same path Multitype uses) and floats the new type. The layer is temporary and expires on its own,
 * so a recalled or reloaded individual keeps its native species types.
 *
 * Lifecycle: a re-run first dispels any earlier layer this unit left, so there is exactly one live layer and one
 * owned aura; the aura is bound to the real layer effect (WorldFeedback.onEffect) and ends with it when it
 * expires or is dispelled, leaving no stale anchor.
 */
namespace PokemonSkills {
    // Showdown type ids are bare lowercase; the palette is the readable hue for each type, used only as a
    // numeric payload the client tints the settle burst with. Type identity itself comes from the move data.
    var conversionColors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };
    var conversionLeadKey = "world_combat:move_conversion/lead";
    var conversionOrigin = "world_combat:move/conversion";
    function conversionColor(type: string): number { return conversionColors[type] || 0xE8E8F0; }
    function conversionLead(action: CombatAction): string {
        var pokemon = CobblemonCombat.pokemon(action.actor()), lead = pokemon.move(0);
        return lead ? String(lead.type()) : "";
    }
    /** 当前生效属性（含共享临时层）：预检只在这种情况下拒发，双属性因此能收成单一首槽属性。 */
    function conversionOwnTypes(world: CombatWorld, actor: CombatActor): string[] {
        if (!world.valid(actor)) return [];
        return PokemonDamage.combatants.read(world, actor).types;
    }
    /** 只收本单元上一次留下的类型层；重投前先清掉，避免叠层与失效锚。 */
    function conversionClearLayers(world: CombatWorld, actor: CombatActor): void {
        var views = world.effects(actor, "cobblemon_world_combat:modifier");
        for (var i = 0; i < views.length; i++) {
            var data: any;
            try { data = JSON.parse(String(views[i].data())); } catch (error) { continue; }
            if (data && data.origin === conversionOrigin) world.operation(views[i].id(), "world_combat:dispel", "{}");
        }
    }

    define({
        id: "conversion",
        cooldownParameter: "recharge",
        name: "纹理",
        description: "读取招式表中第一个招式的属性，把身体暂时重织成那个属性。",
        uses: ["读取首个招式的属性", "把自己重织成那个属性"],
        kind: "self",
        range: 1,
        prepare: 6,
        active: 1,
        recover: 8,
        cooldown: 60,
        style: "transmute",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["conversion"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p("conversion", "charge", context),
                recover: p("conversion", "afterglow", context),
                cooldown: p("conversion", "recharge", context),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            var world = action.sense();
            if (NativeModifiers.typeLocked(world, action.actor())) return "type-locked";
            var lead = conversionLead(action);
            if (!lead) return "no-leading-move";
            var own = conversionOwnTypes(world, action.actor());
            // 已经完全就是那一个单一属性时才拒；双属性含首系仍可用，这样才能收成单型。
            return own.length === 1 && own[0] === lead ? "same-type" : "";
        },
        windup: function (action, config, prepare) {
            var type = conversionLead(action);
            // 提交快照：发起至执行之间首槽被换掉，也不改变这次重织的落点。
            if (type) action.data(conversionLeadKey, JSON.stringify({ type: type }));
            action.present("conversion:scan", "world_combat:move_conversion", 1, action.origin(), JSON.stringify({
                moment: "scan", type: type, color: conversionColor(type),
                shades: p("conversion", "shades", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), actor = action.actor();
            var stored = action.data(conversionLeadKey), type = conversionLead(action);
            if (stored !== null) {
                try { var locked = JSON.parse(stored); if (locked && typeof locked.type === "string") type = locked.type; }
                catch (error) { /* keep the live read */ }
            }
            if (type) {
                var hold = Math.max(120, Math.round(p("conversion", "hold", action)));
                conversionClearLayers(world, actor);
                var layer = NativeModifiers.apply(world, actor, { types: [type], origin: conversionOrigin }, hold);
                var body = world.observe(actor);
                if (body && layer > 0) {
                    var shades = p("conversion", "shades", action);
                    action.present("conversion:settle", "world_combat:move_conversion", 1, body.position(), JSON.stringify({
                        moment: "settle", type: type, color: conversionColor(type),
                        shades: shades, radius: 0.8 + shades / 30
                    }));
                    // The outline lives as long as the type layer and is released with it, not with this action.
                    WorldFeedback.onEffect(world, layer, "world_combat:move_conversion/aura", "world_combat:move_conversion", 1, body.position(), {
                        moment: "aura", type: type, color: conversionColor(type), shades: shades
                    });
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
                        "world_combat.move.conversion.text.type",
                        [{ key: "cobblemon.type." + type, fallback: type }], 44);
                }
                sound(action, "minecraft:block.beacon.activate");
            }
            done(action);
        },
        indicator: function () {
            return { radius: 1.1, geometry: "area", style: "transmute", color: 0xE8E8F0, label: "纹理" };
        }
    });
}
