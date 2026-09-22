/**
 * 白雾 / mist — 执行组织与家族行为。
 *
 * 核心念头：一口白雾从身上漫开，罩住自己与身边的队友；雾里谁的能力都不会被压下去。
 *   它不加防不加血，只是在几条要被压低的状态落下的下一刻，把它们从身上吞掉。
 *
 * 出手：短起手（windup 播吐雾预告）后提交；只对自己施放，雾以自身为锚跟随移动。
 * 命中：提交后给自己挂 world_combat:mist_veil（身份 mist），并把浓度、半径、时长写进 world_combat:mist_mark；
 *       标记每 20 刻把同一份雾补给半径内的友方（施法者始终在内）。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次环绕身体与雾圈的画面。
 * 守护：带 mist 身份的活体每次能力等级下降时被本单元的 tick 守卫在下一拍还原，并播放「雾吞掉这一降」。
 * 结束：施法者的雾走完或被人解除时，标记一并结束并收回半径内友方身上的雾，整圈雾同时散开。
 * 反制：雾只挡「降低」，挡不住伤害与控制；离开雾圈的人随补给停止而失去；清除类效果能把雾整片解掉。
 */
namespace PokemonSkills {
    function mistAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function mistMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, mistMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function mistStages(world: CombatWorld, actor: CombatActor): { [stat: string]: number } {
        if (String(actor.domain()) === "cobblemon") return NativeEffects.read(world, actor).stages;
        return CombatStages.read(world, actor);
    }
    function mistCopy(stages: { [stat: string]: number }): { [stat: string]: number } {
        const value: { [stat: string]: number } = {};
        for (let i = 0; i < mistStats.length; i++) value[mistStats[i]] = Number(stages[mistStats[i]]) || 0;
        return value;
    }
    var mistWatch: { [ref: string]: { [stat: string]: number } } = Object.create(null);
    var mistGuardAt: { [ref: string]: number } = Object.create(null);

    function mistAura(world: CombatWorld, caster: CombatActor, radius: number, ticks: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = MobEffects.apply(world, caster, mistEffect, ticks, 0) !== null ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (MobEffects.apply(world, other, mistEffect, ticks, 0) !== null) reached++;
        }
        return reached;
    }

    WorldCombat.effect(mistMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["density", "radius", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid mist mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mistMark, "start", function (effect) { effect.schedule("aura", "aura", 4, "{}"); });
    WorldCombat.effectHandler(mistMark, "aura", function (effect) {
        const world = effect.world(), caster = effect.target(), state = JSON.parse(effect.state());
        if (world.observe(caster) === null) { effect.end(); return; }
        const radius = Math.max(1, Number(state.radius) || 3);
        const ticks = Math.max(60, Math.round((Number(state.duration) || 240) * 0.6));
        mistAura(world, caster, radius, ticks);
        effect.schedule("aura", "aura", 20, "{}");
    });
    WorldCombat.effectHandler(mistMark, "end", function (effect) {
        const world = effect.world(), caster = effect.target();
        if (world.observe(caster) === null) return;
        const state = JSON.parse(effect.state());
        const radius = Math.max(1, Number(state.radius) || 3);
        const body = world.observe(caster);
        if (body === null) return;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) !== String(caster.key()) && !world.friendly(other)) continue;
            if (String(other.key()) === String(caster.key())) continue;
            MobEffects.consume(world, other, mistEffect);
        }
    });
    WorldCombat.effectHandler(mistMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 守护与画面：带雾的活体每 tick 检查一次能力等级；出现下降就还原，并当场播「雾吞掉这一降」。
    // 只读共享身份雾是否还在，生产方是谁都不影响；宝可梦走原生等级，其他生物走公共能力阶梯。
    WorldCombat.on("world_combat:move_mist/guard", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mistEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref()), current = mistStages(world, actor), previous = mistWatch[ref];
        if (!previous) { mistWatch[ref] = mistCopy(current); return; }
        let absorbed = 0;
        for (let i = 0; i < mistStats.length; i++) {
            const stat = mistStats[i], was = Number(previous[stat]) || 0, now = Number(current[stat]) || 0;
            if (now >= was) { previous[stat] = now; continue; }
            if (String(actor.domain()) === "cobblemon") {
                const state = NativeEffects.read(world, actor); state.stages[stat] = was; NativeEffects.write(world, actor, state);
            } else CombatStages.boost(world, actor, stat, was - now);
            previous[stat] = was; absorbed += was - now;
        }
        const now2 = world.tick();
        if (absorbed > 0 && now2 - (mistGuardAt[ref] || -1000) >= 10) {
            mistGuardAt[ref] = now2;
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
        const mark = mistMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_mist/veiled/" + ref, mistScene, 1, body.position(),
            { moment: "veiled", target: ref, density: mark ? mark.density : 24, scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3)) : 1 }, 40);
    });

    // 雾散：施法者的雾走到尽头或被人解除时，标记结束并收回友方身上的雾，整圈同时散开。
    WorldCombat.on("world_combat:move_mist/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mistEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref());
        delete mistWatch[ref]; delete mistGuardAt[ref];
        const expired = String(data.cause) === "expired";
        const mark = mistMarkOf(world, actor);
        if (mark !== null) {
            const views = world.effects(actor, mistMark);
            if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, mistScene, 1, body.position(),
            { moment: "fade", target: ref, field: mark ? mark.radius : 3, expired: expired ? 1 : 0,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3)) : 1 }, 30);
        if (expired) WorldFeedback.text(world, mistAbove(body.position()), mistFadeText, [], 30);
    });

    define({
        id: mistId,
        name: "白雾",
        description: "用白雾覆盖身体与身边的队友；雾里谁的能力等级都不会被对手压低。雾跟着施法者走，离开范围的人会失去这层保护。",
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
            MobEffects.apply(world, actor, mistEffect, duration, 0);
            world.effect(mistMark, actor, JSON.stringify({ density: density, radius: radius, duration: duration }), duration);
            const reached = mistAura(world, actor, radius, Math.max(60, Math.round(duration * 0.6)));
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
