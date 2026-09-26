/** 输电：对任意关系实体通电，下一次符合条件的动作提交时消费，并锁存整次动作改写。 */
namespace PokemonSkills {
    define({
        id: "electrify", name: "输电", description: "给一个战斗者通电，让其下一次符合条件的招式整招变成电属性；可用于友方或敌方。",
        uses: ["预判改属性", "破除普通招", "帮电吸收队友"], kind: "aim", range: 9, prepare: 4, active: 0, recover: 6, cooldown: 60, style: "electrify",
        defaults: { allMoves: false },
        fields: [flag("allMoves", "全导")],
        indicator: function (config, pokemon) {
            return { radius: p("electrify", "dischargeRadius", pokemon), geometry: "line", style: "electrify",
                label: config && config.allMoves ? "全导" : "滤波" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["electrify"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("electrify", "cooldown", context) + (config && config.allMoves ? 14 : -14);
            return { prepare: p("electrify", "prepare", context), recover: p("electrify", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["electrify"].active, range: skills["electrify"].range };
        },
        windup: function (action) {
            action.present("electrify:windup", electrifyScene, 1, action.origin(), JSON.stringify({ moment: "windup", actor: String(action.actor().ref()) }));
            return p("electrify", "prepare", action);
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) return "invalid-target";
            const body = world.observe(target);
            if (body === null || !world.clear(action.origin(), body.position())) return "target-not-visible";
            return "";
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null) { done(action); return; }
            const from = world.observe(self), to = world.observe(target);
            if (from === null || to === null) { done(action); return; }
            const duration = p("electrify", "surgeDuration", action);
            const arcs = p("electrify", "arcCount", action);
            if (!world.clear(from.position(), to.position()) || to.position().minus(from.position()).length() > action.range()) { done(action); return; }
            if (MobEffects.apply(world, target, electrified, duration, 0) === null) { done(action); return; }
            world.effects(target, electrifyPayload).forEach(effect => world.operation(effect.id(), "world_combat:dispel", "{}"));
            world.effect(electrifyPayload, target, JSON.stringify({ all: config && config.allMoves ? 1 : 0 }), duration);
            sound(action, "minecraft:entity.lightning_bolt.impact");
            WorldFeedback.emit(world, electrifyScene, 1, from.position(),
                { moment: "arc", target: String(target.ref()), arcCount: arcs, path: [String(self.ref()), String(target.ref())] }, 26);
            WorldFeedback.emit(world, electrifyScene, 1, to.position(),
                { moment: "charge", target: String(target.ref()), arcCount: arcs,
                    scale: Math.max(0.5, p("electrify", "dischargeRadius", action) / 0.9) }, 32);
            WorldFeedback.text(world, to.position().plus(WorldCombat.point(0, 1, 0)), electrifyText, [], 24);
            done(action);
        }
    });
    WorldCombat.preview("world_combat:electrify", JSON.stringify({ lineOfSight: true }));
}
