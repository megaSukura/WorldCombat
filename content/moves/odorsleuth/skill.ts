/** Identify one observed scent, then retain only its last seen position briefly after occlusion. */
namespace PokemonSkills {
    function odorsleuthAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.15, 0)); }

    WorldCombat.effect(odorsleuthRecordEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["taken", "drag", "motes", "window", "reveal"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid odorsleuth record: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(odorsleuthRecordEffect, "start", function () { });
    WorldCombat.effectHandler(odorsleuthRecordEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function odorsleuthRecordOf(world: CombatWorld, target: CombatActor): any {
        const views = world.effects(target, odorsleuthRecordEffect);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function odorsleuthReleaseRecord(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, odorsleuthRecordEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    // 兑现点：任何一般／格斗招式打在带 foresight 身份的目标上时，结算前把 targetFacts 里的 ghost 摘掉。
    PokemonDamage.metadata.define({
        id: "world_combat:move_odorsleuth/negate-immunity",
        applies: function (context) {
            return !context.preview && !!context.world && !!context.target && !!context.targetFacts
                && (context.metadata.type === "normal" || context.metadata.type === "fighting")
                && context.targetFacts.types.indexOf("ghost") >= 0;
        },
        apply: function (context) {
            if (!context.world || !context.target || !context.targetFacts) return;
            if (!CombatStatus.has(context.world, context.target, odorsleuthStatus) && !CombatStatus.has(context.world, context.target, "foresight")) return;
            context.targetFacts.types = context.targetFacts.types.filter(function (type) { return type !== "ghost"; });
        }
    });

    // 窗口走完或被清除：把剥掉的闪避原样还回、清掉记录；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_odorsleuth/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== odorsleuthMarkEffect) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const record = odorsleuthRecordOf(world, target);
        odorsleuthReleaseRecord(world, target);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, odorsleuthScene, 1, body.position(), { moment: "fade", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, odorsleuthAbove(body.position()), odorsleuthFadeText, [], 22);
    });

    export const odorsleuthTrail = "world_combat:odorsleuth_trail";
    WorldCombat.effect(odorsleuthTrail, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(odorsleuthTrail, "start", effect => effect.schedule("observe", "observe", 1, "{}"));
    WorldCombat.effectHandler(odorsleuthTrail, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(odorsleuthTrail, "observe", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state()), target = world.actor(data.ref);
        if (!target || !world.valid(target) || !MobEffects.matches(world, target, data.carrier)) { effect.end(); return; }
        // Resolution only checks availability. Hidden positions never refresh the remembered point.
        data.visible = world.visible(target);
        if (data.visible) {
            const body = world.observe(target); if (!body) { effect.end(); return; }
            data.point = [body.position().x(), body.position().y(), body.position().z()]; data.seen = world.tick();
        }
        const age = world.tick() - data.seen;
        if (age <= data.memory) WorldFeedback.keep(world, "odorsleuth:trail:" + effect.id(), odorsleuthScene, 1,
            WorldCombat.point(data.point[0], data.point[1], data.point[2]), { moment: "trail", motes: Math.max(2, Math.round(data.motes * (1 - age / data.memory))), intensity: 1 - age / data.memory }, 6);
        effect.state(JSON.stringify(data)); effect.schedule("observe", "observe", 4, "{}");
    });
    define({
        id: odorsleuthId,
        cooldownParameter: "recharge",
        name: "气味侦测",
        description: "嗅出可见目标，暂时削去正闪避并让一般、格斗打得到幽灵。失视后短时记住最后看见的位置，伙伴会去那里找气味。",
        uses: ["追一个想跑的幽灵或快手", "短时沿最后看见的位置追查气味", "替队友的一般或格斗招铺路"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 82,
        style: "scent",
        defaults: { keen: false },
        fields: [flag("keen", "敏锐")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[odorsleuthId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(odorsleuthId, "tempo", context)),
                recover: Math.round(p(odorsleuthId, "aftercast", context)),
                cooldown: Math.round(p(odorsleuthId, "recharge", context)),
                active: 1,
                range: p(odorsleuthId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[odorsleuthId], detail: { values: config } };
            return { radius: p(odorsleuthId, "reach", context), geometry: "line", style: "scent", color: 0xE8D08A,
                label: config && config.keen === true ? "气味侦测 · 敏锐" : "气味侦测" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(odorsleuthId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, odorsleuthStatus) || CombatStatus.has(world, target, "foresight")) return "already-smelled";
            if (CombatStatus.has(world, target, "miracleeye")) return "miracle-eyed";
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_odorsleuth:windup", odorsleuthScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", keen: config && config.keen === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, odorsleuthScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                WorldFeedback.text(world, odorsleuthAbove(action.targetPosition()), odorsleuthEmptyText, [], 24);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, odorsleuthScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, odorsleuthAbove(point), odorsleuthBlockedText, [], 26);
                done(action);
                return;
            }
            const window = Math.max(40, Math.round(p(odorsleuthId, "window", action)));
            const reveal = Math.max(20, Math.round(p(odorsleuthId, "reveal", action)));
            const motes = Math.max(8, Math.round(p(odorsleuthId, "motes", action)));
            const strips = Math.max(0, Math.round(p(odorsleuthId, "strips", action)));
            const drag = Math.max(0, Math.min(0.8, p(odorsleuthId, "drag", action)));
            const taken = Math.min(strips, Math.max(0, NativeEffects.stage(NativeEffects.read(world, target), "evasion")));
            const carrier = MobEffects.apply(world, target, odorsleuthMarkEffect, window, 0);
            if (!carrier) { done(action); return; }
            if (taken) NativeEffects.boostWindow(world, target, { evasion: -taken }, window, "world_combat:move/odorsleuth", carrier);
            world.effects(actor, odorsleuthTrail).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
            world.effect(odorsleuthTrail, actor, JSON.stringify({ ref: String(target.ref()), carrier: MobEffects.anchor(carrier),
                point: [point.x(), point.y(), point.z()], seen: world.tick(), memory: Math.max(20, Math.min(100, reveal * (1 + drag))), motes, visible: true }), window);
            odorsleuthReleaseRecord(world, target);
            world.effect(odorsleuthRecordEffect, target,
                JSON.stringify({ taken: taken, drag: drag, motes: motes, window: window, reveal: reveal }), window);
            sound(action, "minecraft:entity.warden.sniff");
            if (at !== null) {
                WorldFeedback.emit(world, odorsleuthScene, 1, at.position(),
                    { moment: "pick", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, window: window, drag: drag, taken: taken,
                        scale: Math.max(0.6, Math.min(2, window / 260)), intensity: Math.max(0.7, Math.min(2, 0.7 + drag * 2)) }, 30);
                WorldFeedback.text(world, odorsleuthAbove(at.position()), odorsleuthPickText, [Math.round(window / 20), Math.round(Math.max(20, Math.min(100, reveal * (1 + drag))) / 20 * 10) / 10], 30);
                world.sound("minecraft:entity.warden.listening", at.position(), 12, "{}");
            }
            done(action);
        }
    });
}
