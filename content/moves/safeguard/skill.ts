/**
 * 神秘守护 / safeguard — 执行组织与家族行为。
 *
 * 核心念头：一圈碧色守护光从施法者身上张开，罩住自己与身边的队友；一条异常状态落到谁头上之前，
 *   先在光罩上荡开一圈、被弹回去。它不加防、不加血，只让「异常状态」落不下来。
 *
 * 出手：短起手（windup 播聚光预告）后提交；只对自己施放，光罩以自身为锚跟随移动。
 * 命中：提交后给自己挂 world_combat:safeguard_veil（身份 safeguard），并把光点、半径、时长写进
 *       world_combat:safeguard_mark；标记每 20 刻把同一份守护补给半径内的友方（施法者始终在内）。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次身周光尘。
 * 守护：带 safeguard 身份的活体上，经共享状态路由（CombatStatus.inflict／招式次要状态）落下的异常
 *       在 CombatStatus.gate 上被拒绝，并当场播放「守护弹开这一条」。
 * 结束：施法者的守护走完或被人解除时，标记一并结束并收回半径内友方身上的守护，整圈光同时收。
 * 反制：只挡异常状态，挡不住伤害、能力下降与控制；离开光罩的人随补给停止而失去；清除类效果能整片解掉。
 */
namespace PokemonSkills {
    function safeguardAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function safeguardMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, safeguardMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function safeguardAura(world: CombatWorld, caster: CombatActor, radius: number, ticks: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = MobEffects.apply(world, caster, safeguardEffect, ticks, 0) !== null ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (MobEffects.apply(world, other, safeguardEffect, ticks, 0) !== null) reached++;
        }
        return reached;
    }

    WorldCombat.effect(safeguardMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "radius", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid safeguard mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(safeguardMark, "start", function (effect) { effect.schedule("aura", "aura", 4, "{}"); });
    WorldCombat.effectHandler(safeguardMark, "aura", function (effect) {
        const world = effect.world(), caster = effect.target(), state = JSON.parse(effect.state());
        if (world.observe(caster) === null) { effect.end(); return; }
        const radius = Math.max(1, Number(state.radius) || 3.2);
        const ticks = Math.max(60, Math.round((Number(state.duration) || 260) * 0.6));
        safeguardAura(world, caster, radius, ticks);
        effect.schedule("aura", "aura", 20, "{}");
    });
    WorldCombat.effectHandler(safeguardMark, "end", function (effect) {
        const world = effect.world(), caster = effect.target();
        if (world.observe(caster) === null) return;
        const state = JSON.parse(effect.state());
        const radius = Math.max(1, Number(state.radius) || 3.2);
        const body = world.observe(caster);
        if (body === null) return;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            MobEffects.consume(world, other, safeguardEffect);
        }
    });
    WorldCombat.effectHandler(safeguardMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 守护的兑现点：带守护身份的活体上，任何经共享状态路由落下的异常都在这里被拒绝。
    // 只问「有没有这个身份」，谁施加的、用哪个效果都不影响；带身份的活体一律挡下，并当场播「守护弹开」。
    // 本项目的增益类护罩（白雾、幸运咒语等）走 MobEffects.apply 直接落效果，不经过这条路由，不会被误挡。
    CombatStatus.gate.define({ id: "world_combat:move_safeguard/ward", apply: function (context) {
        if (!context.allowed || !context.harmful) return;
        if (!CombatStatus.has(context.world, context.actor, safeguardStatus)) return;
        context.allowed = false; context.reason = "safeguard";
        const world = context.world, actor = context.actor, body = world.observe(actor);
        if (body === null) return;
        const mark = safeguardMarkOf(world, actor);
        const motes = mark ? Math.max(6, Math.round(Number(mark.motes) || 22)) : 18;
        WorldFeedback.emit(world, safeguardScene, 1, body.position(),
            { moment: "guard", target: String(actor.ref()), motes: motes, status: CombatStatus.normalize(context.name) }, 24);
        WorldFeedback.text(world, safeguardAbove(body.position()), safeguardGuardText, [], 24);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 12, "{}");
    } });

    // 守护存续期：每 20 刻续一次身周光尘，低密度、慢节奏，让出目标本体视线。
    WorldCombat.on("world_combat:move_safeguard/ward", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== safeguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = safeguardMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_safeguard/veiled/" + String(actor.ref()), safeguardScene, 1, body.position(),
            { moment: "warded", target: String(actor.ref()), motes: mark ? mark.motes : 22,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3.2)) : 1 }, 40);
    });

    // 收束：施法者的守护走到尽头或被人解除时，标记结束并收回友方身上的守护，整圈光同时收。
    WorldCombat.on("world_combat:move_safeguard/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== safeguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const mark = safeguardMarkOf(world, actor);
        if (mark !== null) {
            const views = world.effects(actor, safeguardMark);
            if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, safeguardScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), field: mark ? mark.radius : 3.2, expired: expired ? 1 : 0,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3.2)) : 1 }, 30);
        if (expired) WorldFeedback.text(world, safeguardAbove(body.position()), safeguardFadeText, [], 30);
    });

    define({
        id: safeguardId,
        cooldownParameter: "recharge",
        name: "神秘守护",
        description: "张开随自己移动的守护光，为自己和附近队友抵挡新施加的有害异常。离开范围后仍会短暂保留守护。",
        uses: ["挡住成片的灼伤、中毒、麻痹", "在对方铺异常前先一步张罩", "护住正要进场的队友"],
        kind: "self",
        range: 1,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 165,
        style: "ward",
        defaults: { ward: "deep" },
        fields: [
            choice("ward", "守护方式", ["deep", "early"], ["深守", "早守"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[safeguardId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const early = config.ward === "early";
            return {
                prepare: Math.max(4, Math.round(p(safeguardId, "tempo", context)) + (early ? -2 : 3)),
                recover: Math.round(p(safeguardId, "aftercast", context)),
                cooldown: Math.max(60, Math.round(p(safeguardId, "recharge", context) * (early ? 0.8 : 1.15))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_safeguard:windup", safeguardScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", early: config.ward === "early" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 3.2, geometry: "circle", style: "ward", color: 0x9FE8B0,
            label: config && config.ward === "early" ? "早守" : "深守" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const early = config.ward === "early";
            const duration = Math.max(90, Math.round(p(safeguardId, "wardTicks", action) * (early ? 0.75 : 1.25)));
            const radius = Math.max(1.5, p(safeguardId, "wardRadius", action) * (early ? 0.85 : 1.15));
            const motes = Math.max(1, Math.round(p(safeguardId, "motes", action) * (early ? 0.85 : 1.15)));
            MobEffects.apply(world, actor, safeguardEffect, duration, 0);
            world.effect(safeguardMark, actor, JSON.stringify({ motes: motes, radius: radius, duration: duration }), duration);
            const reached = safeguardAura(world, actor, radius, Math.max(60, Math.round(duration * 0.6)));
            sound(action, "minecraft:block.beacon.activate");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3.2));
                WorldFeedback.emit(world, safeguardScene, 1, body.position(),
                    { moment: "ward", target: String(actor.ref()), motes: motes, field: radius, scale: scale, intensity: scale }, 48);
                WorldFeedback.text(world, safeguardAbove(body.position()), safeguardWardText, [Math.round(duration / 20), reached], 46);
            }
            done(action);
        }
    });
}
