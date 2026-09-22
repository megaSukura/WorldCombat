/** 反射壁：领域自己保存时长与参数，受护者按领域实例持有独立贡献；物理减伤与镜面反弹由本招聚合。 */
namespace PokemonSkills {
    StatusContributions.define(reflectEffect);
    const reflectCounter = "world_combat:reflect_counter";
    function reflectAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }
    function reflectContribution(world: CombatWorld, actor: CombatActor): StatusContributions.Contribution | null {
        const contributions = StatusContributions.list(world, actor, reflectEffect);
        return contributions.length ? contributions[0] : null;
    }
    function reflectMarkOf(world: CombatWorld, actor: CombatActor): any {
        const contribution = reflectContribution(world, actor);
        return contribution === null ? null : contribution.payload;
    }
    function reflectCover(effect: CombatEffect): number {
        const world = effect.world(), caster = effect.source(), data = JSON.parse(effect.state()), body = world.observe(caster);
        if (body === null) return 0;
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        const owner = { id: effect.id(), definition: reflectMark, target: String(caster.ref()) };
        const token = String(effect.id());
        let reached = StatusContributions.upsert(world, caster, reflectEffect, token, data, ticks, { owner: owner }) ? 1 : 0;
        const actors = world.query(body.position(), Math.max(1, Number(data.radius) || 3), false);
        for (let i = 0; i < actors.length; i++) {
            if (String(actors[i].key()) === String(caster.key()) || !world.friendly(actors[i])) continue;
            if (StatusContributions.upsert(world, actors[i], reflectEffect, token, data, ticks, { owner: owner })) reached++;
        }
        data.reached = reached; effect.state(JSON.stringify(data));
        return reached;
    }
    function reflectOpen(world: CombatWorld, caster: CombatActor, ticks: number, data: any): number {
        const roots = world.effects(caster, reflectMark).filter(view => String(view.source().key()) === String(caster.key()));
        let id: number;
        if (roots.length) {
            id = roots[0].id();
            world.operation(id, "world_combat:refresh", JSON.stringify({ ticks: ticks, data: data }));
        } else id = world.effect(reflectMark, caster, JSON.stringify(data), ticks);
        const root = world.effects(caster, reflectMark).filter(view => view.id() === id)[0];
        return root ? Number(JSON.parse(String(root.data())).reached) || 0 : 0;
    }
    WorldCombat.effect(reflectMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["cut", "rebound", "radius", "plates"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid reflect field: " + key);
        });
        if (value.radius <= 0 || value.plates <= 0) throw new Error("Invalid reflect field extent");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(reflectMark, "start", function (effect) {
        reflectCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(reflectMark, "pulse", function (effect) {
        if (MobEffects.read(effect.world(), effect.source(), reflectEffect) === null) { effect.end(); return; }
        reflectCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(reflectMark, "end", function (effect) {
        const world = effect.world(), caster = effect.source(), state = JSON.parse(effect.state());
        StatusContributions.removeSource(world, reflectEffect, String(effect.id()));
        const body = world.observe(caster);
        if (body !== null) WorldFeedback.emit(world, reflectScene, 1, body.position(),
            { moment: "fade", target: String(caster.ref()), field: state.radius,
                scale: Math.max(0.6, Math.min(2, state.radius / 3)) }, 30);
    });
    WorldCombat.effectHandler(reflectMark, "operation:world_combat:refresh", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const input = JSON.parse(effect.input());
        if (typeof input.ticks !== "number" || !isFinite(input.ticks) || input.ticks < 1 || input.ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.state(JSON.stringify(input.data)); effect.remaining(Math.min(1200, input.ticks)); reflectCover(effect);
    });
    WorldCombat.effectHandler(reflectMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    EffectReactions.register(reflectMark, reflectCounter, function (effect, facts) {
        const world = effect.world(), attacker = world.actor(facts.attacker), target = world.actor(facts.target);
        if (!attacker || !target || String(effect.caller().key()) !== String(attacker.key()) || world.allied(target, attacker)) return;
        const contribution = reflectContribution(world, target);
        if (!contribution || contribution.token !== String(effect.id()) || String(contribution.source.key()) !== String(effect.source().key())) return;
        const back = Number(facts.amount);
        if (!(back > 0) || !isFinite(back) || !world.hurt(attacker, back, JSON.stringify({ kind: "reflection", reflected: true, type: facts.type || "" }))) return;
        const body = world.observe(target);
        if (body !== null) {
            WorldFeedback.text(world, reflectAbove(body.position()), reflectReboundText, [Math.round(back * 10) / 10], 26);
            world.sound("minecraft:block.amethyst_block.hit", body.position(), 12, "{}");
        }
    });

    /** 物理结算点：受击者带着反射壁时削减物理伤害；镜面形态把挡下的部分弹回近身者。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_reflect/plates", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.reflected || data.bypassesInvulnerability || !(data.amount > 0)) return;
        if (data.category !== "physical") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target)) return;
        const contribution = reflectContribution(world, target);
        if (contribution === null) return;
        const mark = contribution.payload;
        const before = data.amount;
        const blocked = before * Math.max(0, Math.min(0.8, Number(mark.cut) || 0));
        data.amount = Math.max(0, before - blocked);
        const body = world.observe(target), source = hit.source;
        const hostile = !!source && world.valid(source) && String(source.key()) !== String(target.key()) && !world.allied(target, source);
        const attacker = hostile ? world.observe(source) : null;
        if (body !== null) {
            const data2: any = { moment: "block", target: String(target.ref()), blocked: Math.round(blocked * 10) / 10, plates: mark.plates };
            if (attacker !== null) {
                const away = attacker.position().minus(body.position());
                if (away.length() > 0.01) { const direction = away.unit(); data2.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, reflectScene, 1, body.position(), data2, 22);
        }
        const rebound = Math.max(0, Math.min(0.8, Number(mark.rebound) || 0));
        if (rebound <= 0 || !data.contact || !hostile || attacker === null || source === null) return;
        const back = blocked * rebound;
        if (!(back > 0)) return;
        EffectReactions.invoke(world, Number(contribution.token), reflectCounter,
            { attacker: String(source.ref()), target: String(target.ref()), amount: back, type: data.type || "" });
    } });

    // 壁散：施法者的壁到期或被人解除时，收回半径内友方的壁；整圈硬光同时收。
    WorldCombat.on("world_combat:move_reflect/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== reflectEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, reflectEffect) !== null) return;
        const views = world.effects(actor, reflectMark);
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().key()) === String(views[i].target().key()))
                world.operation(views[i].id(), "world_combat:dispel", "{}");
        }
    });

    const reflectMirror = flag("mirror", "镜面反射");
    reflectMirror.help = "镜面：减伤 ×0.8，近身物理被挡下的部分按攻击的 30%~ 弹回攻击者，起手 −2 刻、冷却 ×0.9。坚壁：减伤 ×1.18、不反弹，起手 +3 刻、冷却 ×1.12。";

    // 持壁画面：每 20 刻续一次环绕身体的板影，低密度，让出目标本体视线。
    WorldCombat.on("world_combat:move_reflect/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== reflectEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = reflectMarkOf(world, actor), body = world.observe(actor);
        if (mark === null || body === null) return;
        WorldFeedback.keep(world, "world_combat:move_reflect/hold/" + String(actor.ref()), reflectScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), plates: mark.plates,
                scale: Math.max(0.6, Math.min(2, (Number(mark.radius) || 3) / 3)) }, 40);
    });

    define({
        id: reflectId,
        name: "反射壁",
        description: "在身侧立起一圈硬光板，罩住自己与身边的队友；期间受到的物理伤害被削掉一块，镜面形态还把近身物理挡下的那份弹回攻击者。壁跟着施法者走，离开范围的人会失去这层保护。",
        uses: ["挡住成片的物理攻击", "把近身猛攻弹回一部分", "在对方物理输出前先一步立壁"],
        kind: "self",
        range: 1,
        prepare: 11,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "plates",
        defaults: { mirror: false },
        fields: [flag("mirror", "镜面反射")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[reflectId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const mirror = !!(config && config.mirror);
            return {
                prepare: Math.max(4, Math.round(p(reflectId, "tempo", context))),
                recover: Math.max(3, Math.round(p(reflectId, "aftercast", context))),
                cooldown: Math.max(60, Math.round(p(reflectId, "recharge", context))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_reflect:windup", reflectScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", mirror: config && config.mirror ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: 3, geometry: "circle", style: "plates", color: 0x8FC7FF,
                label: config && config.mirror ? "镜面" : "坚壁" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const duration = Math.max(120, Math.round(p(reflectId, "plateTicks", action)));
            const radius = Math.max(1.5, p(reflectId, "plateRadius", action));
            const plates = Math.max(1, Math.round(p(reflectId, "plates", action)));
            const cut = Math.max(0.05, Math.min(0.8, p(reflectId, "cut", action)));
            const rebound = Math.max(0, Math.min(0.8, p(reflectId, "rebound", action)));
            const data = { cut: cut, rebound: rebound, radius: radius, plates: plates, ticks: duration, caster: String(actor.ref()) };
            const reached = reflectOpen(world, actor, duration, data);
            sound(action, "minecraft:block.glass.place");
            world.sound("minecraft:item.shield.block", body === null ? action.origin() : body.position(), 14, "{}");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3));
                WorldFeedback.emit(world, reflectScene, 1, body.position(),
                    { moment: "raise", target: String(actor.ref()), plates: plates, field: radius, scale: scale, intensity: scale }, 46);
                WorldFeedback.text(world, reflectAbove(body.position()), reflectRaiseText, [Math.round(duration / 20), reached], 44);
            }
            done(action);
        }
    });
}
