/**
 * 神秘守护 / safeguard — 执行组织与家族行为。
 *
 * 核心念头：一圈碧色守护光从施法者身上张开，罩住自己与身边的队友；一条异常状态落到谁头上之前，
 *   先在光罩上荡开一圈、被弹回去。它不加防、不加血，只让「异常状态」落不下来。
 *
 * 出手：短起手（windup 播聚光预告）后提交；只对自己施放，光罩以自身为锚跟随移动。
 * 归属：这份光罩是一枚以施法者为来源的标记效果（world_combat:safeguard_mark）。它每 20 刻按来源租约
 *       （StatusContributions）把同一份守护补给自己与半径内的友方；同一位受护者身上多个来源各记一份贡献。
 * 命中：受护者带共享身份 world_combat:status/safeguard 的真实 MobEffect；来源租约决定它何时真的消失。
 * 进入：队友被这一份来源首次覆盖时亮一次从施法者到他的连线，画出现在发生的覆盖。
 * 离圈：离开半径的队友不再被这份来源续期，按这份贡献的剩余时长维持一小段；别的来源仍在就继续罩着。
 * 结束：这份标记走完或被解除时只撤自己名下、仍在范围内的贡献；最后一个来源退出，整圈光才真正收拢。
 * 守护：带 safeguard 身份的活体上，经共享状态路由（CombatStatus.inflict／招式次要状态）落下的异常
 *       在 CombatStatus.gate 上被拒绝并播放「守护弹开这一条」；已有异常不会被这条路线解除。
 * 反制：只挡异常状态，挡不住伤害、能力下降与控制；清除类效果能整片解掉；多来源分别结算、互不误删。
 */
namespace PokemonSkills {
    StatusContributions.define(safeguardEffect);

    function safeguardAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 任意受护者的来源载荷：光点数、半径、时长；供守护闪光与持续画面读取。 */
    function safeguardPayloadOf(world: CombatWorld, actor: CombatActor): any {
        const list = StatusContributions.list(world, actor, safeguardEffect);
        return list.length ? list[0].payload : null;
    }
    function safeguardMotes(payload: any): number { return payload ? Math.max(6, Math.round(Number(payload.motes) || 22)) : 22; }

    /**
     * 按来源租约把这份守护补给自己与半径内的友方；每份贡献只归当前施法者标记所有。
     * 施法者自己跟标记走满，队友领一段短续期，走出半径很快就能看见这一份余效走完。
     * 首次成功覆盖的新队友亮一次从施法者到他的连线。
     */
    function safeguardCover(effect: CombatEffect): number {
        const world = effect.world(), caster = effect.source(), data = JSON.parse(effect.state()), body = world.observe(caster);
        if (body === null) return 0;
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        const radius = Math.max(1, Number(data.radius) || 3.2);
        const owner = { id: effect.id(), definition: safeguardMark, target: String(caster.ref()) };
        const token = String(effect.id());
        const renewal = Math.max(40, Math.round(ticks * 0.6));
        let reached = StatusContributions.upsert(world, caster, safeguardEffect, token, data, ticks, { owner: owner }) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            const known = StatusContributions.list(world, other, safeguardEffect).some(function (entry) { return entry.token === token; });
            if (!StatusContributions.upsert(world, other, safeguardEffect, token, data, renewal, { owner: owner })) continue;
            reached++;
            if (known) continue;
            const otherBody = world.observe(other);
            if (otherBody === null) continue;
            WorldFeedback.emit(world, safeguardScene, 1, otherBody.position(),
                { moment: "entry", target: String(other.ref()), from: String(caster.ref()),
                    path: ["source", String(other.ref())], motes: Math.max(6, Math.round((Number(data.motes) || 22) * 0.5)) }, 20);
        }
        data.reached = reached; effect.state(JSON.stringify(data));
        return reached;
    }
    /** 同一施法者重复张罩只刷新自己的标记与贡献，不叠加。 */
    function safeguardOpen(world: CombatWorld, caster: CombatActor, ticks: number, data: any): number {
        const roots = world.effects(caster, safeguardMark).filter(view => String(view.source().key()) === String(caster.key()));
        let id: number;
        if (roots.length) {
            id = roots[0].id();
            world.operation(id, "world_combat:refresh", JSON.stringify({ ticks: ticks, data: data }));
        } else id = world.effect(safeguardMark, caster, JSON.stringify(data), ticks);
        const root = world.effects(caster, safeguardMark).filter(view => view.id() === id)[0];
        return root ? Number(JSON.parse(String(root.data())).reached) || 0 : 0;
    }
    WorldCombat.effect(safeguardMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "radius", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid safeguard mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(safeguardMark, "start", function (effect) {
        safeguardCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(safeguardMark, "pulse", function (effect) {
        const world = effect.world(), caster = effect.source();
        // 施法者自己的守护走完或被人解除后，这份来源不再有载体，标记随之收场。
        if (world.observe(caster) === null || StatusContributions.list(world, caster, safeguardEffect).length === 0) { effect.end(); return; }
        safeguardCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(safeguardMark, "end", function (effect) {
        const world = effect.world(), caster = effect.source(), state = JSON.parse(effect.state());
        // 只撤这份标记自己名下的贡献；其他施法者的守护仍在，载体不会消失。
        StatusContributions.removeSource(world, safeguardEffect, String(effect.id()));
        const body = world.observe(caster);
        if (body === null) return;
        WorldFeedback.emit(world, safeguardScene, 1, body.position(),
            { moment: "fade", target: String(caster.ref()), field: state.radius,
                scale: Math.max(0.6, Math.min(2, state.radius / 3.2)) }, 30);
    });
    WorldCombat.effectHandler(safeguardMark, "operation:world_combat:refresh", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const input = JSON.parse(effect.input());
        if (typeof input.ticks !== "number" || !isFinite(input.ticks) || input.ticks < 1 || input.ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.state(JSON.stringify(input.data)); effect.remaining(Math.min(1200, input.ticks)); safeguardCover(effect);
    });
    WorldCombat.effectHandler(safeguardMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });

    // 守护的兑现点：带守护身份的活体上，任何经共享状态路由落下的异常都在这里被拒绝。
    // 只问「有没有这个身份」，谁施加的、用哪个效果都不影响；带身份的活体一律挡下，并当场播「守护弹开」。
    // 已有的异常不会被这条路线碰到，因此不会出现「守护治好了某条异常」的假象。
    // 本项目的增益类护罩（白雾、幸运咒语等）走 MobEffects.apply 直接落效果，不经过这条路由，不会被误挡。
    CombatStatus.gate.define({ id: "world_combat:move_safeguard/ward", apply: function (context) {
        if (!context.allowed || !context.harmful) return;
        if (!CombatStatus.has(context.world, context.actor, safeguardStatus)) return;
        context.allowed = false; context.reason = "safeguard";
        const world = context.world, actor = context.actor, body = world.observe(actor);
        if (body === null) return;
        const payload = safeguardPayloadOf(world, actor);
        WorldFeedback.emit(world, safeguardScene, 1, body.position(),
            { moment: "guard", target: String(actor.ref()), motes: safeguardMotes(payload),
                field: payload ? Number(payload.radius) || 3.2 : 3.2, status: CombatStatus.normalize(context.name) }, 24);
        WorldFeedback.text(world, safeguardAbove(body.position()), safeguardGuardText, [], 24);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 12, "{}");
    } });

    // 守护存续：每个受护者身上续一层淡环；施法者另外沿实际半径续一圈稀疏边界，标出保护范围。
    // 持续画面交给载体 manager 自己拥有：驱散、余效走完或自然到期都会随其实例清理。
    WorldCombat.on("world_combat:move_safeguard/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== safeguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const ref = String(actor.ref()), payload = safeguardPayloadOf(world, actor);
        const field = payload ? Math.max(1, Number(payload.radius) || 3.2) : 3.2;
        const scale = Math.max(0.6, Math.min(2, field / 3.2));
        StatusContributions.present(world, actor, safeguardEffect, "world_combat:move_safeguard/veiled/" + ref, safeguardScene, 1,
            body.position(), { moment: "warded", target: ref, motes: safeguardMotes(payload), field: field, scale: scale });
        const anchoring = world.effects(actor, safeguardMark).some(function (view) { return String(view.source().key()) === ref; });
        if (anchoring) StatusContributions.present(world, actor, safeguardEffect, "world_combat:move_safeguard/boundary/" + ref, safeguardScene, 1,
            body.position(), { moment: "boundary", target: ref, motes: safeguardMotes(payload), field: field });
    });

    // 守护从某人身上消失：施法者自己丢守护就结束它的来源标记（收回这份贡献）；
    // 队友丢守护只剩一圈余效散开的波纹——那是这一份来源退出。
    WorldCombat.on("world_combat:move_safeguard/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== safeguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, safeguardEffect) !== null) return;
        const ref = String(actor.ref()), views = world.effects(actor, safeguardMark);
        let anchor = false;
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().key()) === ref) { anchor = true; world.operation(views[i].id(), "world_combat:dispel", "{}"); }
        }
        if (anchor) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, safeguardScene, 1, body.position(), { moment: "lose", target: ref }, 18);
    });

    define({
        id: safeguardId,
        cooldownParameter: "recharge",
        name: "神秘守护",
        description: "张开随自己移动的守护光，为自己和附近队友抵挡新施加的有害异常。守护以施法者为锚补给自己与走进范围的队友；离开范围后按各自剩余的守护时间短暂保留。多个神秘守护各自维持，一个结束不会撤掉另一个。",
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
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[safeguardId], detail: { values: config } };
            const early = config && config.ward === "early";
            const radius = Math.max(1.5, p(safeguardId, "wardRadius", context) * (early ? 0.85 : 1.15));
            return { radius: radius, geometry: "circle", style: "ward", color: 0x9FE8B0,
                label: early ? "早守" : "深守" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const early = config.ward === "early";
            const duration = Math.max(90, Math.round(p(safeguardId, "wardTicks", action) * (early ? 0.75 : 1.25)));
            const radius = Math.max(1.5, p(safeguardId, "wardRadius", action) * (early ? 0.85 : 1.15));
            const motes = Math.max(1, Math.round(p(safeguardId, "motes", action) * (early ? 0.85 : 1.15)));
            const reached = safeguardOpen(world, actor, duration, { motes: motes, radius: radius, duration: duration });
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
