/** disable：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export function disableLast(world: CombatWorld, actor: CombatActor): { id: string; tick: number; native?: boolean } | null {
        if (String(actor.domain()) === "cobblemon") return NativeEffects.lastMove(world, actor);
        const last = DamageSemantics.recentAttack(world, actor, 1200);
        return last ? { id: last.type, tick: last.tick, native: true } : null;
    }

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
        if (!CombatStatus.has(context.world, context.actor, disableStatus)) return;
        const data = disableData(context.world, context.actor);
        if (data === null || !data.move) return;
        if (context.phase === "damage" && data.native && DamageSemantics.read(context.metadata).attack) {
            if (String(context.metadata.damageType) === String(data.move)) context.blocked.disabled = true;
        } else if (context.move && typeof context.move.id === "function" && String(context.move.id()) === String(data.move))
            context.blocked.disabled = true;
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
        description: "封住目标刚用过的招式。对普通生物和玩家，则封住最近命中过人的攻击方式，例如近战或箭矢；换一种攻击仍能出手。",
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
            const last = disableLast(world, target);
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
            const last = target === null ? null : disableLast(world, target);
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
            world.effect(disableMark, target, JSON.stringify({ move: String(last.id), native: !!last.native, max: ticks, nails: nails, caster: String(caster.ref()) }), ticks);
            const power = last.native ? 60 : CobblemonCombat.moveTemplate(String(last.id)).power();
            WorldFeedback.emit(world, disableScene, 1, at,
                { moment: "lock", target: String(target.ref()), nails: nails, count: nails,
                  intensity: 1 + Math.min(1, power / 120), direction: [direction.x(), direction.y(), direction.z()],
                  reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())) }, 34);
            WorldFeedback.emit(world, disableScene, 1, origin,
                { moment: "fly", target: String(target.ref()), nails: nails, reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())),
                  direction: [direction.x(), direction.y(), direction.z()] }, 16);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), disableLockText,
                [last.native ? { key: "worldcombat.skill.disable.native_attack", fallback: "普通攻击" } : { key: "cobblemon.move." + String(last.id), fallback: String(last.id) }], 36);
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
