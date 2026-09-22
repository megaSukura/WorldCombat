/**
 * Conversion server behaviour.
 *
 * Rhythm: the shared prepare/execute choreography. `ready` reads the lead move and refuses when the
 * body already has its type; `windup` telegraphs the scan before commit; `execute` writes the native
 * type layer through the shared modifier effect (the same path Multitype uses) and floats the new type.
 * The type layer is temporary and expires on its own, so a recalled or reloaded individual keeps its
 * native species types.
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
    function conversionColor(type: string): number { return conversionColors[type] || 0xE8E8F0; }
    function conversionLead(action: CombatAction): string {
        var pokemon = CobblemonCombat.pokemon(action.actor()), lead = pokemon.move(0);
        return lead ? String(lead.type()) : "";
    }
    function conversionOwnTypes(pokemon: CombatPokemon): string[] {
        var types: string[] = [];
        for (var i = 0; i < pokemon.typeCount(); i++) types.push(String(pokemon.type(i)));
        return types;
    }

    define({
        id: "conversion",
        name: "纹理",
        description: "读入招式表中第一个招式的属性，把自己的属性暂时重织成它。",
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
            var pokemon = CobblemonCombat.pokemon(action.actor()), lead = pokemon.move(0);
            if (!lead) return "no-leading-move";
            return conversionOwnTypes(pokemon).indexOf(String(lead.type())) >= 0 ? "same-type" : "";
        },
        windup: function (action, config, prepare) {
            var type = conversionLead(action);
            action.present("conversion:scan", "world_combat:move_conversion", 1, action.origin(), JSON.stringify({
                moment: "scan", type: type, color: conversionColor(type),
                shades: p("conversion", "shades", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), actor = action.actor();
            var type = conversionLead(action);
            if (type) {
                var hold = p("conversion", "hold", action);
                NativeModifiers.apply(world, actor, { types: [type] }, hold);
                var body = world.observe(actor);
                if (body) {
                    action.present("conversion:settle", "world_combat:move_conversion", 1, body.position(), JSON.stringify({
                        moment: "settle", type: type, color: conversionColor(type),
                        shades: p("conversion", "shades", action), radius: 0.8 + p("conversion", "shades", action) / 30
                    }));
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
