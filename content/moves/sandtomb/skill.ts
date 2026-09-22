/**
 * 流沙地狱 / sandtomb 的出手方式。
 *
 * 核心念头：把一片沙甩到目标脚下，地面当场塌成流沙坑——贴地的目标被钉住、往坑心收、往下沉，
 * 沙砾一遍遍磨它；只有腾空才能脱身。它是本组唯一的物理挤压，也是最吃「站不站得住」的一招。
 *
 * 三幕：
 *   起（windup，提交前）：脚边沙粒回旋聚拢、地面微响的预告。
 *   击（cast → swallow）：提交后沙砾贴着地面飞出；命中即结算一次磨蚀（grind）；若目标还贴地，
 *       在它脚下塌出沙坑，把共享身份 `world_combat:status/partiallytrapped`（本单元 `world_combat:sandtomb_grip`，
 *       自带移动归零）挂上，并在地表留下一片沙化的地面（`world.terrain` 租成沙岩，活过招式）。
 *   收（grind → release / slip）：绑定效果每 2 刻把目标朝坑心收、往坑底带并维持沙坑；每 `interval` 磨一次。
 *       目标腾空、被拽离坑心超过 `escape`、倒下或状态被外力清掉时滑脱。
 *
 * 与同族分开：它是四招里唯一的物理伤害，且只吃贴地目标——腾空即脱身；地面留下真实的沙。
 */
namespace PokemonSkills {
    const sandtombScene = "world_combat:move_sandtomb";
    const sandtombGrip = "world_combat:sandtomb_grip";
    const sandtombBond = "world_combat:sandtomb_bond";
    const sandtombPitKey = "sandtomb:pit:";
    const sandtombSwallowText = "world_combat.move.sandtomb.text.swallow";
    const sandtombReleaseText = "world_combat.move.sandtomb.text.release";
    const sandtombSlipText = "world_combat.move.sandtomb.text.slip";

    function sandtombPoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    function sandtombBondData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid sand tomb pit");
        ["grind", "interval", "pull", "sink", "escape", "radius", "grit", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid sand tomb bond");
        });
        if (value.interval < 1 || value.escape <= 0 || value.radius <= 0) throw new Error("Invalid sand tomb bond");
        return JSON.stringify(value);
    }

    /** 在坑心周围租一层沙化的地面（沙岩）；地面受冲击，用同一层地表的方块替换来表达，生物脚下始终有方块。 */
    function sandtombSand(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const cells: any[] = [], r = Math.max(1, Math.min(2, Math.floor(radius)));
        const reach = Math.max(radius, r), cx = Math.floor(point.x()), cz = Math.floor(point.z());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dz * dz > reach * reach + 0.01) continue;
            const x = cx + dx, z = cz + dz;
            let y = Math.floor(point.y());
            for (let k = 0; k < 4; k++) {
                const probe = world.block(WorldCombat.point(x + 0.5, y, z + 0.5));
                if (probe !== null && probe.id() !== "minecraft:air") break;
                y -= 1;
            }
            const ground = world.block(WorldCombat.point(x + 0.5, y, z + 0.5));
            if (ground === null || ground.id() === "minecraft:air") continue;
            cells.push({ x: x, y: y, z: z, block: "minecraft:sandstone" });
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); } catch (error) { }
    }

    WorldCombat.effect(sandtombBond, 1, 500, "actor", sandtombBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(sandtombBond, "start", function (effect) { effect.schedule("grind", "grind", 1, "{}"); });
    WorldCombat.effectHandler(sandtombBond, "grind", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = sandtombPoint(data.point);
        // 腾空即脱身：目标升到坑口以上（跳跃、飞行、被抬起、瞬移）就抓不住。
        if (body.position().y() - anchor.y() > 0.9) { data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return; }
        if (body.position().minus(anchor).length() > data.escape) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const delta = anchor.minus(body.position()), distance = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
        if (distance > 0.03 && data.pull > 0) world.displace(victim, WorldCombat.point(delta.x() / distance * Math.min(data.pull, distance), 0, delta.z() / distance * Math.min(data.pull, distance)));
        const buried = data.buried || 0;
        if (buried < 0.5) {
            const drop = Math.min(data.sink, 0.5 - buried);
            if (drop > 0.005 && world.displace(victim, WorldCombat.point(0, -drop, 0)) > 0) { data.buried = buried + drop; effect.state(JSON.stringify(data)); }
        }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            hurt(world, victim, "sandtomb", data.grind, { damage: damageSpec("sandtomb", "grind") });
            if (!world.valid(victim)) { effect.end(); return; }
            const at = world.observe(victim);
            WorldFeedback.emit(world, sandtombScene, 1, at !== null ? at.position() : anchor,
                { moment: "grind", target: String(victim.ref()), grit: Math.round(data.grit), count: Math.round(10 + data.grind),
                    intensity: Math.max(0.6, Math.min(2.2, data.grind / 24)), pulses: data.pulses }, 20);
            world.sound("minecraft:block.sand.break", anchor, 16, "{}");
        }
        WorldFeedback.keep(world, sandtombPitKey + String(victim.ref()), sandtombScene, 1, anchor,
            { moment: "pit", target: String(victim.ref()), radius: data.radius, grit: Math.round(data.grit),
                scale: data.radius / 1.3, flow: Math.round(30 + data.radius * 30) }, 20);
        effect.schedule("grind", "grind", 2, "{}");
    });
    WorldCombat.effectHandler(sandtombBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const grip = MobEffects.read(world, victim, sandtombGrip);
        if (grip !== null) world.removeMobEffect(victim, sandtombGrip, grip.key());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, sandtombScene, 1, body.position(),
            { moment: data.slipped ? "slip" : "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
            data.slipped ? sandtombSlipText : sandtombReleaseText, [], 24);
    });
    WorldCombat.effectHandler(sandtombBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    WorldCombat.on("world_combat:move_sandtomb/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== sandtombGrip) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, sandtombGrip) !== null) return;
        const bonds = world.effects(victim, sandtombBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    // 被流沙钉住：对宝可梦与原生生物一致归零导航速度；腾空后不再生效（属性修饰仍在，但目标是飞不起来的贴地体）。
    WorldCombat.on("world_combat:move_sandtomb/roots", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), sandtombGrip) === null) return;
        const body = event.world().observe(event.actor());
        if (body === null || !body.grounded()) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        id: "sandtomb",
        name: "Sand Tomb",
        description: "把一片沙甩到目标脚下，地面塌成流沙坑：贴地的目标被钉住、往坑心收、往下沉，沙砾一遍遍磨它，地表留下一片沙化的地面。只有升空才能脱身——跳跃、飞行、被抬起或瞬移都会滑脱。沉陷式坑更深更久但磨得更轻；速陷式收得更紧、磨得更重、更快结束。",
        uses: ["把地面上的重目标拖住往坑里埋", "封住一片地面不让对手站住", "用物理持续伤害磨厚目标", "让起跳/飞行成为对手唯一的选择"],
        kind: "enemy",
        range: 10,
        maxRange: 17,
        prepare: 9,
        active: 40,
        recover: 9,
        cooldown: 42,
        style: "sandtomb",
        defaults: { deep: false, ai: { maxChase: 11, preferGrounded: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sandtomb", "reach", pokemon), geometry: "line", style: "sandtomb", color: 0xC9A76A,
                label: config && config.deep === true ? "沉陷流沙" : "速陷流沙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["sandtomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("sandtomb", "charge", context)),
                recover: 9,
                cooldown: Math.round(p("sandtomb", "duration", context) * 0.2) + 14 + (deep ? 8 : 0),
                active: skills["sandtomb"].active,
                range: p("sandtomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sandtomb:gather", sandtombScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", deep: config && config.deep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const speed = Math.max(0.5, p("sandtomb", "speed", action));
            const grind = p("sandtomb", "grind", action);
            const duration = Math.max(80, Math.round(p("sandtomb", "duration", action)));
            const interval = Math.max(6, Math.round(p("sandtomb", "interval", action)));
            const pull = Math.max(0, p("sandtomb", "pull", action));
            const sink = Math.max(0.01, p("sandtomb", "sink", action));
            const escape = Math.max(1.5, p("sandtomb", "escape", action));
            const radius = Math.max(0.9, p("sandtomb", "radius", action));
            const grit = Math.max(8, Math.round(p("sandtomb", "grit", action)));
            const scale = radius / 1.3;
            const arrival = action.targetPosition();
            const pit = WorldCombat.point(arrival.x(), Math.floor(arrival.y()) + 0.05, arrival.z());
            sandtombSand(world, pit, radius, duration);
            sound(action, "cobblemon:impact.ground");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.36, lifetime: 120,
                appearance: { sprite: "cobblemon:particle/generic/earth", glow: false, scale: 0.8,
                    homing: target ? { target: String(target.ref()), turn: 9, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, sandtombScene, 1, at, { moment: "fizzle" }, 16);
                        return;
                    }
                    if (!impact(current, hit, "sandtomb", grind, { damage: damageSpec("sandtomb", "grind") })) return;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", sandtombGrip, duration, 0, { unique: true })) return;
                    const anchor = body.position();
                    const ground = WorldCombat.point(anchor.x(), Math.floor(anchor.y()) + 0.05, anchor.z());
                    const state = { point: [ground.x(), ground.y(), ground.z()], grind: grind, interval: interval, pull: pull,
                        sink: sink, escape: escape, radius: radius, grit: grit, next: scope.tick() + interval, pulses: 0, buried: 0, slipped: false };
                    const existing = scope.effects(victim, sandtombBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    scope.effect(sandtombBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.emit(scope, sandtombScene, 1, ground,
                        { moment: "swallow", target: String(victim.ref()), radius: radius, grit: grit, scale: scale }, 26);
                    WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 1.0, 0)), sandtombSwallowText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("minecraft:block.sand.break", ground, 18, "{}");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, sandtombScene, 1, action.origin(),
                { moment: "cast", projectile: flight, scale: scale }, 60);
        }
    });
}
