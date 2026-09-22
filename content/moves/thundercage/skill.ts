/**
 * 雷电囚笼 / thundercage 的出手方式。
 *
 * 核心念头：一道电击命中后，在目标四周立起一圈竖着的电流栅栏，围出一个笼子；目标被关在笼内，
 * 越想越过栅栏越会被电弧弹回并电一下；笼内每隔一会儿也劈一道电、有概率把它电麻。它不钉住谁，
 * 但谁也别想从栅栏之间走出去。这是本组只有 1 个学习者的签名招，也是最重的一记。
 *
 * 三幕：
 *   起（windup，提交前）：电丝在身前收束、噼啪作响的预告。
 *   击（cast → enclose）：提交后电矢飞出；命中即结算一次较重的电击（cage），在目标周围立起电笼，
 *       把共享身份 `world_combat:status/partiallytrapped`（本单元 `world_combat:thundercage_grid`）挂上。
 *   收（arc → release）：绑定效果每 2 刻把电笼贴回目标四周；目标一旦越过 `radius` 即被推回 `push` 格并挨一记
 *       `arc` 电击，笼内每 `interval` 也劈一次并尝试麻痹。时长走完或被外力清掉状态时电笼消散。
 *
 * 与同族分开：唯一的电属性、唯一的边界式围栏；只拦越界、越界即电。地面属性对电免疫，打上去没有笼子。
 */
namespace PokemonSkills {
    const thundercageScene = "world_combat:move_thundercage";
    const thundercageGrid = "world_combat:thundercage_grid";
    const thundercageBond = "world_combat:thundercage_bond";
    const thundercageCageKey = "thundercage:cage:";
    const thundercageEncloseText = "world_combat.move.thundercage.text.enclose";
    const thundercageReleaseText = "world_combat.move.thundercage.text.release";

    function thundercagePoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    function thundercageBondData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid thunder cage anchor");
        ["cage", "arc", "interval", "radius", "push", "bars", "paralyzeChance", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid thunder cage bond");
        });
        if (value.interval < 1 || value.radius <= 0 || value.push <= 0) throw new Error("Invalid thunder cage bond");
        return JSON.stringify(value);
    }

    function thundercageArc(world: CombatWorld, victim: CombatActor, data: any, moment: string): void {
        hurt(world, victim, "thundercage", data.arc, { damage: damageSpec("thundercage", "arc") });
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        if (body === null) return;
        if (!CombatStatus.has(world, victim, "paralysis") && world.random() < data.paralyzeChance)
            CombatStatus.inflict(world, victim, "paralysis");
        WorldFeedback.emit(world, thundercageScene, 1, body.position(),
            { moment: moment, target: String(victim.ref()), bars: Math.round(data.bars), count: Math.round(10 + data.arc),
                intensity: Math.max(0.6, Math.min(2.4, data.arc / 18)), pulses: data.pulses || 0 }, 20);
        world.sound("cobblemon:impact.electric", body.position(), 16, "{}");
    }

    WorldCombat.effect(thundercageBond, 1, 500, "actor", thundercageBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(thundercageBond, "start", function (effect) { effect.schedule("arc", "arc", 1, "{}"); });
    WorldCombat.effectHandler(thundercageBond, "arc", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = thundercagePoint(data.point);
        const delta = body.position().minus(anchor), distance = delta.length();
        if (distance > data.radius && distance > 0.01) {
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            thundercageArc(world, victim, data, "arc");
            if (!world.valid(victim)) { effect.end(); return; }
            const inward = Math.min(distance - Math.max(0.3, data.radius * 0.55), 2.0);
            if (inward > 0.02) world.displace(victim, delta.unit().scale(-inward));
        }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            thundercageArc(world, victim, data, "zap");
            if (!world.valid(victim)) { effect.end(); return; }
        }
        const at = world.observe(victim);
        WorldFeedback.keep(world, thundercageCageKey + String(victim.ref()), thundercageScene, 1, anchor,
            { moment: "cage", target: String(victim.ref()), radius: data.radius, bars: Math.round(data.bars),
                scale: data.radius / 1.6, flow: Math.round(16 + data.bars), push: data.push }, 20);
        effect.schedule("arc", "arc", 2, "{}");
    });
    WorldCombat.effectHandler(thundercageBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const grid = MobEffects.read(world, victim, thundercageGrid);
        if (grid !== null) world.removeMobEffect(victim, thundercageGrid, grid.key());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, thundercageScene, 1, body.position(),
            { moment: "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), thundercageReleaseText, [], 24);
    });
    WorldCombat.effectHandler(thundercageBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    WorldCombat.on("world_combat:move_thundercage/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== thundercageGrid) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, thundercageGrid) !== null) return;
        const bonds = world.effects(victim, thundercageBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: "thundercage",
        name: "Thunder Cage",
        description: "一道电击命中后在目标四周立起一圈竖着的电流栅栏，把它围在笼内：目标越过栅栏就被电弧弹回并电一下，笼内每隔一会儿也劈一道电、有概率把它电麻。它不钉住谁，但谁也别想从栅栏之间走出去。广笼式更宽更久；紧笼式更小、电得更重。",
        uses: ["把高机动的目标关在一小块地里", "用持续电击和麻痹压制对手", "把冲进来的目标弹回交战区", "在狭窄处锁住一个关键目标"],
        kind: "enemy",
        range: 10,
        maxRange: 17,
        prepare: 9,
        active: 40,
        recover: 9,
        cooldown: 48,
        style: "thundercage",
        defaults: { wide: false, ai: { maxChase: 12, preferMovers: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("thundercage", "reach", pokemon), geometry: "line", style: "thundercage", color: 0xE8E24A,
                label: config && config.wide === true ? "广域电笼" : "紧束电笼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["thundercage"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const wide = !!(config && config.wide);
            return {
                prepare: Math.round(p("thundercage", "charge", context)),
                recover: 9,
                cooldown: Math.round(p("thundercage", "duration", context) * 0.22) + 16 + (wide ? 8 : 0),
                active: skills["thundercage"].active,
                range: p("thundercage", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("thundercage:weave", thundercageScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const speed = Math.max(0.5, p("thundercage", "speed", action));
            const cage = p("thundercage", "cage", action);
            const arc = p("thundercage", "arc", action);
            const duration = Math.max(80, Math.round(p("thundercage", "duration", action)));
            const interval = Math.max(6, Math.round(p("thundercage", "interval", action)));
            const radius = Math.max(1.0, p("thundercage", "radius", action));
            const push = Math.max(0.2, p("thundercage", "push", action));
            const bars = Math.max(6, Math.round(p("thundercage", "bars", action)));
            const paralyzeChance = Math.max(0, Math.min(1, p("thundercage", "paralyzeChance", action)));
            const scale = radius / 1.6;
            sound(action, "cobblemon:impact.electric");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.32,
                appearance: { sprite: "cobblemon:particle/generic/electricity/electricity_yellow", glow: true, scale: 1.0,
                    homing: target ? { target: String(target.ref()), turn: 11, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, thundercageScene, 1, at, { moment: "fizzle" }, 16);
                        return;
                    }
                    if (!impact(current, hit, "thundercage", cage, { damage: damageSpec("thundercage", "cage") })) return;
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", thundercageGrid, duration, 0, { unique: true })) return;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    const anchor = body.position();
                    const state = { point: [anchor.x(), anchor.y(), anchor.z()], cage: cage, arc: arc, interval: interval,
                        radius: radius, push: push, bars: bars, paralyzeChance: paralyzeChance, next: scope.tick() + interval, pulses: 0 };
                    const existing = scope.effects(victim, thundercageBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    scope.effect(thundercageBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.emit(scope, thundercageScene, 1, anchor,
                        { moment: "enclose", target: String(victim.ref()), radius: radius, bars: bars, push: push, scale: scale }, 26);
                    WorldFeedback.text(scope, anchor.plus(WorldCombat.point(0, 1.2, 0)), thundercageEncloseText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("minecraft:entity.lightning_bolt.impact", anchor, 20, "{}");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, thundercageScene, 1, action.origin(),
                { moment: "cast", projectile: flight, bars: bars, scale: scale }, 60);
        }
    });
}
