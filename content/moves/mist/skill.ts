/**
 * 白雾 / mist — 执行组织与家族行为。
 *
 * 核心念头：一口白雾从身上漫开，罩住自己与身边的队友；雾里谁的能力都不会被压下去。
 *   它不加防不加血，在能力变化写入前拦下要降低的等级。
 *
 * 出手：短起手（windup 播吐雾预告）后提交；只对自己施放，雾以自身为锚跟随移动。
 * 归属：这份雾是一枚以施法者为来源的标记效果（world_combat:mist_mark）。它每 20 刻按来源租约
 *       （StatusContributions）把同一份雾补给自己与半径内的友方；同一位受护者身上的多个来源各记一份贡献。
 * 命中：受护者带共享身份 world_combat:status/mist 的真实 MobEffect；来源租约决定它何时真的消失。
 * 离圈：离开半径的队友不再被这份来源续期，短续期走完即失去这一份保护；别的来源仍在就继续罩着。
 * 结束：这份标记走完或被解除时，只撤自己这一份贡献；最后一个来源退出，整片雾才真正散开。
 * 守护：带 mist 身份的活体在能力降低写入前由共享变化规则拦截，并播放「雾吞掉这一降」。
 * 反制：雾只挡「降低」，挡不住伤害与控制；清除类效果能解掉它；多来源分别结算、互不误删。
 */
namespace PokemonSkills {
    StatusContributions.define(mistEffect);

    function mistAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 任意受雾者的来源载荷：浓度、半径、时长；供持续与吞降画面读取。 */
    function mistPayloadOf(world: CombatWorld, actor: CombatActor): any {
        const list = StatusContributions.list(world, actor, mistEffect);
        return list.length ? list[0].payload : null;
    }
    var mistBlocked: { [ref: string]: number } = Object.create(null);
    var mistGuardAt: { [ref: string]: number } = Object.create(null);

    /** 按来源租约把这份雾补给自己与半径内的友方；每份贡献只归当前施法者标记所有。 */
    function mistCover(effect: CombatEffect): number {
        const world = effect.world(), caster = effect.source(), data = JSON.parse(effect.state()), body = world.observe(caster);
        if (body === null) return 0;
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        const radius = Math.max(1, Number(data.radius) || 3);
        const owner = { id: effect.id(), definition: mistMark, target: String(caster.ref()) };
        const token = String(effect.id());
        // 施法者自己跟着标记走满，队友按短续期维持，走出圈很快就能看见失雾。
        const renewal = Math.max(40, Math.round(ticks * 0.25));
        let reached = StatusContributions.upsert(world, caster, mistEffect, token, data, ticks, { owner: owner }) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (StatusContributions.upsert(world, other, mistEffect, token, data, renewal, { owner: owner })) reached++;
        }
        data.reached = reached; effect.state(JSON.stringify(data));
        return reached;
    }
    /** 同一施法者重复张雾只刷新自己的标记与贡献，不叠加。 */
    function mistOpen(world: CombatWorld, caster: CombatActor, ticks: number, data: any): number {
        const roots = world.effects(caster, mistMark).filter(view => String(view.source().key()) === String(caster.key()));
        let id: number;
        if (roots.length) {
            id = roots[0].id();
            world.operation(id, "world_combat:refresh", JSON.stringify({ ticks: ticks, data: data }));
        } else id = world.effect(mistMark, caster, JSON.stringify(data), ticks);
        const root = world.effects(caster, mistMark).filter(view => view.id() === id)[0];
        return root ? Number(JSON.parse(String(root.data())).reached) || 0 : 0;
    }
    WorldCombat.effect(mistMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["density", "radius", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid mist mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mistMark, "start", function (effect) {
        mistCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(mistMark, "pulse", function (effect) {
        const world = effect.world(), caster = effect.source();
        // 施法者自己的雾被牛奶／/effect clear 除掉后，这份来源不再有载体，标记随之收场。
        if (world.observe(caster) === null || StatusContributions.list(world, caster, mistEffect).length === 0) { effect.end(); return; }
        mistCover(effect); effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(mistMark, "end", function (effect) {
        const world = effect.world(), caster = effect.source(), state = JSON.parse(effect.state());
        // 只撤这份标记自己名下的贡献；其他来源仍在，载体就不会消失。
        StatusContributions.removeSource(world, mistEffect, String(effect.id()));
        const body = world.observe(caster);
        if (body === null) return;
        WorldFeedback.emit(world, mistScene, 1, body.position(),
            { moment: "fade", target: String(caster.ref()), field: state.radius,
                scale: Math.max(0.6, Math.min(2, state.radius / 3)) }, 30);
    });
    WorldCombat.effectHandler(mistMark, "operation:world_combat:refresh", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const input = JSON.parse(effect.input());
        if (typeof input.ticks !== "number" || !isFinite(input.ticks) || input.ticks < 1 || input.ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.state(JSON.stringify(input.data)); effect.remaining(Math.min(1200, input.ticks)); mistCover(effect);
    });
    WorldCombat.effectHandler(mistMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });

    // 在能力变化写入前拦下负面变化；窗口自然结束沿用自己的生命周期。
    CombatStages.change.define({ id: "world_combat:move_mist/guard", apply: function (change) {
        if (!(change.amount < 0) || change.options.ignoreAbility || !CombatStatus.has(change.world, change.actor, "mist")) return;
        change.allowed = false;
        const ref = String(change.actor.ref());
        mistBlocked[ref] = (mistBlocked[ref] || 0) + Math.abs(change.amount);
    } });
    WorldCombat.on("world_combat:move_mist/held", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mistEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref()), absorbed = mistBlocked[ref] || 0;
        const now2 = world.tick();
        if (absorbed > 0 && now2 - (mistGuardAt[ref] || -1000) >= 10) {
            mistGuardAt[ref] = now2; delete mistBlocked[ref];
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, mistScene, 1, body.position(),
                { moment: "guard", target: ref, absorbed: absorbed, motes: Math.max(6, Math.round(absorbed * 6 + 10)) }, 24);
            WorldFeedback.text(world, mistAbove(body.position()), mistGuardText, [absorbed], 26);
            world.sound("cobblemon:move.mist.actor", body.position(), 12, "{}");
        }
        // 身体环绕：每 20 刻续一次，低密度贴在身侧，让出目标本体视线。
        if (now2 % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const payload = mistPayloadOf(world, actor);
        // 持续画面交给载体 manager 自己拥有：驱散或自然到期随其实例清理，同 key 更新不重置 clock。
        StatusContributions.present(world, actor, mistEffect, "world_combat:move_mist/veiled/" + ref, mistScene, 1,
            body.position(), { moment: "veiled", target: ref, density: payload ? payload.density : 24,
                scale: payload ? Math.max(0.6, Math.min(2, payload.radius / 3)) : 1 });
    });

    // 雾从某人身上消失：施法者自己丢雾就结束它的来源标记（收回这份贡献）；
    // 队友丢雾只剩一小股雾团——那是这一份来源退出，别人的来源还在时不会整片散。
    WorldCombat.on("world_combat:move_mist/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mistEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, mistEffect) !== null) return;
        const views = world.effects(actor, mistMark);
        let anchor = false;
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().key()) === String(views[i].target().key())) {
                anchor = true;
                world.operation(views[i].id(), "world_combat:dispel", "{}");
            }
        }
        if (anchor) return;
        delete mistBlocked[String(actor.ref())]; delete mistGuardAt[String(actor.ref())];
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mistScene, 1, body.position(), { moment: "lose", target: String(actor.ref()) }, 18);
    });

    define({
        id: mistId,
        cooldownParameter: "recharge",
        name: "白雾",
        description: "用白雾覆盖身体与身边的队友；雾里谁的能力等级都不会被对手压低。雾跟着施法者走，离开范围的人会失去这层保护；多个白雾来源各自维持，一个结束不会撤掉另一个。",
        uses: ["挡住成片的降防、降攻、降速", "护住正在蓄力或布置的队友", "在对方准备削弱前先一步张雾"],
        kind: "self",
        range: 1,
        prepare: 11,
        active: 1,
        recover: 7,
        cooldown: 150,
        style: "mist",
        defaults: { veil: "dense" },
        fields: [
            choice("veil", "白雾形态", ["dense", "thin"], ["浓雾", "薄雾"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const dense = config.veil !== "thin";
            return {
                prepare: Math.max(4, Math.round(p(mistId, "tempo", context)) + (dense ? 3 : -2)),
                recover: Math.round(p(mistId, "aftercast", context)),
                cooldown: Math.max(60, Math.round(p(mistId, "recharge", context) * (dense ? 1.15 : 0.8))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_mist:windup", mistScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config.veil !== "thin" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 3, geometry: "circle", style: "mist", color: 0xBFE6F0,
            label: config && config.veil === "thin" ? "薄雾" : "浓雾" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const dense = config.veil !== "thin";
            const duration = Math.max(80, Math.round(p(mistId, "mistTicks", action) * (dense ? 1.2 : 0.75)));
            const radius = Math.max(1.5, p(mistId, "veilRadius", action) * (dense ? 1.25 : 0.75));
            const density = Math.max(1, Math.round(p(mistId, "density", action) * (dense ? 1.3 : 0.85)));
            const data = { density: density, radius: radius, duration: duration };
            const reached = mistOpen(world, actor, duration, data);
            sound(action, "cobblemon:move.mist.actor");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3));
                WorldFeedback.emit(world, mistScene, 1, body.position(),
                    { moment: "veil", target: String(actor.ref()), density: density, field: radius, scale: scale, intensity: scale }, 46);
                WorldFeedback.text(world, mistAbove(body.position()), mistVeilText, [Math.round(duration / 20), reached], 44);
            }
            done(action);
        }
    });
}
