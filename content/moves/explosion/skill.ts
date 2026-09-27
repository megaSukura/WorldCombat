/** 移动引信在真实位置完成牺牲后，由独立爆源兑现一次爆发。 */
namespace PokemonSkills {
    const explosionScene = "world_combat:move_explosion";
    const explosionHitText = "world_combat.move.explosion.text.hit";
    const explosionMissText = "world_combat.move.explosion.text.miss";
    const explosionFuseText = "world_combat.move.explosion.text.fuse";
    /** 引信环的发射率（熄灭时发 0）。三道环由外向内先后熄灭。 */
    const explosionFuseRate = 10;

    WorldBodies.define("world_combat:move/explosion/departure", {
        maxTicks: 400,
        start: body => { body.schedule("watch", "watch", 1, "{}"); },
        resume: body => { DeferredSacrifice.waiting(body); },
        handlers: { watch: body => { DeferredSacrifice.waiting(body); } },
        end: body => { DeferredSacrifice.forget(body); },
        observedDeath: function (body, death) {
            const state = DeferredSacrifice.confirm(body, death);
            if (!state) return;
            body.remaining(Math.max(48, state.craterTicks + 30));
            const world = body.world(), centre = ExplosionDeparture.point(state.centre);
            const region = WorldGeometry.ring(centre, 0, state.radius, { below: state.band, above: state.band });
            let hits = 0;
            world.sound("minecraft:entity.generic.explode", centre, 24, "{}");
            WorldFeedback.emit(world, explosionScene, 1, centre, { moment: "detonate", radius: state.radius,
                debris: state.debris, scale: 1, intensity: state.intensity }, 36);
            state.targets.forEach((shot: any) => {
                const target = world.actor(shot.ref), facts = target && world.valid(target) ? world.observe(target) : null;
                if (!target || !facts || !ExplosionDeparture.inside(region, facts) || !world.clear(centre, facts.position())) return;
                if (!DeferredSacrifice.hurt(body, target, shot.amount, shot.metadata)) return;
                hits++;
                if (world.valid(target)) {
                    const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    if (away.length() > .001) world.hitDisplace(target, away.unit().scale(state.knock));
                    if (state.lift > 0) world.hitImpulse(target, WorldCombat.point(0, state.lift, 0));
                }
                WorldFeedback.emit(world, explosionScene, 1, facts.position(), { moment: "hit",
                    target: shot.ref, scale: state.radius / 5.6, debris: state.debris }, 26);
            });
            WorldFeedback.emit(world, explosionScene, 1, centre, { moment: "shock", radius: state.radius, scale: 1, debris: state.debris }, 24);
            if (state.ground) WorldFeedback.emit(world, explosionScene, 1, ExplosionDeparture.point(state.ground),
                { moment: "crater", radius: state.radius, cells: state.craterCells, ticks: state.craterTicks,
                    debris: state.debris, scale: 1, hits: hits }, state.craterTicks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? explosionHitText : explosionMissText, hits > 0 ? [hits] : [], 30);
        }
    });
    define({
        freeMovement: true,
        id: "explosion",
        cooldownParameter: "recharge",
        name: "Explosion",
        description: "点燃一根可见引信，朝所选近地点短步压进：引信烧完时在身体真实所在处炸开，圈内每个敌人各挨一次重击、被狠狠掀飞抛起，地面留下焦烟余烬。撞墙就停在墙前、引信照烧；引信中被击倒则这一记作废，不补第二爆。即使一个人都没炸到，使用者也会倒下。蓄爆式更大更久、余烬更久，瞬爆式更快。",
        uses: ["带着引信压进人堆，把一圈人炸成重伤", "把贴身的整圈对手远远掀飞", "用可读的引信逼对手离开落点", "在倒下前留下一圈渐散的余烬"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 16,
        active: 0,
        recover: 0,
        cooldown: 90,
        style: "detonation",
        maximumTicks: 420,
        defaults: { charged: false, ai: { sacrifice: false, maxChase: 7, minFoes: 2, cornered: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("explosion", "blastRadius", pokemon), geometry: "area", style: "detonation",
                color: 0xF0A94E, label: config && config.charged === true ? "蓄爆式" : "瞬爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["explosion"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p("explosion", "tempo", context))),
                recover: 0,
                cooldown: Math.max(40, Math.round(p("explosion", "recharge", context))),
                active: skills["explosion"].active,
                range: p("explosion", "deliverRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("explosion:charge", explosionScene, 1, action.origin(), JSON.stringify({
                moment: "charge", windup: prepare, charged: config && config.charged === true,
                radius: p("explosion", "blastRadius", action),
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(explosionScene);
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { movementScenes.finish(action, done); return; }

            const radius = Math.max(3.4, p("explosion", "blastRadius", action));
            const power = p("explosion", "blast", action);
            const knock = p("explosion", "knock", action);
            const lift = p("explosion", "lift", action);
            const debris = Math.max(16, Math.round(p("explosion", "debris", action)));
            const craterTicks = Math.max(40, Math.round(p("explosion", "craterTicks", action)));
            const craterCells = Math.max(10, Math.round(p("explosion", "craterCells", action)));
            const cap = Math.max(1, Math.round(p("explosion", "maxTargets", action)));
            const fuse = Math.max(8, Math.round(p("explosion", "fuse", action)));
            const pace = Math.max(0.12, p("explosion", "deliverSpeed", action));
            const reach = Math.max(2.5, p("explosion", "deliverRange", action));
            const scale = radius / 5.6;

            // 锁定所选近地点：目标实体取其脚下地面，方向点直接用；水平压到推进距离内，再落到近地。
            const raw = action.targetPosition(), target = action.target();
            let rawFoot = raw;
            if (target !== null) {
                const targetBody = world.observe(target);
                if (targetBody !== null) rawFoot = WorldCombat.point(raw.x(), targetBody.position().y() - targetBody.height() * 0.5, raw.z());
            }
            const startFeet = body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0));
            let flat = WorldCombat.point(rawFoot.x() - startFeet.x(), 0, rawFoot.z() - startFeet.z());
            if (flat.length() > reach) flat = flat.unit().scale(reach);
            const destination = WorldGeometry.ground(world, startFeet.plus(flat), 4);

            let elapsed = 0, settled = false, held = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            /** 引信归零：在身体真实所在处一次结清爆炸与必倒代价；只会发生一次。 */
            function detonate(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const live = scope.observe(self);
                if (live === null || live.health() <= 0) { finish(current); return; }
                movementScenes.stop(current, "fuse");
                const centre = live.position();
                const ground = SurfacePaths.support(scope, centre.minus(WorldCombat.point(0, live.height() / 2, 0)), .5, 4);
                const state = { centre: [centre.x(), centre.y(), centre.z()], ground: ground ? [ground.x(), ground.y(), ground.z()] : null, radius: radius, band: radius * .85,
                    knock: knock, lift: lift, debris: debris, craterTicks: craterTicks, craterCells: craterCells,
                    intensity: Math.max(.7, Math.min(2.8, power / 250)),
                    targets: ExplosionDeparture.damage(current, "explosion", "blast", centre, radius, radius * .85, cap, power) };
                if (!DeferredSacrifice.arm(current, centre, "world_combat:move/explosion/departure", state, 48,
                    fresh => { finish(fresh); }, "world_combat:explosion_cost")) finish(current);
            }

            function tick(current: CombatAction): void {
                const scope = current.world();
                const live = scope.observe(self);
                // 引信中被击倒：这一记作废，不移动、不引爆、不补第二爆。
                if (live === null || live.health() <= 0) { finish(current); return; }
                const remaining = fuse - elapsed;
                if (remaining <= 0) { detonate(current); return; }
                const liveFeet = live.position().minus(WorldCombat.point(0, live.height() * 0.5, 0));

                // 三道引信环由外向内熄灭；爆圈（半径=真实爆心）整段跟随身体，归零时才在 detonate 里锁死。
                const outer = remaining > fuse * 2 / 3 ? explosionFuseRate : 0;
                const middle = remaining > fuse / 3 ? explosionFuseRate : 0;
                const pulse = explosionFuseRate + Math.round((1 - remaining / fuse) * explosionFuseRate);
                movementScenes.show(current, "fuse", liveFeet, {
                    moment: "fuse", radius: radius, scale: scale, pulse: pulse,
                    fuse3Radius: radius * 0.72, fuse3: outer,
                    fuse2Radius: radius * 0.48, fuse2: middle,
                    fuse1Radius: radius * 0.24, fuse1: explosionFuseRate
                });

                // 短步压向爆点：抵达或被挡住就停住，引信照烧，爆心停在真实位置。
                if (!held) {
                    const toward = WorldCombat.point(destination.x() - liveFeet.x(), 0, destination.z() - liveFeet.z());
                    if (toward.length() > 0.15) {
                        const step = Math.min(pace, toward.length());
                        const moved = scope.displace(self, toward.unit().scale(step));
                        if (!(moved > step * 0.35)) held = true;
                    }
                }
                elapsed++;
                current.after(1, tick);
            }

            sound(action, "minecraft:entity.tnt.primed");
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), explosionFuseText, [], 24);
            tick(action);
        }
    });
}
