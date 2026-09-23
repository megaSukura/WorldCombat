/**
 * 幸运咒语 / luckychant — 执行组织与家族行为。
 *
 * 核心念头：仰头向天唱一句咒语，天光应声罩住自己与身边的队友；落在他们身上的攻击再准，也打不出要害。
 *   它不加防不加血，只是在对手以为要命中要害的那一刻，让那一下平下来。
 *
 * 出手：短起手（windup 播仰头聚星预告）后提交；只对自己施放，天光以自身为锚跟随移动。
 * 命中：提交后给自己挂 world_combat:luckychant_ward（身份 luckychant），并把星光、半径、时长写进
 *       world_combat:luckychant_mark；标记每 20 刻把同一份祝福补给半径内的友方（施法者始终在内）。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次头顶星光。
 * 守护：带 luckychant 身份的活体被暴击那一刻，本单元的入场伤害规则把暴击抚平——暴击标记抹掉、
 *       伤害去掉暴击倍率，并当场播放星光拨开的一下。
 * 结束：施法者的祝福走完或被人解除时，标记一并结束并收回半径内友方身上的祝福，整圈天光同时收。
 * 反制：只挡暴击，挡不住普通伤害与控制；离开天光的人随补给停止而失去；清除类效果能把祝福整片解掉。
 */
namespace PokemonSkills {
    function luckychantAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function luckychantMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, luckychantMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function luckychantAura(world: CombatWorld, caster: CombatActor, radius: number, ticks: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = MobEffects.apply(world, caster, luckychantEffect, ticks, 0) !== null ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (MobEffects.apply(world, other, luckychantEffect, ticks, 0) !== null) reached++;
        }
        return reached;
    }

    WorldCombat.effect(luckychantMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "radius", "duration"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid luckychant mark: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(luckychantMark, "start", function (effect) { effect.schedule("aura", "aura", 4, "{}"); });
    WorldCombat.effectHandler(luckychantMark, "aura", function (effect) {
        const world = effect.world(), caster = effect.target(), state = JSON.parse(effect.state());
        if (world.observe(caster) === null) { effect.end(); return; }
        const radius = Math.max(1, Number(state.radius) || 3.5);
        const ticks = Math.max(60, Math.round((Number(state.duration) || 260) * 0.6));
        luckychantAura(world, caster, radius, ticks);
        effect.schedule("aura", "aura", 20, "{}");
    });
    WorldCombat.effectHandler(luckychantMark, "end", function (effect) {
        const world = effect.world(), caster = effect.target();
        if (world.observe(caster) === null) return;
        const state = JSON.parse(effect.state());
        const radius = Math.max(1, Number(state.radius) || 3.5);
        const body = world.observe(caster);
        if (body === null) return;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            MobEffects.consume(world, other, luckychantEffect);
        }
    });
    WorldCombat.effectHandler(luckychantMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 天光的兑现点：带祝福的活体被暴击时，把那一下平回普通伤害，抹掉暴击标记。
    NativeEffects.incomingRules.define({ id: "world_combat:move_luckychant/ward", apply: function (hit) {
        const data = hit.data;
        if (!data || !data.critical || !(data.amount > 0) || data.bypassesInvulnerability) return;
        const world = hit.world, holder = hit.target;
        if (!world.valid(holder) || !CombatStatus.has(world, holder, luckychantStatus)) return;
        const body = world.observe(holder);
        const before = data.amount;
        data.critical = false;
        data.criticalChance = 0;
        data.amount = before / PokemonDamage.multipliers.critical;
        if (body === null) return;
        const mark = luckychantMarkOf(world, holder);
        const motes = mark ? Math.max(6, Math.round(Number(mark.motes) || 24)) : 20;
        const saved = Math.round((before - data.amount) * 10) / 10;
        WorldFeedback.emit(world, luckychantScene, 1, body.position(),
            { moment: "guard", target: String(holder.ref()), motes: motes, saved: saved }, 26);
        WorldFeedback.text(world, luckychantAbove(body.position()), luckychantGuardText, [saved], 28);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 12, "{}");
    } });

    // 祝福存续期：每 20 刻续一次头顶星光，低密度、慢节奏，让出目标本体视线。
    WorldCombat.on("world_combat:move_luckychant/ward", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== luckychantEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = luckychantMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_luckychant/ward/" + String(actor.ref()), luckychantScene, 1, body.position(),
            { moment: "warded", target: String(actor.ref()), motes: mark ? mark.motes : 20,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3.5)) : 1 }, 40);
    });

    // 收束：施法者的祝福走到尽头或被人解除时，标记结束并收回友方身上的祝福，整圈天光同时收。
    WorldCombat.on("world_combat:move_luckychant/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== luckychantEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const mark = luckychantMarkOf(world, actor);
        if (mark !== null) {
            const views = world.effects(actor, luckychantMark);
            if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, luckychantScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()), field: mark ? mark.radius : 3.5, expired: expired ? 1 : 0,
                scale: mark ? Math.max(0.6, Math.min(2, mark.radius / 3.5)) : 1 }, 30);
        if (expired) WorldFeedback.text(world, luckychantAbove(body.position()), luckychantFadeText, [], 30);
    });

    define({
        id: luckychantId,
        cooldownParameter: "recharge",
        name: "幸运咒语",
        description: "向天唱咒，让天光罩住自己与身边的队友；期间落在他们身上的攻击不会被命中要害。天光跟着施法者走，离开范围的人会失去祝福。",
        uses: ["挡住依赖要害暴击的高输出", "护住队伍的软肋与残血成员", "在对方连击前先唱好"],
        kind: "self",
        range: 1,
        prepare: 13,
        active: 1,
        recover: 8,
        cooldown: 170,
        style: "chant",
        defaults: { wish: "deep" },
        fields: [
            choice("wish", "许愿方式", ["early", "deep"], ["早愿", "深愿"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[luckychantId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const early = config.wish === "early";
            return {
                prepare: Math.max(5, Math.round(p(luckychantId, "tempo", context)) + (early ? -3 : 3)),
                recover: Math.round(p(luckychantId, "aftercast", context)),
                cooldown: Math.max(70, Math.round(p(luckychantId, "recharge", context) * (early ? 0.85 : 1.15))),
                range: 1,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_luckychant:windup", luckychantScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", early: config.wish === "early" ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) { return { radius: 3.5, geometry: "circle", style: "chant", color: 0xFFD26E,
            label: config && config.wish === "early" ? "早愿" : "深愿" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const early = config.wish === "early";
            const duration = Math.max(90, Math.round(p(luckychantId, "chantTicks", action) * (early ? 0.7 : 1.3)));
            const radius = Math.max(1.5, p(luckychantId, "chantRadius", action) * (early ? 0.85 : 1.2));
            const motes = Math.max(1, Math.round(p(luckychantId, "motes", action)));
            MobEffects.apply(world, actor, luckychantEffect, duration, 0);
            world.effect(luckychantMark, actor, JSON.stringify({ motes: motes, radius: radius, duration: duration }), duration);
            const reached = luckychantAura(world, actor, radius, Math.max(60, Math.round(duration * 0.6)));
            sound(action, "minecraft:block.note_block.chime");
            world.sound("minecraft:block.bell.use", body === null ? action.origin() : body.position(), 14, "{}");
            if (body !== null) {
                const scale = Math.max(0.6, Math.min(2, radius / 3.5));
                WorldFeedback.emit(world, luckychantScene, 1, body.position(),
                    { moment: "chant", target: String(actor.ref()), motes: motes, field: radius, scale: scale, intensity: scale }, 48);
                WorldFeedback.text(world, luckychantAbove(body.position()), luckychantChantText, [Math.round(duration / 20), reached], 46);
            }
            done(action);
        }
    });
}
