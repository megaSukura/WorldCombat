/**
 * 光墙 / lightscreen 的执行组织与结算。
 *
 * 核心念头：在身周张起一层柔光穹顶，特殊攻击穿进来时被这层光折暗；附带的效果也被滤淡一些。
 * 出手：短起手（windup 播聚光预告）后提交；只对自己施放，光幕以自身为锚跟随移动。
 * 命中：提交后给自己与半径内友方挂 world_combat:lightscreen_veil（身份 lightscreen），并在每个受护者身上留下
 *       world_combat:lightscreen_mark，写明削减份额、滤淡份额、光尘数与时长；施法者自己的标记每 20 刻补一圈。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次头顶与身侧的柔光。
 * 结算：特殊伤害在 NativeEffects.incomingRules 里读到受击者的标记，按 cut 削减，并把附带次要效果的几率按 damp 滤淡。
 * 结束：施法者的光幕走完或被人解除时，标记结束并收回半径内友方的光幕，整圈柔光同时收。
 */
namespace PokemonSkills {
    function lightscreenAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function lightscreenMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, lightscreenMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function lightscreenApply(world: CombatWorld, actor: CombatActor, ticks: number, data: any): boolean {
        if (MobEffects.apply(world, actor, lightscreenEffect, ticks, 0) === null) return false;
        const views = world.effects(actor, lightscreenMark);
        for (let i = 0; i < views.length; i++)
            if (world.operation(views[i].id(), "world_combat:refresh", JSON.stringify({ ticks: ticks }))) return true;
        world.effect(lightscreenMark, actor, JSON.stringify(data), ticks);
        return true;
    }
    function lightscreenCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number, data: any, includeSelf: boolean): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = 0;
        if (includeSelf) { if (lightscreenApply(world, caster, ticks, data)) reached++; }
        else MobEffects.apply(world, caster, lightscreenEffect, ticks, 0);
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (lightscreenApply(world, other, ticks, data)) reached++;
        }
        return reached;
    }
    function lightscreenClear(world: CombatWorld, caster: CombatActor, radius: number): void {
        const body = world.observe(caster);
        if (body === null) return;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            MobEffects.consume(world, other, lightscreenEffect);
            const views = world.effects(other, lightscreenMark);
            for (let j = 0; j < views.length; j++) world.operation(views[j].id(), "world_combat:dispel", "{}");
        }
    }

    WorldCombat.effect(lightscreenMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["cut", "damp", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid lightscreen mark: " + key);
        });
        if (value.radius <= 0 || value.motes <= 0) throw new Error("Invalid lightscreen mark extent");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(lightscreenMark, "start", function (effect) {
        if (String(effect.target().key()) === String(effect.source().key())) effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(lightscreenMark, "pulse", function (effect) {
        if (String(effect.target().key()) !== String(effect.source().key())) return;
        const world = effect.world(), caster = effect.source();
        if (world.observe(caster) === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        lightscreenCover(world, caster, Math.max(1, Number(state.radius) || 3), ticks, state, false);
        effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(lightscreenMark, "end", function (effect) {
        if (String(effect.target().key()) !== String(effect.source().key())) return;
        const world = effect.world(), caster = effect.source();
        const state = JSON.parse(effect.state());
        const body = world.observe(caster);
        if (body !== null) {
            const scale = Math.max(0.6, Math.min(2, (Number(state.radius) || 3) / 3));
            WorldFeedback.emit(world, lightscreenScene, 1, body.position(),
                { moment: "fade", target: String(caster.ref()), field: Number(state.radius) || 3, scale: scale }, 30);
        }
        lightscreenClear(world, caster, Math.max(1, Number(state.radius) || 3));
    });
    WorldCombat.effectHandler(lightscreenMark, "operation:world_combat:refresh", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const ticks = JSON.parse(effect.input()).ticks;
        if (typeof ticks !== "number" || !isFinite(ticks) || ticks < 1 || ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.remaining(Math.max(1, Math.min(1200, Math.round(ticks))));
    });
    WorldCombat.effectHandler(lightscreenMark, "operation:world_combat:dispel", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
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
        if (!world.valid(actor)) return;
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
        name: "光墙",
        description: "在身周张起一层柔光穹顶，罩住自己与身边的队友；期间受到的特殊伤害被削掉一块，特殊招式附带的次要效果也被滤淡。光幕跟着施法者走，离开范围的人会失去这层保护。",
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
            const reached = lightscreenCover(world, actor, radius, duration, data, true);
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
