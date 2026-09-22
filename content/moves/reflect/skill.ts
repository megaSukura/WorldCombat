/**
 * 反射壁 / reflect 的执行组织与结算。
 *
 * 核心念头：在身侧立起一圈由硬光板拼成的壁，物理的打击撞在板上被削掉一块；镜面形态还把削下的那份弹回近身者。
 * 出手：短起手（windup 播聚板预告）后提交；只对自己施放，壁以自身为锚跟随移动。
 * 命中：提交后给自己与半径内友方挂 world_combat:reflect_plates（身份 reflect），并在每个受护者身上留下
 *       world_combat:reflect_mark，写明削减份额、反弹份额、板数与时长；施法者自己的标记每 20 刻把同一面壁补一圈。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次环绕身体的板影。
 * 结算：物理伤害在 NativeEffects.incomingRules 里读到受击者的标记，按 cut 削减；镜面形态下，近身物理被挡下的
 *       那份按 rebound 弹回敌对攻击者（带 reflected 标记，不会来回弹）。
 * 结束：施法者的壁走完或被人解除时，标记结束并收回半径内友方的壁，整圈硬光同时收。
 */
namespace PokemonSkills {
    function reflectAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function reflectMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, reflectMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function reflectApply(world: CombatWorld, actor: CombatActor, ticks: number, data: any): boolean {
        if (MobEffects.apply(world, actor, reflectEffect, ticks, 0) === null) return false;
        const views = world.effects(actor, reflectMark);
        for (let i = 0; i < views.length; i++)
            if (world.operation(views[i].id(), "world_combat:refresh", JSON.stringify({ ticks: ticks }))) return true;
        world.effect(reflectMark, actor, JSON.stringify(data), ticks);
        return true;
    }
    /** 给施法者与半径内友方补壁；includeSelf=false 时只刷新施法者自己的 MobEffect，避免在自己的标记回调里重入。 */
    function reflectCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number, data: any, includeSelf: boolean): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        let reached = 0;
        if (includeSelf) { if (reflectApply(world, caster, ticks, data)) reached++; }
        else MobEffects.apply(world, caster, reflectEffect, ticks, 0);
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            if (reflectApply(world, other, ticks, data)) reached++;
        }
        return reached;
    }
    function reflectClear(world: CombatWorld, caster: CombatActor, radius: number): void {
        const body = world.observe(caster);
        if (body === null) return;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other)) continue;
            MobEffects.consume(world, other, reflectEffect);
            const views = world.effects(other, reflectMark);
            for (let j = 0; j < views.length; j++) world.operation(views[j].id(), "world_combat:dispel", "{}");
        }
    }

    WorldCombat.effect(reflectMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["cut", "rebound", "radius", "plates"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid reflect mark: " + key);
        });
        if (value.radius <= 0 || value.plates <= 0) throw new Error("Invalid reflect mark extent");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(reflectMark, "start", function (effect) {
        if (String(effect.target().key()) === String(effect.source().key())) effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(reflectMark, "pulse", function (effect) {
        if (String(effect.target().key()) !== String(effect.source().key())) return;
        const world = effect.world(), caster = effect.source();
        if (world.observe(caster) === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        const ticks = Math.max(60, Math.min(1180, effect.remaining()));
        reflectCover(world, caster, Math.max(1, Number(state.radius) || 3), ticks, state, false);
        effect.schedule("pulse", "pulse", 20, "{}");
    });
    WorldCombat.effectHandler(reflectMark, "end", function (effect) {
        if (String(effect.target().key()) !== String(effect.source().key())) return;
        const world = effect.world(), caster = effect.source();
        const state = JSON.parse(effect.state());
        const body = world.observe(caster);
        if (body !== null) {
            const scale = Math.max(0.6, Math.min(2, (Number(state.radius) || 3) / 3));
            WorldFeedback.emit(world, reflectScene, 1, body.position(),
                { moment: "fade", target: String(caster.ref()), field: Number(state.radius) || 3, scale: scale }, 30);
        }
        reflectClear(world, caster, Math.max(1, Number(state.radius) || 3));
    });
    WorldCombat.effectHandler(reflectMark, "operation:world_combat:refresh", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const ticks = JSON.parse(effect.input()).ticks;
        if (typeof ticks !== "number" || !isFinite(ticks) || ticks < 1 || ticks % 1) { effect.reject("invalid-duration"); return; }
        effect.remaining(Math.max(1, Math.min(1200, Math.round(ticks))));
    });
    WorldCombat.effectHandler(reflectMark, "operation:world_combat:dispel", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });

    /** 物理结算点：受击者带着反射壁时削减物理伤害；镜面形态把挡下的部分弹回近身者。 */
    NativeEffects.incomingRules.define({ id: "world_combat:move_reflect/plates", apply: function (hit: NativeEffects.Hit) {
        const data = hit.data;
        if (!data || data.reflected || data.bypassesInvulnerability || !(data.amount > 0)) return;
        if (data.category !== "physical") return;
        const world = hit.world, target = hit.target;
        if (!world.valid(target)) return;
        const mark = reflectMarkOf(world, target);
        if (mark === null) return;
        const before = data.amount;
        const blocked = before * Math.max(0, Math.min(0.8, Number(mark.cut) || 0));
        data.amount = Math.max(0, before - blocked);
        const body = world.observe(target), source = hit.source;
        const hostile = !!source && world.valid(source) && String(source.key()) !== String(target.key()) && !world.friendly(source);
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
        world.hurt(source, back, JSON.stringify({ kind: "reflection", reflected: true, type: data.type || "" }));
        if (body !== null) {
            WorldFeedback.text(world, reflectAbove(body.position()), reflectReboundText, [Math.round(back * 10) / 10], 26);
            world.sound("minecraft:block.amethyst_block.hit", body.position(), 12, "{}");
        }
    } });

    // 壁散：施法者的壁到期或被人解除时，收回半径内友方的壁；整圈硬光同时收。
    WorldCombat.on("world_combat:move_reflect/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== reflectEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
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
            const reached = reflectCover(world, actor, radius, duration, data, true);
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
