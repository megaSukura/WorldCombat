/** 用同频电波攻击周围与自己频率相同的敌人，并暂时照亮它们。宝可梦按属性同频，普通生物按身体种类判定。 */
namespace PokemonSkills {
    const synchronoiseScene = "world_combat:move_synchronoise";
    const synchronoiseResonance = "world_combat:resonance";
    const synchronoiseHitText = "world_combat.move.synchronoise.text.hit";
    const synchronoisePassText = "world_combat.move.synchronoise.text.pass";

    /** Content frequencies for native bodies; these choose recipients and do not assign damage types to Minecraft mobs. */
    export function synchronoiseFrequencies(world: CombatWorld, actor: CombatActor): string[] {
        if (String(actor.domain()) === "cobblemon") return PokemonDamage.combatants.read(world, actor).types;
        const type = world.entityType(actor);
        if (type === null) return [];
        const declared = Object.keys(synchronoisePalette).filter(name => type.tagged("world_combat:resonance/" + name));
        if (declared.length) return declared;
        const id = String(type.id());
        if (type.tagged("minecraft:undead") || /minecraft:(?:zombie|zombie_villager|husk|drowned|skeleton|stray|bogged|wither_skeleton|wither|phantom|zoglin|zombified_piglin)$/.test(id)) return ["ghost"];
        if (type.tagged("minecraft:arthropod") || /minecraft:(?:spider|cave_spider|silverfish|endermite|bee)$/.test(id)) return ["bug"];
        if (type.tagged("minecraft:aquatic") || /minecraft:(?:cod|salmon|pufferfish|tropical_fish|squid|glow_squid|dolphin|axolotl|guardian|elder_guardian|turtle)$/.test(id)) return ["water"];
        if (id === "minecraft:blaze" || id === "minecraft:magma_cube") return ["fire"];
        if (id === "minecraft:iron_golem") return ["steel"];
        if (id === "minecraft:snow_golem") return ["ice"];
        if (id === "minecraft:ender_dragon") return ["dragon"];
        return ["normal"];
    }
    MobEffects.react("world_combat:move_synchronoise/reveal", synchronoiseResonance, "world_combat:mob_effect_tick",
        event => event.actor(), function (event, actor) {
            if (event.world().tick() % 5 === 0) MobEffects.apply(event.world(), actor, "minecraft:glowing", 6, 0);
        });

    /** 两组频率是否有交集。 */
    function synchronoiseShares(caster: string[], target: string[]): boolean {
        for (let i = 0; i < caster.length; i++) if (target.indexOf(caster[i]) >= 0) return true;
        return false;
    }

    /** 频率色：取施法者第一个已知属性，未知时用近白的淡紫。 */
    function synchronoiseTint(types: string[]): number {
        for (let i = 0; i < types.length; i++) {
            const value = synchronoisePalette[types[i]];
            if (value !== undefined) return value;
        }
        return 0xE8E8F8;
    }

    define({
        id: "synchronoise",
        name: "Synchronoise",
        description: "用同频电波攻击周围与自己频率相同的敌人，并暂时照亮它们。宝可梦按属性同频，普通生物按身体种类判定。",
        uses: ["对同属性的敌人一次扫到一圈", "在混战里专挑与自己同频的人打", "给同频目标留下记号，方便接着追", "在属性对不上的局里确认谁才是同频的那一个"],
        kind: "self",
        range: 5.2,
        maxRange: 8.2,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 36,
        style: "resonance",
        defaults: { tight: false, ai: { maxChase: 9, minMatches: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("synchronoise", "waveRadius", pokemon), geometry: "area", style: "resonance",
                color: 0xF85888, label: config && config.tight === true ? "收束同调" : "宽播同调" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["synchronoise"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const tight = !!(config && config.tight);
            return {
                prepare: Math.round(p("synchronoise", "prepare", context) + (tight ? 2 : 0)),
                recover: Math.round(p("synchronoise", "recover", context)),
                cooldown: Math.round(p("synchronoise", "cooldown", context) + (tight ? 6 : 0)),
                active: skills["synchronoise"].active,
                range: p("synchronoise", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("synchronoise:attune", synchronoiseScene, 1, action.origin(),
                JSON.stringify({ moment: "attune", tint: synchronoiseTint(PokemonDamage.combatants.read(action.sense(), action.actor()).types),
                    tight: config && config.tight === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(3.2, p("synchronoise", "waveRadius", action));
            const power = p("synchronoise", "pulse", action);
            const resonanceTicks = Math.max(80, Math.round(p("synchronoise", "resonanceTicks", action)));
            const echoTicks = Math.max(16, Math.round(p("synchronoise", "echoTicks", action)));
            const marks = Math.max(4, Math.round(p("synchronoise", "marks", action)));
            const cap = Math.max(1, Math.round(p("synchronoise", "maxTargets", action)));
            const casterTypes = PokemonDamage.combatants.read(world, actor).types;
            const tint = synchronoiseTint(casterTypes);
            const scale = radius / 5.2;
            const intensity = Math.max(0.5, Math.min(2.2, power / 120));
            let linked = 0, passed = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 3 }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref())) return;
                if (!synchronoiseShares(casterTypes, synchronoiseFrequencies(world, enemy))) {
                    passed++;
                    WorldFeedback.emit(world, synchronoiseScene, 1, facts.position(),
                        { moment: "pass", target: ref, tint: tint, scale: scale }, 18);
                    return;
                }
                if (linked >= cap) return;
                if (!hurt(action, enemy, "synchronoise", power, { damage: damageSpec("synchronoise", "pulse") })) return;
                linked++;
                if (world.valid(enemy)) MobEffects.apply(world, enemy, synchronoiseResonance, resonanceTicks, 0);
                WorldFeedback.emit(world, synchronoiseScene, 1, facts.position(),
                    { moment: "lock", target: ref, tint: tint, count: Math.round(12 + power * 0.22), scale: scale, intensity: intensity }, 26);
            });

            WorldFeedback.emit(world, synchronoiseScene, 1, centre,
                { moment: "wave", radius: radius, tint: tint, links: linked, passed: passed, marks: marks,
                    flow: Math.round(50 + radius * 24), intensity: intensity }, 28);
            sound(action, "cobblemon:move.psychic.actor");
            sound(action, "cobblemon:impact.psychic");
            WorldFeedback.keep(world, "synchronoise:echo:" + String(actor.ref()), synchronoiseScene, 1, centre,
                { moment: "echo", radius: radius, tint: tint, marks: marks, flow: Math.round(30 + radius * 16) }, echoTicks);
            if (linked === 0) {
                WorldFeedback.emit(world, synchronoiseScene, 1, centre, { moment: "miss", tint: tint, scale: scale }, 20);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), synchronoisePassText, [], 26);
            } else {
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), synchronoiseHitText, [linked], 26);
            }
            done(action);
        }
    });
}
