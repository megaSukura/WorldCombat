/**
 * 定身法 / disable —— 执行组织与封锁策略。
 *
 * 核心念头：指出对手刚用过的那一手，把一枚钉别在它的招式表上——那一手在钉拔掉前使不出来。
 *
 * 三幕：起（windup，提交前）指尖聚起一枚定身钉，可打断、不花代价；击（提交后）钉沿直线扑到目标身上，
 *   点名它的上一手；持续（hold）钉一直钉在那手上，目标想再使出来就会被共享动作策略顶回；
 *   收（release 到期松开／break 被清除）。
 *
 * 与同族分开：无理取闹封的是「最近一次用过的同名招」，换个顺序就能绕开；定身法直接点名封住这一手本身，
 *   在钉松掉前无论用什么顺序都使不出。与再来一次分开：再来一次逼对手只重复那一手，定身法是要它换招。
 * 反制：目标没出过手、或上一手太老时这一钉落空；被点名后换一手不在名单里的招照样能打。
 */
namespace PokemonSkills {
    /** 机读旁挂：记下被点名的招式、时限与画面要用的数。 */
    WorldCombat.effect(disableMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.move !== "string" || !value.move) throw new Error("Invalid disable move");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid disable window");
        if (typeof value.caster !== "string") throw new Error("Invalid disable source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(disableMark, "start", function () { });
    WorldCombat.effectHandler(disableMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function disableData(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, disableMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function disableReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, disableMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    /** 目标当前是否还拥有某一手（含临时层）；不再拥有时这一钉提前松开。 */
    function disableKnows(world: CombatWorld, actor: CombatActor, id: string): boolean {
        if (String(actor.domain()) !== "cobblemon") return true;
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            if ((layers.moves && layers.moves[String(slot)] || String(move.id())) === id) return true;
        }
        return false;
    }

    // 封锁：带着定身身份的活体，在提交被点名的那一手时被顶回去。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    CombatStatus.actions.define({ id: "world_combat:move_disable/policy", apply: function (context) {
        if (!context.move || typeof context.move.id !== "function") return;
        if (!CombatStatus.has(context.world, context.actor, disableStatus)) return;
        const data = disableData(context.world, context.actor);
        if (data === null || !data.move) return;
        if (String(context.move.id()) === String(data.move)) context.blocked.disabled = true;
    } });

    // 被判回的那一下要看得见：在真正的封锁之前放一段「被钉住」的画面与浮字。
    WorldCombat.on("world_combat:move_disable/block", "world_combat:before_commit", "", function (event) {
        const world = event.world(), actor = event.actor(), action = event.action();
        if (action === null || String(actor.domain()) !== "cobblemon") return;
        if (!CombatStatus.has(world, actor, disableStatus)) return;
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const data = disableData(world, actor);
        if (data === null || String(data.move) !== String(executing.id())) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, disableScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), nails: data.nails || 5 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), disableLockText,
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 26);
    });

    define({
        id: disableId,
        cooldownParameter: "recharge",
        name: "定身法",
        description: "向对手送出一枚定身钉，钉住它刚用过的那一手；在钉松开前，那一手无法使用，换别的招照样能打。目标没出过手或上一手太老时落空。",
        uses: ["封住对手的主力输出招", "拆掉刚露出的强攻手段", "逼对手换招、打乱它的连招"],
        kind: "enemy",
        range: 8,
        maxRange: 20,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 120,
        style: "pin",
        defaults: { heavy: false, ai: { maxChase: 14, leaveStation: false } },
        fields: [
            flag("heavy", "重钉")
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(disableId, "reach", pokemon) : 8, geometry: "line", style: "pin",
                color: 0xE8C15A, label: config && config.heavy === true ? "定身法·重钉" : "定身法·轻钉" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[disableId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const heavy = !!(config && config.heavy);
            return {
                prepare: p(disableId, "tempo", context),
                recover: p(disableId, "aftercast", context),
                cooldown: Math.round(p(disableId, "recharge", context) * (heavy ? 1.15 : 0.85)),
                active: 0,
                range: p(disableId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(target.domain()) !== "cobblemon") return "no-move";
            const last = NativeEffects.lastMove(world, target);
            if (last === null || String(last.id) === "struggle") return "no-move";
            if (world.tick() - (last.tick || -1000) > p(disableId, "memory", action)) return "no-move";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(disableId, "reach", action)) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_disable:windup", disableScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: target === null ? "" : String(target.ref()),
                    nails: p(disableId, "nails", action), heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            const origin = action.origin(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const nails = Math.max(3, Math.round(p(disableId, "nails", action)));
            sound(action, "minecraft:entity.evoker.prepare_attack");
            function fizzle(reason: string, point: CombatPoint): void {
                WorldFeedback.emit(world, disableScene, 1, point, { moment: "miss", nails: nails }, 20);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), disableMissText, [], 28);
                done(action);
            }
            const last = target === null ? null : NativeEffects.lastMove(world, target);
            if (target === null || !world.valid(target) || world.friendly(target) || last === null || String(last.id) === "struggle") {
                fizzle("invalid-target", targetPos); return;
            }
            const memory = p(disableId, "memory", action);
            if (world.tick() - (last.tick || -1000) > memory) { fizzle("stale", targetPos); return; }
            const body = world.observe(target);
            if (body === null || !world.clear(origin, body.position())) { fizzle("no-line", targetPos); return; }
            const ticks = Math.max(40, Math.round(p(disableId, "disableTicks", action)));
            const at = body.position();
            const landed = CombatStatus.apply(world, target, disableStatus, disableEffect, ticks, 0, { unique: true });
            if (!landed) { fizzle("immune", at); return; }
            disableReleaseMark(world, target);
            world.effect(disableMark, target, JSON.stringify({ move: String(last.id), max: ticks, nails: nails, caster: String(caster.ref()) }), ticks);
            const power = CobblemonCombat.moveTemplate(String(last.id)).power();
            WorldFeedback.emit(world, disableScene, 1, at,
                { moment: "lock", target: String(target.ref()), nails: nails, count: nails,
                  intensity: 1 + Math.min(1, power / 120), direction: [direction.x(), direction.y(), direction.z()],
                  reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())) }, 34);
            WorldFeedback.emit(world, disableScene, 1, origin,
                { moment: "fly", target: String(target.ref()), nails: nails, reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())),
                  direction: [direction.x(), direction.y(), direction.z()] }, 16);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), disableLockText,
                [{ key: "cobblemon.move." + String(last.id), fallback: String(last.id) }], 36);
            world.sound("minecraft:block.anvil.land", at, 14, "{}");
            done(action);
        }
    });

    // 持续：每 25 刻续一次钉的脉动；被点名的那一手不再拥有时提前松开（对方换招／被变招）。
    WorldCombat.on("world_combat:move_disable/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== disableEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const mark = disableData(world, actor);
        if (mark === null) return;
        if (!disableKnows(world, actor, String(mark.move))) {
            const effect = MobEffects.read(world, actor, disableEffect);
            if (effect !== null) world.removeMobEffect(actor, disableEffect, effect.key());
            disableReleaseMark(world, actor);
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, disableScene, 1, body.position(), { moment: "break", target: String(actor.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), disableBreakText, [], 24);
            }
            return;
        }
        if (world.tick() % 25 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_disable/pin/" + String(actor.ref()), disableScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), nails: mark.nails || 5, move: String(mark.move) }, 40);
    });

    // 结束：到期是钉自己松开，被外力清除是被人硬拔下来，画面不同。
    WorldCombat.on("world_combat:move_disable/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== disableEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        disableReleaseMark(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, disableScene, 1, body.position(),
            { moment: expired ? "release" : "break", target: String(actor.ref()), expired: expired ? 1 : 0 }, 24);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), disableFadeText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
