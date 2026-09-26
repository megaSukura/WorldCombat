/** Copy a selected Pokémon’s current types, or a non-Pokémon’s armour. Mirror All also copies armour toughness and knockback resistance. */
namespace PokemonSkills {
    export const reflecttypeScene = "world_combat:move_reflecttype";
    export const reflecttypeMark = "world_combat:reflecttype";
    export const reflecttypeOneText = "world_combat.move.reflecttype.text.one";
    export const reflecttypePairText = "world_combat.move.reflecttype.text.pair";
    export const reflecttypeFailText = "world_combat.move.reflecttype.text.fail";
    export const reflecttypeArmorText = "world_combat.move.reflecttype.text.armor";
    export const reflecttypeTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    var reflecttypeColors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };

    export function reflecttypeColor(type: string): number { return reflecttypeColors[type] || 0xCFD3DE; }

    /** 一个战斗者当前生效的属性（含临时层），过滤掉相性表不认的 id；非宝可梦返回空。 */
    export function reflecttypeRead(world: CombatWorld, actor: CombatActor): string[] {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return [];
        const pokemon = CobblemonCombat.pokemon(actor);
        const values = NativeEffects.types(pokemon, NativeEffects.read(world, actor));
        return values.filter(function (type) { return reflecttypeTypes.indexOf(type) >= 0; });
    }
    /** 要贴到自己身上的属性：pair 时连副属性一起，否则只取主属。 */
    export function reflecttypeChoose(theirs: string[], pair: boolean): string[] {
        if (theirs.length === 0) return [];
        return pair ? theirs.slice(0, 2) : [theirs[0]];
    }
    function reflecttypeSame(a: string[], b: string[]): boolean {
        return a.slice().sort().join(",") === b.slice().sort().join(",");
    }
    /** 普通生物这一支照的可观察防御事实；只读得出来、且有变化才值得出手。 */
    function reflecttypeDefence(world: CombatWorld, target: CombatActor, pair: boolean): CombatCopies.Values {
        return CombatCopies.read(world, target, pair ? CombatCopies.defence : [CombatCopies.defence[0]]);
    }
    function reflecttypeFail(world: CombatWorld, actor: CombatActor, point: CombatPoint, facets: number): void {
        WorldFeedback.emit(world, reflecttypeScene, 1, point, { moment: "fizzle", target: String(actor.ref()), facets: facets }, 22);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)), reflecttypeFailText, [], 26);
    }

    define({
        id: "reflecttype",
        cooldownParameter: "recharge",
        name: "Reflect Type",
        description: "照住一个选中的对象：宝可梦对手提供它当前的属性，普通生物提供它当前的护甲。可指定友方或敌方，不能照自己，点地无效；读不出或照了没有变化的事实会被明确拒绝。",
        uses: ["照抄对手的属性来翻受击面", "向一个能提升自己防御的伙伴或敌人借属性", "只取主属、避开副属性带来的弱点"],
        kind: "aim",
        range: 8,
        maxRange: 14,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "mirror",
        defaults: { pair: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["reflecttype"], detail: { values: config } };
            return { radius: p("reflecttype", "reach", context), geometry: "line", style: "mirror", color: 0xD98CE8,
                label: config && config.pair === true ? "镜面属性 · 全部" : "镜面属性" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["reflecttype"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const pair = !!(config && config.pair);
            return {
                prepare: Math.round(p("reflecttype", "tempo", context)),
                recover: Math.round(p("reflecttype", "aftercast", context)),
                cooldown: Math.round(p("reflecttype", "recharge", context)) + (pair ? 14 : -8),
                active: 0,
                range: p("reflecttype", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) return "invalid-target";
            if (String(target.key()) === String(actor.key())) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (action.targetPosition().minus(action.origin()).length() > action.range()) return "out-of-range";
            if (!world.clear(action.origin(), action.targetPosition())) return "no-line";
            const pair = !!(config && config.pair);
            if (String(target.domain()) !== "cobblemon")
                return CombatCopies.differs(world, actor, reflecttypeDefence(world, target, pair)) ? "" : "no-gain";
            if (String(actor.domain()) !== "cobblemon") return "no-type";
            if (NativeModifiers.typeLocked(world, actor)) return "type-locked";
            const theirs = reflecttypeRead(world, target);
            if (theirs.length === 0) return "no-type";
            return reflecttypeSame(reflecttypeChoose(theirs, pair), reflecttypeRead(world, actor)) ? "same-type" : "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:reflecttype:raise", reflecttypeScene, 1, action.origin(), JSON.stringify({
                moment: "raise", target: target === null ? "" : String(target.ref()),
                facets: p("reflecttype", "facets", action), pair: config && config.pair ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null || String(target.key()) === String(actor.key())) { done(action); return; }
            const pair = !!(config && config.pair);
            const hold = Math.max(90, Math.round(p("reflecttype", "hold", action)));
            const facets = Math.max(6, Math.round(p("reflecttype", "facets", action)));
            const glints = Math.max(10, Math.round(p("reflecttype", "glints", action)));
            if (action.targetPosition().minus(action.origin()).length() > action.range()
                || !world.clear(action.origin(), action.targetPosition())) {
                reflecttypeFail(world, actor, body.position(), facets); done(action); return;
            }
            const targetRef = String(target.ref());
            const path: (string | number[])[] = [targetRef, String(actor.ref())];
            if (String(target.domain()) !== "cobblemon") {
                const values = reflecttypeDefence(world, target, pair);
                if (!CombatCopies.differs(world, actor, values)) {
                    WorldFeedback.emit(world, reflecttypeScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()), facets: facets }, 22);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), reflecttypeFailText, [], 26);
                    sound(action, "minecraft:block.amethyst_block.break");
                    done(action); return;
                }
                const carrier = MobEffects.set(world, actor, reflecttypeMark, hold, pair ? 1 : 0);
                if (!carrier) { reflecttypeFail(world, actor, body.position(), facets); done(action); return; }
                const layer = CombatCopies.apply(world, actor, values, hold, "reflecttype", MobEffects.anchor(carrier));
                if (!(layer > 0)) {
                    world.removeMobEffect(actor, reflecttypeMark, String(carrier.key()));
                    reflecttypeFail(world, actor, body.position(), facets); done(action); return;
                }
                const targetBody = world.observe(target);
                if (targetBody !== null)
                    WorldFeedback.emit(world, reflecttypeScene, 1, targetBody.position(),
                        { moment: "read", target: targetRef, path: path, facets: facets, scale: pair ? 1.2 : 1 }, 30);
                // 普通生物这一支落成护甲片，而不是虚构一种属性色。
                WorldFeedback.emit(world, reflecttypeScene, 1, body.position(),
                    { moment: "armor", path: path, facets: facets, glints: glints, pair: pair ? 1 : 0,
                        intensity: Math.max(0.7, Math.min(2, hold / 260)) }, 40);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), reflecttypeArmorText, [], 40);
                sound(action, "minecraft:block.amethyst_block.chime");
                done(action); return;
            }
            const theirs = reflecttypeRead(world, target);
            const chosen = reflecttypeChoose(theirs, pair);
            if (String(actor.domain()) !== "cobblemon" || NativeModifiers.typeLocked(world, actor)
                || chosen.length === 0 || reflecttypeSame(chosen, reflecttypeRead(world, actor))) {
                WorldFeedback.emit(world, reflecttypeScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()), facets: facets }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), reflecttypeFailText, [], 26);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const carrier = MobEffects.set(world, actor, reflecttypeMark, hold, pair ? 1 : 0);
            if (!carrier) { reflecttypeFail(world, actor, body.position(), facets); done(action); return; }
            const layer = NativeModifiers.apply(world, actor,
                { types: chosen, carrier: MobEffects.anchor(carrier), source: "reflecttype" }, hold);
            if (!(layer > 0)) {
                world.removeMobEffect(actor, reflecttypeMark, String(carrier.key()));
                reflecttypeFail(world, actor, body.position(), facets); done(action); return;
            }
            const targetBody = world.observe(target);
            if (targetBody !== null)
                WorldFeedback.emit(world, reflecttypeScene, 1, targetBody.position(),
                    { moment: "read", target: targetRef, path: path, facets: facets, scale: chosen.length > 1 ? 1.2 : 1 }, 30);
            WorldFeedback.emit(world, reflecttypeScene, 1, body.position(),
                { moment: "settle", target: String(actor.ref()), path: path, type: chosen[0], color: reflecttypeColor(chosen[0]),
                    facets: facets, glints: glints, pair: pair ? 1 : 0,
                    intensity: Math.max(0.7, Math.min(2, hold / 260)) }, 44);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                chosen.length > 1 ? reflecttypePairText : reflecttypeOneText,
                chosen.slice(0, 2).map(function (type) { return { key: "cobblemon.type." + type, fallback: type }; }), 44);
            sound(action, "minecraft:block.amethyst_block.chime");
            done(action);
        }
    });
}
