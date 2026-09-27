/** 充电：提交下一次电属性攻击时消费电荷，整次动作及其派生段共享加成；特防提升随电荷结束。 */
namespace PokemonSkills {
    define({
        id: "charge", name: "充电", description: "储存电荷并提高特防，强化下一次电属性招式。",
        uses: ["决招前蓄力", "硬吃一发法术", "接电招爆发"], kind: "self", range: 1, prepare: 6, active: 0, recover: 6, cooldown: 70, style: "charge",
        defaults: { hold: false },
        fields: [flag("hold", "蓄满电")],
        indicator: function (config, pokemon) {
            return { radius: p("charge", "auraRadius", pokemon), geometry: "area", style: "charge",
                label: config && config.hold ? "蓄满电" : "即充电" };
        },
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["charge"], detail: { values: config }, world: world || null, actor: actor || null };
            const cooldown = p("charge", "cooldown", context) + (config && config.hold ? 18 : -10);
            return { prepare: p("charge", "prepare", context), recover: p("charge", "recover", context),
                cooldown: Math.max(10, cooldown), active: skills["charge"].active, range: skills["charge"].range };
        },
        windup: function (action) {
            const speed = p("charge", "sparkSpeed", action);
            action.present("charge:gather", chargeScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", actor: String(action.actor().ref()), speed: speed }));
            return p("charge", "prepare", action);
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const duration = Math.max(1, Math.round(p("charge", "chargeDuration", action)));
            const sparks = p("charge", "sparkCount", action);
            const radius = p("charge", "auraRadius", action);
            const discharge = p("charge", "dischargeRadius", action);
            const speed = p("charge", "sparkSpeed", action);
            // 先确认新的充能真的挂上，再撤旧 mark；被拒绝时保留原有充能窗口，不会留下无载体的新 mark。
            if (MobEffects.read(world, actor, chargeUp) !== null) { done(action); return; }
            const carrier = MobEffects.set(world, actor, chargeUp, duration, 0);
            if (carrier === null) { done(action); return; }
            const previous = world.effects(actor, chargeMark);
            for (let i = 0; i < previous.length; i++) world.operation(previous[i].id(), "world_combat:dispel", "{}");
            const markTicks = Math.max(1, Math.min(1200, carrier.duration() > 0 ? carrier.duration() : duration));
            world.effect(chargeMark, actor, JSON.stringify({ anchor: MobEffects.anchor(carrier), sparks: sparks,
                radius: radius, discharge: discharge, speed: speed }), markTicks);
            // 特防按实际 boost 回执单独反馈：已经满级或免疫时不再声称提升。
            const before = NativeEffects.effectiveStage(world, actor, "spd");
            NativeEffects.boostWindow(world, actor, { spd: 1 }, duration, "world_combat:move/charge", carrier, null);
            const gained = Math.max(0, NativeEffects.effectiveStage(world, actor, "spd") - before);
            sound(action, "minecraft:block.respawn_anchor.charge");
            if (body !== null) {
                WorldFeedback.emit(world, chargeScene, 1, body.position(),
                    { moment: "charged", actor: String(actor.ref()), sparks: sparks, scale: Math.max(0.5, radius / 0.5) }, 30);
                if (gained > 0) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), chargeReadyText, [gained], 30);
            }
            done(action);
        }
    });
}
