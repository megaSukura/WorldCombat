/** 原生 poison 负责唯一毒伤时钟；本效果只逐级加深并拥有这次施毒的解除生命周期。 */
namespace PokemonSkills {
    const toxicScene = "world_combat:move_toxic";
    const ToxicVenom = "world_combat:toxic_venom";
    const toxicRootText = "world_combat.move.toxic.text.root";
    const toxicEscalateText = "world_combat.move.toxic.text.escalate";
    const toxicFizzleText = "world_combat.move.toxic.text.fizzle";

    function toxicVenomData(json: string): string {
        const value = JSON.parse(json);
        ["interval", "cap", "amp"].forEach(key => {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid toxic venom");
        });
        return JSON.stringify(value);
    }
    WorldCombat.effect(ToxicVenom, 1, 1200, "actor", toxicVenomData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ToxicVenom, "start", effect => {
        const data = JSON.parse(effect.state());
        data.lease = MobEffects.bind(effect.world(), effect.target(), "minecraft:poison");
        effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(ToxicVenom, "watch", effect => {
        if (!MobEffects.present(effect.world(), JSON.parse(effect.state()).lease)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(ToxicVenom, "pulse", effect => {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state()), body = world.observe(victim);
        if (body === null || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        const next = Math.min(data.cap, data.amp + 1);
        if (next > data.amp) {
            if (!CombatStatus.inflict(world, victim, "toxic", effect.remaining(), next)) { effect.end(); return; }
            const poison = MobEffects.read(world, victim, "minecraft:poison");
            if (poison === null) { effect.end(); return; }
            data.amp = poison.amplifier(); data.lease = MobEffects.bind(world, victim, "minecraft:poison", poison);
            effect.state(JSON.stringify(data));
            WorldFeedback.emit(world, toxicScene, 1, body.position(), { moment: "escalate", target: String(victim.ref()),
                amp: data.amp, count: 4 + data.amp * 2, size: .07 + data.amp * .02, speed: .1 }, 24);
            WorldFeedback.text(world, body.position(), toxicEscalateText, [data.amp], 24);
        }
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(ToxicVenom, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(ToxicVenom, "end", effect => {
        const world = effect.world(), body = world.observe(effect.target());
        if (body !== null) WorldFeedback.emit(world, toxicScene, 1, body.position(), { moment: "wither", target: String(effect.target().ref()) }, 22);
    });

    define({
        id: "toxic",
        name: "Toxic",
        description: "吐出一团毒液，使目标逐渐加深中毒，原生毒伤随强度提高变得更密。解毒会立即停止加深，毒素到期自然消散。",
        uses: ["开局给难缠的目标下毒", "把一场硬仗拖成消耗战", "逼对手先来清状态或后撤"],
        kind: "aim",
        range: 10,
        maxRange: 16,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 50,
        style: "venom",
        defaults: { virulent: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["toxic"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("toxic", "prepare", context),
                recover: p("toxic", "recover", context),
                cooldown: p("toxic", "cooldown", context),
                range: p("toxic", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_toxic:windup", toxicScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = p("toxic", "venomSpeed", action);
            const radius = p("toxic", "venomRadius", action);
            const venomTicks = p("toxic", "venomTicks", action);
            const interval = Math.max(1, Math.round(p("toxic", "escalateInterval", action)));
            const cap = Math.max(1, Math.round(p("toxic", "ampCap", action)));
            sound(action, "cobblemon:move.sludgebomb.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:particle/moves/sludgebomb" },
                impact: function (current, hit) {
                    const body = current.world();
                    const target = hit.target();
                    if (target === null || !body.valid(target)) {
                        WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "fizzle" }, 18);
                        WorldFeedback.text(body, hit.position(), toxicFizzleText, [], 24);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    if (!CombatStatus.inflict(body, target, "toxic", venomTicks, 1)) {
                        WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "immune", target: String(target.ref()) }, 22);
                        return;
                    }
                    body.effects(target, ToxicVenom).forEach(effect => body.operation(effect.id(), "world_combat:dispel", "{}"));
                    body.effect(ToxicVenom, target, JSON.stringify({ interval: interval, cap: cap, amp: 1 }), venomTicks);
                    const ref = String(target.ref());
                    WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "root", target: ref }, 26);
                    WorldFeedback.text(body, hit.position(), toxicRootText, [], 30);
                    sound(current, "cobblemon:move.sludgebomb.target");
                }
            }, done);
            WorldFeedback.emit(world, toxicScene, 1, action.origin(), { moment: "travel", projectile: flight, target: action.target() ? String(action.target()!.ref()) : "" }, 60);
        }
    });
}
