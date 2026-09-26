/** A heavy egg bursts once on living contact, or after a short native ground roll. */
namespace PokemonSkills {
    const eggbombScene = "world_combat:move_eggbomb";
    const eggbombRoll = "world_combat:eggbomb_roll";
    WorldBodies.define(eggbombRoll, { maxTicks: 40, start: function () {},
        blocked: function (brain, input) { if (input.horizontal) { const data = JSON.parse(brain.state()); data.stopped = true; brain.state(JSON.stringify(data)); } },
        touch: function (brain, other) { const world = brain.world(); if (world.friendly(other)) return;
            const data = JSON.parse(brain.state()); if (!data.contact) { data.contact = String(other.ref()); brain.state(JSON.stringify(data)); } }
    });
    define({
        id: "eggbomb",
        cooldownParameter: "recharge",
        name: "Egg Bomb",
        description: "重蛋沿弧线抛出，撞活体立即裂爆；落地则沿原方向滚一小段，碰墙或滚尽再裂开。每蛋只爆一次，总威力由范围内实际命中的敌人分担。",
        uses: ["对厚目标抡一记最重的单发物伤", "让落地的裂蛋短滚后爆开，压住敌人的前进路线", "隔着掩体用高弧线把蛋扔过去"],
        kind: "aim",
        range: 9,
        maxRange: 12,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 20,
        style: "egg",
        maximumTicks: 160,
        defaults: { heavy: false, ai: { maxChase: 13, opportunist: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("eggbomb", "splash", pokemon), geometry: "area", style: "egg", color: 0xF2E4B8,
                label: config && config.heavy === true ? "重蛋" : "直投炸蛋" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["eggbomb"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("eggbomb", "tempo", context)),
                recover: Math.round(p("eggbomb", "aftercast", context)),
                cooldown: Math.round(p("eggbomb", "recharge", context)),
                active: 0,
                range: p("eggbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:eggbomb:" + action.id(), eggbombScene, 1, action.origin(), JSON.stringify({
                moment: "heave", heavy: config && config.heavy === true ? 1 : 0, scale: scale }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), scenes = WorldFeedback.actionScenes(eggbombScene);
            const origin = action.origin();
            const target = action.target();
            const point = action.targetPosition();
            const power = p("eggbomb", "egg", action);
            const speed = Math.max(0.4, p("eggbomb", "heave", action));
            const gravity = Math.max(0.01, p("eggbomb", "arc", action));
            const radius = Math.max(0.15, p("eggbomb", "radius", action));
            const reach = Math.max(4, p("eggbomb", "reach", action));
            const spread = Math.max(0.5, p("eggbomb", "scatter", action));
            const splash = Math.max(1.0, p("eggbomb", "splash", action));
            const shards = Math.max(6, Math.round(p("eggbomb", "shards", action)));
            const slickTicks = Math.max(4, Math.round(p("eggbomb", "slickTicks", action)));
            const heavy = !!(config && config.heavy);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.4));
            const intensity = Math.max(0.5, Math.min(2.2, power / 90));
            const distance = point.minus(origin).length();
            let settled = false, rolling = false, burst = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            let direction = LivingActions.ballistic(origin, point, speed, gravity);
            if (direction === null) direction = aim(action);
            const angle = (world.random() * 2 - 1) * spread * Math.PI / 180;
            const cos = Math.cos(angle), sin = Math.sin(angle);
            direction = WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);

            function crack(current: CombatAction, at: CombatPoint): void {
                if (burst) return; burst = true;
                const scope = current.world();
                const victims = scope.query(at, splash, false).filter(function (actor) { const body = scope.observe(actor); return !scope.friendly(actor) && !!body && scope.clear(at, body.position()); });
                victims.forEach(function (victim) { hurt(current, victim, "eggbomb", power / Math.max(1, victims.length), { damage: damageSpec("eggbomb", "egg") }); });
                WorldFeedback.emit(scope, eggbombScene, 1, at, { moment: "shatter", shards: shards, radius: splash, scale: scale, intensity: intensity }, 24);
                scope.sound("minecraft:entity.turtle.egg_break", at, 14, "{}");
            }
            sound(action, "minecraft:entity.egg.throw");
            WorldFeedback.emit(world, eggbombScene, 1, origin,
                { moment: "release", heavy: heavy ? 1 : 0, shards: shards, scale: scale, intensity: intensity }, 16);

            action.releaseTarget();
            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, gravity: gravity, range: Math.max(reach, distance + 3),
                radius: radius, lifetime: Math.max(30, Math.round((distance + 3) / Math.max(0.3, speed)) + 30),
                appearance: { item: "minecraft:egg", scale: Math.max(0.9, Math.min(2.1, radius * 3.4)) } as any,
                impact: function (inner: CombatAction, hit: CombatImpact): void {
                    scenes.stop(inner, "flight");
                    const scope = inner.world(), at = hit.position();
                    if (hit.hitEntity() || hit.blockFace() !== "up") { crack(inner, at); return; }
                    rolling = true;
                    const egg = WorldBodies.spawn(scope, at.plus(WorldCombat.point(0, .05, 0)),
                        { appearance: { item: "minecraft:egg", spin: true, scale: scale }, size: [radius * 2, radius * 2],
                            health: 1, gravity: true, pushable: true, invulnerable: true, silent: true }, eggbombRoll, {}, 30);
                    const velocity = WorldCombat.point(direction!.x(), 0, direction!.z()).scale(speed * .3);
                    scope.motion(egg, velocity, false);
                    WorldFeedback.emit(scope, eggbombScene, 1, at, { moment: "splash", shards: 4, scale: scale, radius: radius }, 12);
                    const began = scope.tick(), rollTicks = Math.max(4, Math.min(12, slickTicks));
                    function roll(current: CombatAction): void {
                        const access = current.world(), body = access.valid(egg) ? access.observe(egg) : null;
                        if (!body) { finish(current); return; }
                        const state = access.effects(egg, eggbombRoll)[0], facts = state ? JSON.parse(state.data()) : {};
                        const velocity = body.velocity(), speed = Math.sqrt(velocity.x() * velocity.x() + velocity.z() * velocity.z());
                        if (facts.contact || facts.stopped || access.tick() - began >= rollTicks || access.tick() - began >= 3 && speed < .03) {
                            const actual = body.position(); access.dismiss(egg); crack(current, actual); finish(current); return;
                        }
                        current.after(1, roll);
                    }
                    inner.after(1, roll);
                }
            }, function (inner: CombatAction) { if (!rolling) finish(inner); });
            scenes.show(action, "flight", origin, { moment: "flight", projectile: flight, shards: shards, scale: scale, intensity: intensity });
        }
    });
}
