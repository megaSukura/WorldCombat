/** Adapt to an opponent’s recent attack: change your types against a Pokémon, or resist an observed native damage type against a non-Pokémon. */
namespace PokemonSkills {
    const conversion2Scene = "world_combat:move_conversion2";
    const conversion2Colors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };
    export const conversion2Types = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

    function conversion2Color(type: string): number { return conversion2Colors[type] || 0xE8E8F0; }

    /** 目标最后使用的那一手的属性；没有最后招式返回 ""。 */
    export function conversion2Read(world: CombatWorld, target: CombatActor): string {
        if (String(target.domain()) !== "cobblemon") return "";
        const state = NativeEffects.read(world, target);
        if (!state.used) return "";
        const move = CobblemonCombat.moveTemplate(state.used);
        return move ? String(move.type()) : "";
    }

    function conversion2OwnTypes(world: CombatWorld, actor: CombatActor): string[] {
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        return NativeEffects.types(pokemon, state);
    }

    /**
     * 在“不为自己已有”的属性里挑能抵抗 attackType 的那一种。
     * prefer="breadth" 时在可抵抗的候选里优先整体受击乘数之和最低（更少弱点）；否则优先对那一招乘数最低（最硬）。
     */
    export function conversion2Choose(attackType: string, own: string[], prefer: string): { type: string; multiplier: number } | null {
        // 未知属性（模组自定义、未实装）没有可用的相性表，按“读不出”处理。
        if (conversion2Types.indexOf(attackType) < 0) return null;
        let best: { type: string; multiplier: number; breadth: number } | null = null;
        for (let index = 0; index < conversion2Types.length; index++) {
            const type = conversion2Types[index];
            if (own.indexOf(type) >= 0) continue;
            const multiplier = CobblemonCombat.typeEffectiveness(attackType, type);
            if (multiplier > 0.5) continue;
            let breadth = 0;
            for (let other = 0; other < conversion2Types.length; other++) breadth += CobblemonCombat.typeEffectiveness(conversion2Types[other], type);
            if (best === null) { best = { type: type, multiplier: multiplier, breadth: breadth }; continue; }
            const preferBreadth = prefer === "breadth";
            const wins = preferBreadth
                ? breadth < best.breadth - 1e-9 || Math.abs(breadth - best.breadth) <= 1e-9 && multiplier < best.multiplier - 1e-9
                : multiplier < best.multiplier - 1e-9 || Math.abs(multiplier - best.multiplier) <= 1e-9 && breadth < best.breadth - 1e-9;
            if (wins) best = { type: type, multiplier: multiplier, breadth: breadth };
        }
        return best === null ? null : { type: best.type, multiplier: best.multiplier };
    }

    define({
        id: "conversion2",
        cooldownParameter: "recharge",
        name: "Conversion 2",
        description: "根据对手最近的攻击调整防护：对宝可梦改变自身属性，对普通生物抵御已观察到的原生伤害类型。",
        uses: ["接下一记已知属性的招", "把受击面翻到对手打不痛的那一面", "在被压制前临时改抗性"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 80,
        style: "mirror",
        defaults: { wide: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("conversion2", "reach", pokemon), geometry: "line", style: "mirror", color: 0x8FD8D8, label: "纹理２读取线" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["conversion2"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p("conversion2", "charge", context),
                recover: p("conversion2", "afterglow", context),
                cooldown: p("conversion2", "recharge", context),
                active: 0,
                range: p("conversion2", "reach", context)
            };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("conversion2", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (String(target.domain()) !== "cobblemon") return DamageSemantics.recentAttack(world, target, 1200) ? "" : "no-move";
            const attackType = conversion2Read(world, target);
            if (!attackType) return "no-move";
            const prefer = config && config.wide === true ? "breadth" : "resist";
            return conversion2Choose(attackType, conversion2OwnTypes(world, action.actor()), prefer) ? "" : "no-type";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:conversion2:" + action.id(), conversion2Scene, 1, action.origin(), JSON.stringify({
                moment: "read", target: target === null ? "" : String(target.ref()), facets: p("conversion2", "facets", action)
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const prefer = config && config.wide === true ? "breadth" : "resist";
            if (target !== null && String(target.domain()) !== "cobblemon") {
                const last = DamageSemantics.recentAttack(world, target, 1200);
                if (last) {
                    const types = config && config.wide === true && last.category === "physical"
                        ? [last.type, "minecraft:mob_attack", "minecraft:mob_attack_no_aggro", "minecraft:player_attack", "minecraft:arrow", "minecraft:trident", "minecraft:sting", "minecraft:ram", "minecraft:mace_smash"] : [last.type];
                    CombatCopies.resist(world, actor, types, config && config.wide === true ? 0.75 : 0.5, Math.max(120, Math.round(p("conversion2", "hold", action))), "conversion2");
                    WorldFeedback.emit(world, conversion2Scene, 1, action.origin(), { moment: "settle", color: 0x8FD8D8, facets: 8, scale: 1 }, 30);
                    sound(action, "minecraft:block.beacon.power_select");
                }
                done(action); return;
            }
            const attackType = target === null ? "" : conversion2Read(world, target);
            const chosen = attackType ? conversion2Choose(attackType, conversion2OwnTypes(world, actor), prefer) : null;
            const facets = Math.max(6, Math.round(p("conversion2", "facets", action)));
            const body = world.observe(actor);
            if (chosen === null) {
                if (body !== null) {
                    WorldFeedback.emit(world, conversion2Scene, 1, body.position(), { moment: "fizzle", facets: facets }, 22);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), "world_combat.move.conversion2.text.fail", [], 28);
                }
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            NativeModifiers.apply(world, actor, { types: [chosen.type] }, Math.max(120, Math.round(p("conversion2", "hold", action))));
            if (body !== null) {
                WorldFeedback.emit(world, conversion2Scene, 1, body.position(), {
                    moment: "settle", type: chosen.type, color: conversion2Color(chosen.type),
                    facets: facets, scale: chosen.multiplier <= 0 ? 1.2 : 1
                }, 44);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)),
                    "world_combat.move.conversion2.text.type", [{ key: "cobblemon.type." + chosen.type, fallback: chosen.type }], 44);
            }
            sound(action, "minecraft:block.beacon.power_select");
            done(action);
        }
    });
}
