/**
 * 火焰旋涡 / firespin 的出手方式。
 *
 * 核心念头：把一撮火甩到目标身上，火就地立成一道绕着它打转的火柱；火柱贴着目标走，不断舔它、把它点着——
 * 目标可以跑、可以打，但躲不开自己的那团火，除非把火扑灭（湿身）或等火势烧尽。
 *
 * 三幕：
 *   起（windup，提交前）：掌心火舌回旋聚拢的预告。
 *   击（cast → wrap）：提交后火种追着目标飞出；命中即结算一次灼烧（scorch），在目标身上立起火柱，
 *       并把共享身份 `world_combat:status/partiallytrapped`（本单元 `world_combat:firespin_blaze`）挂上；顺手点燃目标。
 *   收（lick → release / douse）：绑定效果每 2 刻把火柱贴到目标身上；每 `interval` 舔一次并尝试点燃目标。
 *       目标一旦湿透，火柱立刻熄灭（doused）；时长走完或被外力清掉状态时散去。
 *
 * 与同族分开：潮旋锚在一点往回拽；火柱贴着目标走，靠持续灼烧与点燃施压，水是它唯一的直接反制。
 */
namespace PokemonSkills {
    const firespinScene = "world_combat:move_firespin";
    const firespinBlaze = "world_combat:firespin_blaze";
    const firespinBond = "world_combat:firespin_bond";
    const firespinColumnKey = "firespin:column:";
    const firespinGripText = "world_combat.move.firespin.text.wrap";
    const firespinReleaseText = "world_combat.move.firespin.text.release";
    const firespinDouseText = "world_combat.move.firespin.text.douse";

    function firespinBondData(json: string): string {
        const value = JSON.parse(json);
        ["scorch", "interval", "radius", "height", "burnChance", "burnTicks", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid fire spin bond");
        });
        if (value.interval < 1 || value.radius <= 0 || value.height <= 0 || value.burnChance < 0) throw new Error("Invalid fire spin bond");
        return JSON.stringify(value);
    }

    WorldCombat.effect(firespinBond, 1, 500, "actor", firespinBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(firespinBond, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (world.valid(victim)) world.ignite(victim, 40);
        effect.schedule("lick", "lick", 1, "{}");
    });
    WorldCombat.effectHandler(firespinBond, "lick", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        if (body.wet()) { data.doused = true; effect.state(JSON.stringify(data)); effect.end(); return; }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(4, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            hurt(world, victim, "firespin", data.scorch, { damage: damageSpec("firespin", "scorch") });
            if (!world.valid(victim)) { effect.end(); return; }
            world.ignite(victim, Math.max(20, Math.round(data.burnTicks * 0.6)));
            const at = world.observe(victim);
            if (at !== null && !CombatStatus.has(world, victim, "burn") && world.random() < data.burnChance)
                CombatStatus.inflict(world, victim, "burn", Math.round(data.burnTicks));
            WorldFeedback.emit(world, firespinScene, 1, at !== null ? at.position() : body.position(),
                { moment: "lick", target: String(victim.ref()), count: Math.round(10 + data.scorch),
                    intensity: Math.max(0.6, Math.min(2.2, data.scorch / 24)), pulses: data.pulses }, 20);
            world.sound("minecraft:block.fire.ambient", body.position(), 14, "{}");
        }
        WorldFeedback.keep(world, firespinColumnKey + String(victim.ref()), firespinScene, 1, body.position(),
            { moment: "column", target: String(victim.ref()), radius: data.radius, height: data.height,
                scale: data.radius / 0.85, flow: Math.round(30 + data.radius * 40), pulses: data.pulses || 0 }, 20);
        effect.schedule("lick", "lick", 2, "{}");
    });
    WorldCombat.effectHandler(firespinBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const blaze = MobEffects.read(world, victim, firespinBlaze);
        if (blaze !== null) world.removeMobEffect(victim, firespinBlaze, blaze.key());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, firespinScene, 1, body.position(),
            { moment: data.doused ? "douse" : "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
            data.doused ? firespinDouseText : firespinReleaseText, [], 24);
        if (data.doused) world.sound("minecraft:block.fire.extinguish", body.position(), 14, "{}");
    });
    WorldCombat.effectHandler(firespinBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 外力清掉灼焰状态（牛奶、/effect clear、别的招式）时，绑定随之结束。
    WorldCombat.on("world_combat:move_firespin/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== firespinBlaze) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, firespinBlaze) !== null) return;
        const bonds = world.effects(victim, firespinBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: "firespin",
        name: "Fire Spin",
        description: "把一撮火甩到目标身上，立成一道绕着它打转、跟着它走的火柱：火柱持续灼烧目标并尝试点燃它，目标跑也躲不开自己的火。想摆脱只能把火扑灭——变得湿透（入水、雨中、被水招式打湿）火柱立刻熄灭。猛火式更凶更快但持续更短；缓燃式更稳更久。",
        uses: ["粘住一个高机动目标持续灼烧", "用点燃的持续掉血压制厚目标", "逼对手为灭火而改变站位", "把目标从水里逼出来再点火"],
        kind: "enemy",
        range: 10,
        maxRange: 17,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 40,
        style: "firespin",
        defaults: { blaze: false, ai: { maxChase: 11, avoidWet: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("firespin", "reach", pokemon), geometry: "line", style: "firespin", color: 0xE86A2A,
                label: config && config.blaze === true ? "猛火旋涡" : "缓燃旋涡" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["firespin"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const blaze = !!(config && config.blaze);
            return {
                prepare: Math.round(p("firespin", "charge", context)),
                recover: 8,
                cooldown: Math.round(p("firespin", "duration", context) * 0.2) + 14 + (blaze ? 6 : 0),
                active: skills["firespin"].active,
                range: p("firespin", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("firespin:gather", firespinScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", blaze: config && config.blaze === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const speed = Math.max(0.5, p("firespin", "speed", action));
            const scorch = p("firespin", "scorch", action);
            const duration = Math.max(60, Math.round(p("firespin", "duration", action)));
            const interval = Math.max(6, Math.round(p("firespin", "interval", action)));
            const radius = Math.max(0.6, p("firespin", "radius", action));
            const height = Math.max(1.4, p("firespin", "height", action));
            const burnChance = Math.max(0, Math.min(1, p("firespin", "burnChance", action)));
            const burnTicks = Math.max(40, Math.round(p("firespin", "burnTicks", action)));
            const scale = radius / 0.85;
            sound(action, "cobblemon:impact.fire");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.3,
                appearance: { sprite: "cobblemon:particle/generic/fire/flame", glow: true, tint: 0xFF8A3A, scale: 0.9,
                    homing: target ? { target: String(target.ref()), turn: 12, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, firespinScene, 1, at, { moment: "fizzle" }, 16);
                        scope.sound("minecraft:block.fire.extinguish", at, 12, "{}");
                        return;
                    }
                    if (!impact(current, hit, "firespin", scorch, { damage: damageSpec("firespin", "scorch") })) return;
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", firespinBlaze, duration, 0, { unique: true })) return;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    const state = { scorch: scorch, interval: interval, radius: radius, height: height,
                        burnChance: burnChance, burnTicks: burnTicks, next: scope.tick() + interval, pulses: 0, doused: false };
                    const existing = scope.effects(victim, firespinBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    scope.effect(firespinBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.emit(scope, firespinScene, 1, body.position(),
                        { moment: "wrap", target: String(victim.ref()), radius: radius, height: height, scale: scale }, 26);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), firespinGripText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("cobblemon:impact.fire", body.position(), 16, "{}");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, firespinScene, 1, action.origin(),
                { moment: "cast", projectile: flight, scale: scale }, 60);
        }
    });
}
