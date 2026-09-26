/** encore：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    function encoreAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 普通攻击按伤害类型归成可读的攻击类别；点名的标签用这个类别，而不是裸的 damageType。 */
    function encoreKind(type: string): string {
        const value = String(type || "");
        if (value === "minecraft:mob_attack" || value === "minecraft:mob_attack_no_aggro" || value === "minecraft:player_attack"
            || value === "minecraft:sting" || value === "minecraft:ram" || value === "minecraft:mace_smash") return "melee";
        if (value === "minecraft:arrow" || value === "minecraft:trident" || value === "minecraft:mob_projectile" || value === "minecraft:thrown") return "ranged";
        if (value === "minecraft:magic" || value === "minecraft:indirect_magic" || value === "minecraft:wither_skull"
            || value === "minecraft:dragon_breath" || value === "minecraft:sonic_boom") return "magic";
        return "other";
    }
    /** 被点名那一手的可读标签：宝可梦用招名，普通生物用攻击类别。 */
    function encoreAllowedArg(loop: any): any {
        if (loop && loop.native) return { key: "world_combat.move.encore.kind." + String(loop.kind || "other"), fallback: String(loop.id || "") };
        return { key: "cobblemon.move." + String(loop.id), fallback: String(loop.id) };
    }

    /** 回声标记：记录被点名的那一手与画面要用的数。 */
    function encoreLoopView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, encoreLoop);
        return views.length ? views[0] : null;
    }
    function encoreLoopOf(world: CombatWorld, actor: CombatActor): any {
        const view = encoreLoopView(world, actor);
        return view === null ? null : JSON.parse(String(view.data()));
    }

    /** 只收回本实例创建的那层原生锁定；别的来源留下的 `only` 层不动。 */
    function encoreDisownLock(world: CombatWorld, loop: any): void {
        if (loop && typeof loop.lockId === "number" && loop.lockId > 0) world.operation(loop.lockId, "world_combat:dispel", "{}");
    }
    function encoreDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, encoreLoop);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    /** 提前结束：拿掉身份效果与自己的锁定层。 */
    function encoreRelease(world: CombatWorld, actor: CombatActor, loop: any): void {
        const effect = MobEffects.read(world, actor, encoreEffect);
        if (effect !== null) world.removeMobEffect(actor, encoreEffect, effect.key());
        encoreDropMark(world, actor);
        encoreDisownLock(world, loop);
    }
    /** 被外力清除或到期：只收回标记与锁定层；是否播退场由调用处决定。 */
    function encoreTeardown(world: CombatWorld, actor: CombatActor, loop: any): void {
        encoreDropMark(world, actor);
        encoreDisownLock(world, loop);
    }
    /** 改用别的攻击被挡下时的一眼可见：头顶划下一道否定线，叉掉它想用的那一手。 */
    function encoreShowReject(world: CombatWorld, actor: CombatActor, loop: any): void {
        const body = world.observe(actor);
        if (body === null) return;
        const head = body.position().plus(WorldCombat.point(0, Math.max(0.9, body.height() * 0.8), 0));
        const half = Math.max(0.24, 0.18 + (loop.radius || 0.35) * 0.4);
        const path = [
            [head.x() - half, head.y() + half, head.z()],
            [head.x() + half, head.y() - half, head.z()]
        ];
        WorldFeedback.emit(world, encoreScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), motes: loop.motes || 10, path: path,
                scale: Math.max(0.5, (loop.radius || 0.35) / 0.35) }, 22);
        WorldFeedback.text(world, encoreAbove(body.position()), encoreRejectText, [encoreAllowedArg(loop)], 26);
    }

    WorldCombat.effect(encoreLoop, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.id !== "string" || !value.id) throw new Error("Invalid encore move");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks < 1) throw new Error("Invalid encore duration");
        if (value.lockId !== undefined && (typeof value.lockId !== "number" || !isFinite(value.lockId) || value.lockId < 0))
            throw new Error("Invalid encore lock");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(encoreLoop, "start", function () { });
    WorldCombat.effectHandler(encoreLoop, "operation:world_combat:dispel", function (effect) { effect.end(); });

    CombatStatus.actions.define({ id: "world_combat:move_encore/native", apply: context => {
        if (context.phase !== "damage" || !DamageSemantics.read(context.metadata).attack
            || MobEffects.read(context.world, context.actor, encoreEffect) === null) return;
        const loop = encoreLoopOf(context.world, context.actor);
        if (loop && loop.native && String(context.metadata.damageType) !== loop.id) context.blocked.encored = true;
    } });

    define({
        id: encoreId,
        cooldownParameter: "recharge",
        name: "再来一次",
        description: "点名目标刚用过的一手，让它暂时只能使用这一招。对普通生物和玩家，锁定的是刚命中过人的攻击方式，例如近战或箭矢。",
        uses: ["把刚做过的布置或强化锁死，逼它一直重复", "打断对手的连招节奏，让它只能做同一件事", "拖住一个刚露出破绽的对手"],
        kind: "enemy",
        range: 4,
        maxRange: 9,
        prepare: 8,
        active: 0,
        recover: 5,
        cooldown: 120,
        style: "encore",
        defaults: { strict: false, ai: { maxAge: 160, maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[encoreId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(encoreId, "tempo", context),
                recover: p(encoreId, "aftercast", context),
                cooldown: p(encoreId, "recharge", context),
                active: 0,
                range: p(encoreId, "reach", context)
            };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_encore/call", encoreScene, 1, action.origin(),
                JSON.stringify({ moment: "call", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function () {
            return { radius: 4, geometry: "line", style: "encore", color: 0xF2C14E, label: "再来一次" };
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            sound(action, "minecraft:block.note_block.chime");
            const at = world.observe(target) === null ? action.targetPosition() : world.observe(target)!.position();
            const memory = p(encoreId, "memory", action);
            const native = String(target.domain()) === "cobblemon" ? null : DamageSemantics.recentAttack(world, target, memory);
            const last = native ? { id: native.type, tick: native.tick, slot: -1, key: "" } : NativeEffects.lastMove(world, target);
            let usable = last !== null && world.tick() - last.tick <= memory;
            if (usable && !native) {
                const template = CobblemonCombat.moveTemplate(last!.id);
                usable = !NativeLoadout.facts(template).flags.failencore;
                if (usable && String(target.domain()) === "cobblemon") {
                    const pokemon = CobblemonCombat.pokemon(target), slot = last!.slot;
                    const stored = slot >= 0 && slot < pokemon.moveSlots() ? pokemon.move(slot) : null;
                    usable = stored !== null && String(stored.id()) === last!.id && stored.pp() > 0;
                }
            }
            if (!usable) {
                WorldFeedback.emit(world, encoreScene, 1, at, { moment: "miss", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, encoreAbove(at), encoreMissText, [], 28);
                done(action);
                return;
            }
            const ticks = Math.max(60, Math.round(p(encoreId, "callTicks", action)));
            const motes = Math.max(6, Math.round(p(encoreId, "motes", action)));
            const radius = Math.max(0.3, p(encoreId, "loopRadius", action));
            // 身份效果落下后才有回声；载体没落成就不制造旁路锁定。
            const carrier = MobEffects.apply(world, target, encoreEffect, ticks, 0);
            if (carrier === null) {
                WorldFeedback.emit(world, encoreScene, 1, at, { moment: "miss", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, encoreAbove(at), encoreMissText, [], 28);
                done(action);
                return;
            }
            const previous = encoreLoopOf(world, target);
            if (previous !== null) encoreDisownLock(world, previous);
            encoreDropMark(world, target);
            let lockId = 0;
            if (String(target.domain()) === "cobblemon") lockId = NativeModifiers.apply(world, target, { only: last!.id }, ticks);
            world.effect(encoreLoop, target, JSON.stringify({ id: last!.id, key: last!.key, slot: last!.slot,
                ticks: ticks, max: ticks, motes: motes, radius: radius, native: !!native, kind: native ? encoreKind(native.type) : "",
                lockId: lockId, target: native ? native.target : "" }), ticks);
            WorldFeedback.emit(world, encoreScene, 1, at,
                { moment: "loop", target: String(target.ref()), motes: motes, scale: radius / 0.35 }, 34);
            WorldFeedback.text(world, encoreAbove(at), encoreLockText, [Math.round(ticks / 20), encoreAllowedArg({ id: last!.id, native: !!native, kind: native ? encoreKind(native.type) : "" })], 34);
            done(action);
        }
    });

    // 持续：回声期间每 20 刻续一次音符；被点名的那一手耗尽 PP 或不再记得时提前散开。
    WorldCombat.on("world_combat:move_encore/watch", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== encoreEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const view = encoreLoopView(world, actor);
        if (view === null) return;
        const loop = JSON.parse(String(view.data()));
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor);
            let found = false;
            for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
                const move = pokemon.move(slot);
                if (move !== null && String(move.id()) === loop.id && move.pp() > 0) { found = true; break; }
            }
            if (!found) {
                const body = world.observe(actor);
                if (body !== null) {
                    WorldFeedback.emit(world, encoreScene, 1, body.position(), { moment: "spent", target: String(actor.ref()) }, 26);
                    WorldFeedback.text(world, encoreAbove(body.position()), encoreFadeText, [], 26);
                }
                encoreRelease(world, actor, loop);
                return;
            }
        }
        if (world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const surge = Math.max(0, Math.min(1, view.remaining() / Math.max(1, loop.max || 1)));
        WorldFeedback.keep(world, "world_combat:move_encore/echo/" + String(actor.ref()), encoreScene, 1, body.position(),
            { moment: "echo", target: String(actor.ref()), motes: loop.motes || 10, surge: surge, scale: Math.max(0.5, (loop.radius || 0.35) / 0.35) }, 40);
    });

    // 结束：到期安静散开；被外力清除时只收回锁定与标记，不播退场。
    WorldCombat.on("world_combat:move_encore/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== encoreEffect) return;
        const world = event.world(), actor = event.actor();
        const view = encoreLoopView(world, actor);
        if (view === null) return;
        const loop = JSON.parse(String(view.data()));
        encoreTeardown(world, actor, loop);
        if (String(data.cause) !== "expired" || !world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, encoreScene, 1, body.position(), { moment: "release", target: String(actor.ref()) }, 24);
    });

    // 宝可梦改用别的招式：`only` 层已经在提交前顶回这一手，这里只把「叉掉」演出来。
    WorldCombat.on("world_combat:move_encore/reject-move", "world_combat:before_commit", "cobblemon_world_combat:before", function (event) {
        const world = event.world(), actor = event.actor(), action = event.action();
        if (action === null || String(actor.domain()) !== "cobblemon") return;
        if (MobEffects.read(world, actor, encoreEffect) === null) return;
        const loop = encoreLoopOf(world, actor);
        if (loop === null || loop.native) return;
        const layers = NativeModifiers.read(world, actor);
        if (layers.only !== loop.id) return;
        const executing = NativeLoadout.executing(action);
        if (executing === null || String(executing.id()) === loop.id) return;
        encoreShowReject(world, actor, loop);
    });

    // 普通生物改用别的攻击：伤害在命中层被挡住前，先把「叉掉」演出来。
    WorldCombat.on("world_combat:move_encore/reject-native", "world_combat:damage_incoming", "world_combat:status/attacks", function (event) {
        const target = event.target(), actor = event.actor();
        if (target === null || actor === null || String(actor.key()) === String(target.key())) return;
        const world = event.world();
        if (MobEffects.read(world, actor, encoreEffect) === null) return;
        const loop = encoreLoopOf(world, actor);
        if (loop === null || !loop.native) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.amount > 0) || !DamageSemantics.read(data).attack) return;
        if (String(data.damageType) === loop.id) return;
        encoreShowReject(world, actor, loop);
    });
}
