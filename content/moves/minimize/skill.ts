/** Native scale shrinks the actual body; one shared evasion window and contact-only larger-body vulnerability. */
namespace PokemonSkills {
    const minimizeScene = "world_combat:move_minimize", minimizeSmall = "world_combat:minimize_small", minimizeMark = "world_combat:minimize_mark";
    WorldCombat.effect(minimizeMark, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(minimizeMark, "start", () => {});
    BodyScale.changes.define({ id: "world_combat:minimize/body", applies: view => view.key === "minimize", apply: view => {
        const body = view.world.observe(view.actor); if (!body) return;
        if (view.phase === "restored") {
            WorldFeedback.emit(view.world, minimizeScene, 1, body.position(), { moment: "fade" }, 22);
            WorldFeedback.text(view.world, body.position(), "world_combat.move.minimize.text.fade", [], 24);
        } else {
            WorldFeedback.onEffect(view.world, view.effect, "shape", minimizeScene, 1, body.position(),
                { moment: view.phase === "waiting" ? "waiting" : "hold", target: String(view.actor.ref()) });
            if (view.phase === "waiting") WorldFeedback.text(view.world, body.position(), "world_combat.move.minimize.text.waiting", [], 60);
        }
    } });
    MobEffects.reactTagged("world_combat:move_minimize/contact", "world_combat:status/minimize", "world_combat:damage_incoming",
        event => event.target(), (event, target) => {
            const data = JSON.parse(String(event.data()));
            if (!(data.amount > 0) || !DamageSemantics.read(data).contact) return;
            const world = event.world(), source = event.actor(), body = world.observe(source);
            if (!body || String(source.key()) === String(target.key())) return;
            const views = world.effects(target, minimizeMark);
            const mark = views.map(view => JSON.parse(String(view.data()))).filter(value => MobEffects.matches(world, target, value.carrier))[0];
            if (!mark || body.width() * body.width() * body.height() < mark.volume * 1.3) return;
            data.amount *= mark.trample; data.minimizeTrample = true; event.data(JSON.stringify(data));
        }, "world_combat:effects_incoming");
    WorldCombat.on("world_combat:minimize/trample", "world_combat:damage_applied", "", event => {
        const data = JSON.parse(String(event.data())); if (!data.minimizeTrample || !(data.actual > 0)) return;
        const receipt = WorldFeedback.receipt(event); if (!receipt) return;
        WorldFeedback.emit(event.world(), minimizeScene, 1, receipt.point, { moment: "trample", target: String(receipt.target.ref()) }, 24);
        WorldFeedback.text(event.world(), receipt.point, "world_combat.move.minimize.text.trample", [], 24);
    });
    define({
        id: "minimize",
        cooldownParameter: "wait",
        name: "变小",
        description: "真实缩小身体和碰撞箱，获得临时闪避等级；比原体型明显更大的身体接触命中时伤害更重。效果结束先撤战斗增益，空间不足时等待容身再恢复体型。",
        uses: ["被围住前先缩起来，让来袭的攻击落空", "在大型对手脚下求生，提防被一脚踩实", "拉锯里用缩小窗口换几秒安全"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 4,
        cooldown: 120,
        style: "shrink",
        stationary: true,
        defaults: { bold: false, ai: { maxChase: 14, minGap: 2 } },
        fields: [flag("bold", "大胆缩小")],
        indicator: function (config, pokemon) {
            return { radius: 1.0, geometry: "area", style: "shrink", color: 0x9FB8D8,
                label: config && config.bold === true ? "变小 · 大胆" : "变小 · 谨慎" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["minimize"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("minimize", "tempo", context)),
                recover: Math.round(p("minimize", "aftercast", context)),
                cooldown: Math.round(p("minimize", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_minimize:curl", minimizeScene, 1, action.origin(),
                JSON.stringify({ moment: "curl", bold: config && config.bold === true ? 1 : 0 }));
            return prepare;
        },
        ready: action => BodyScale.pending(action.sense(), action.actor(), "minimize") ? "already-small" : "",
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (!body) { done(action); return; }
            const evade = Math.round(p("minimize", "evade", action)), window = Math.round(p("minimize", "window", action));
            const small = p("minimize", "small", action), trample = p("minimize", "trample", action);
            const carrier = MobEffects.apply(world, actor, minimizeSmall, window, 0);
            if (!carrier) { done(action); return; }
            if (!BodyScale.shrink(world, actor, small, carrier, "minimize")) {
                world.removeMobEffect(actor, carrier.id(), carrier.key()); done(action); return;
            }
            NativeEffects.boostWindow(world, actor, { evasion: evade }, window, "minimize", carrier);
            world.effect(minimizeMark, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier),
                volume: body.width() * body.width() * body.height(), trample: trample }), window);
            WorldFeedback.emit(world, minimizeScene, 1, body.position(), { moment: "tiny", target: String(actor.ref()),
                scale: small / 0.6, motes: p("minimize", "motes", action), pulses: p("minimize", "pulses", action) }, 30);
            WorldFeedback.text(world, body.position(), "world_combat.move.minimize.text.small", [evade, small, Math.round(window / 20)], 32);
            sound(action, "cobblemon:move.minimize.actor"); done(action);
        }
    });
}
