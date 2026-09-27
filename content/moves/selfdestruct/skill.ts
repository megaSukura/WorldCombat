/** 原地牺牲爆发：死亡确认前只准备，独立爆源在真实死亡后交付。 */
namespace PokemonSkills {
    const selfdestructScene = "world_combat:move_selfdestruct";
    const selfdestructHitText = "world_combat.move.selfdestruct.text.hit";
    const selfdestructMissText = "world_combat.move.selfdestruct.text.miss";

    WorldBodies.define("world_combat:move/selfdestruct/departure", {
        maxTicks: 400,
        start: body => { body.schedule("watch", "watch", 1, "{}"); },
        resume: body => { DeferredSacrifice.waiting(body); },
        handlers: { watch: body => { DeferredSacrifice.waiting(body); } },
        end: body => { DeferredSacrifice.forget(body); },
        observedDeath: function (body, death) {
            const state = DeferredSacrifice.confirm(body, death);
            if (!state) return;
            body.remaining(Math.max(44, state.scorchTicks + 30));
            const world = body.world(), centre = SelfdestructDeparture.point(state.centre);
            const region = WorldGeometry.ring(centre, 0, state.radius, { below: state.band, above: state.band });
            let hits = 0;
            world.sound("minecraft:entity.generic.explode", centre, 24, "{}");
            WorldFeedback.emit(world, selfdestructScene, 1, centre, { moment: "detonate", radius: state.radius,
                debris: state.debris, scale: 1, intensity: state.intensity }, 36);
            state.targets.forEach((shot: any) => {
                const target = world.actor(shot.ref), facts = target && world.valid(target) ? world.observe(target) : null;
                if (!target || !facts || !SelfdestructDeparture.inside(region, facts) || !world.clear(centre, facts.position())) return;
                if (!DeferredSacrifice.hurt(body, target, shot.amount, shot.metadata)) return;
                hits++;
                if (world.valid(target)) {
                    const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    if (away.length() > .001) world.hitDisplace(target, away.unit().scale(state.knock));
                    if (state.lift > 0) world.hitImpulse(target, WorldCombat.point(0, state.lift, 0));
                }
                WorldFeedback.emit(world, selfdestructScene, 1, facts.position(), { moment: "hit",
                    target: shot.ref, scale: state.radius / 4, debris: state.debris }, 26);
            });
            if (state.ground) WorldFeedback.emit(world, selfdestructScene, 1, SelfdestructDeparture.point(state.ground),
                { moment: "scorch", radius: state.radius, cells: state.scorchCells, ticks: state.scorchTicks,
                    debris: state.debris, scale: 1, hits: hits }, state.scorchTicks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)),
                hits > 0 ? selfdestructHitText : selfdestructMissText, hits > 0 ? [hits] : [], 30);
        }
    });
    define({
        id: "selfdestruct",
        cooldownParameter: "recharge",
        name: "Self-Destruct",
        description: "引发爆炸，攻击自己周围的所有敌人，使用后自己陷入濒死。圈内的敌人被向外掀开、抛起一点，地面留下淡去的焦烟；即使一个人都没炸到，使用者也会倒下。聚爆式更狠更窄，扩散式更广更快。",
        uses: ["被围住时用一条命炸开一圈人", "把贴身的对手连同身位一起掀飞", "在极短起手里抢在对手走开前炸响", "在倒下前最后一次重创对手"],
        kind: "self",
        range: 4.0,
        maxRange: 6.4,
        prepare: 12,
        active: 0,
        recover: 0,
        cooldown: 70,
        style: "blast",
        defaults: { focus: false, ai: { maxChase: 6, minFoes: 2, cornered: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("selfdestruct", "blastRadius", pokemon), geometry: "area", style: "blast",
                color: 0xE8A24A, label: config && config.focus === true ? "聚爆式" : "扩散式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["selfdestruct"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p("selfdestruct", "tempo", context))),
                recover: 0,
                cooldown: Math.max(30, Math.round(p("selfdestruct", "recharge", context))),
                active: skills["selfdestruct"].active,
                range: p("selfdestruct", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("selfdestruct:swell", selfdestructScene, 1, action.origin(), JSON.stringify({
                moment: "swell", windup: prepare, focus: config && config.focus === true,
                radius: p("selfdestruct", "blastRadius", action),
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), facts = world.observe(self);
            if (!facts) { done(action); return; }
            const centre = facts.position(), radius = Math.max(2.4, p("selfdestruct", "blastRadius", action));
            const power = p("selfdestruct", "blast", action), band = radius * .8;
            const ground = SurfacePaths.support(world, centre.minus(WorldCombat.point(0, facts.height() / 2, 0)), .5, 4);
            const state = { centre: [centre.x(), centre.y(), centre.z()], ground: ground ? [ground.x(), ground.y(), ground.z()] : null, radius: radius, band: band,
                knock: p("selfdestruct", "knock", action), lift: p("selfdestruct", "lift", action),
                debris: Math.max(10, Math.round(p("selfdestruct", "debris", action))),
                scorchTicks: Math.max(30, Math.round(p("selfdestruct", "scorchTicks", action))),
                scorchCells: Math.max(6, Math.round(p("selfdestruct", "scorchCells", action))),
                intensity: Math.max(.6, Math.min(2.6, power / 200)),
                targets: SelfdestructDeparture.damage(action, "selfdestruct", "blast", centre, radius, band,
                    Math.max(1, Math.round(p("selfdestruct", "maxTargets", action))), power) };
            if (!DeferredSacrifice.arm(action, centre, "world_combat:move/selfdestruct/departure", state, 44, done, "world_combat:selfdestruct_cost")) done(action);
        }
    });
}
