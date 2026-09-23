/** 光墙：领域自己保存时长与参数，受护者按领域实例持有独立贡献；特殊减伤与附带效果滤淡由本招聚合。 */
namespace PokemonSkills {
    StatusContributions.define(lightscreenEffect);
    function lightscreenAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }
    function lightscreenMarkOf(world: CombatWorld, actor: CombatActor): any {
        const contributions = StatusContributions.list(world, actor, lightscreenEffect);
        return contributions.length ? contributions[0].payload : null;
    }
    function lightscreenCover(effect: CombatEffect): number {
        const world = effect.world(), caster = effect.source(), data = JSON.parse(effect.state()), body = world.observe(caster);
        if (body === null) return 0;
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        const owner = { id: effect.id(), definition: lightscreenMark, target: String(caster.ref()) };
        const token = String(effect.id());
        let reached = StatusContributions.upsert(world, caster, lightscreenEffect, token, data, ticks, { owner: owner }) ? 1 : 0;
        const actors = world.query(body.position(), Math.max(1, Number(data.radius) || 3), false);
        for (let i = 0; i < actors.length; i++) {
            if (String(actors[i].key()) === String(caster.key()) || !world.friendly(actors[i])) continue;
            if (StatusContributions.upsert(world, actors[i], lightscreenEffect, token, data, ticks, { owner: owner })) reached++;
        }
        data.reached = reached; effect.state(JSON.stringify(data));
        return reached;
    }
    function lightscreenOpen(world: CombatWorld, caster: CombatActor, ticks: number, data: any): number {
        const roots = world.effects(caster, lightscreenMark).filter(view => String(view.source().key()) === String(caster.key()));
        let id: number;
        if (roots.length) {
            id = roots[0].id();
            world.operation(id, "world_combat:refresh", JSON.stringify({ ticks: ticks, data: data }));
        } else id = world.effect(lightscreenMark, caster, JSON.stringify(data), ticks);
        const root = world.effects(caster, lightscreenMark).filter(view => view.id() === id)[0];
        return root ? Number(JSON.parse(String(root.data())).reached) || 0 : 0;
    }
    WorldCombat.effect(lightscreenMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["cut", "damp", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid lightscreen field: " + key);
        });
        if (value.radius <= 0 || value.motes <= 0) throw new Error("Invalid lightscreen field extent");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(lightscreenMark, "start", function (effect) {
        lightscreenCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(lightscreenMark, "pulse", function (effect) {
        if (MobEffects.read(effect.world(), effect.source(), lightscreenEffect) === null) { effect.end(); return; }
        lightscreenCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(lightscreenMark, "end", function (effect) {
        const world = effect.world(), caster = effect.source(), state = JSON.parse(effect.state());
        StatusContributions.removeSource(world, lightscreenEffect, String(effect.id()));
        const body = world.observe(caster);
        if (body !== null) WorldFeedback.emit(world, lightscreenScene, 1, body.position(),
            { moment: "fade", target: String(caster.ref()), field: state.radius,
                scale: Math.max(0.6, Math.min(2, state.radius / 3)) }, 30);
    });
    WorldCombat.effectHandler(lightscreenMark, "operation:world_combat:refresh", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const input = JSON.parse(effect.input());
        if (typeof input.ticks !== "number" || !isFinite(input.ticks) || input.ticks < 1 || input.ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.state(JSON.stringify(input.data)); effect.remaining(Math.min(1200, input.ticks)); lightscreenCover(effect);
    });
    WorldCombat.effectHandler(lightscreenMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });

    /** 特殊结算点：受击者带着光墙时削减特殊伤害，并把附带次要效果的几率滤淡。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_lightscreen/veil", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.bypassesInvulnerability || !(data.amount > 0)) return;
        if (data.category !== "special") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target)) return;
        const mark = lightscreenMarkOf(world, target);
        if (mark === null) return;
        const before = data.amount;
        const blocked = before * Math.max(0, Math.min(0.8, Number(mark.cut) || 0));
        data.amount = Math.max(0, before - blocked);
        let damped = false;
        if (typeof data.chance === "number" && data.chance > 0) {
            const damp = Math.max(0, Math.min(0.95, Number(mark.damp) || 0));
            data.chance = Math.max(0, data.chance * (1 - damp));
            damped = true;
        }
        const body = world.observe(target);
        if (body !== null) {
            WorldFeedback.emit(world, lightscreenScene, 1, body.position(),
                { moment: "block", target: String(target.ref()), blocked: Math.round(blocked * 10) / 10, motes: mark.motes }, 22);
            if (damped) WorldFeedback.text(world, lightscreenAbove(body.position()), lightscreenDampText, [], 24);
        }
    } });

    // 光幕散：施法者的光幕到期或被人解除时，收回半径内友方的光幕；整圈柔光同时收。
    WorldCombat.on("world_combat:move_lightscreen/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== lightscreenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, lightscreenEffect) !== null) return;
        const views = world.effects(actor, lightscreenMark);
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().key()) === String(views[i].target().key()))
                world.operation(views[i].id(), "world_combat:dispel", "{}");
        }
    });

    // 持幕画面：每 20 刻续一次头顶与身侧的柔光，低密度，让出目标本体视线。
    WorldCombat.on("world_combat:move_lightscreen/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== lightscreenEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = lightscreenMarkOf(world, actor), body = world.observe(actor);
        if (mark === null || body === null) return;
        WorldFeedback.keep(world, "world_combat:move_lightscreen/hold/" + String(actor.ref()), lightscreenScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), motes: mark.motes,
                scale: Math.max(0.6, Math.min(2, (Number(mark.radius) || 3) / 3)) }, 40);
    });

    const lightscreenThick = flag("thick", "厚幕");
    lightscreenThick.help = "厚幕：特殊减伤 ×1.18，但附带效果只滤掉柔幕的约六成，起手 +3 刻、冷却 ×1.12。柔幕：减伤 ×0.8，附带效果滤淡 ×1.3，起手 −2 刻、冷却 ×0.9。";

    define({
        id: lightscreenId,
        cooldownParameter: "recharge",
        name: "光墙",
        description: "在身周张起一层柔光穹顶，罩住自己与身边的队友；期间受到的特殊伤害被削掉一块，特殊招式附带的次要效果也被滤淡。光幕跟着施法者移动，并把新进入半径的友方补进保护；已受护的人即使走远，也保留到光幕结束。",
        uses: ["挡住成片的特殊攻击", "削弱特殊招式的附带状态", "在对方特殊输出前先一步张幕"],
        kind: "self",
        range: 1,
        prepare: 11,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "dome",
        defaults: { thick: false },
        fields: [lightscreenThick],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lightscreenId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(4, Math.round(p(lightscreenId, "tempo", context))),
                recover: Math.max(3, Math.round(p(lightscreenId, "aftercast", context))),
                cooldown: Math.max(60, Math.round(p(lightscreenId, "recharge", context))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lightscreen:windup", lightscreenScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: 3, geometry: "circle", style: "dome", color: 0xFFE9A8,
                label: config && config.thick ? "厚幕" : "柔幕" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const duration = Math.max(120, Math.round(p(lightscreenId, "screenTicks", action)));
            const radius = Math.max(1.5, p(lightscreenId, "screenRadius", action));
            const motes = Math.max(1, Math.round(p(lightscreenId, "motes", action)));
            const cut = Math.max(0.05, Math.min(0.8, p(lightscreenId, "cut", action)));
            const damp = Math.max(0, Math.min(0.95, p(lightscreenId, "damp", action)));
            const data = { cut: cut, damp: damp, radius: radius, motes: motes, ticks: duration, caster: String(actor.ref()) };
            const reached = lightscreenOpen(world, actor, duration, data);
            sound(action, "cobblemon:move.lightscreen.actor");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3));
                WorldFeedback.emit(world, lightscreenScene, 1, body.position(),
                    { moment: "raise", target: String(actor.ref()), motes: motes, field: radius, scale: scale, intensity: scale }, 46);
                WorldFeedback.text(world, lightscreenAbove(body.position()), lightscreenRaiseText, [Math.round(duration / 20), reached], 44);
            }
            done(action);
        }
    });
}
