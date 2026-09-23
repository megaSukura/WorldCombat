/**
 * 再来一次 / encore —— 执行组织。
 *
 * 核心念头：把对手刚才那一手「点名」出来，逼它在回声散去前再演一遍——它只能一遍遍重复同一个动作。
 *
 * 一幕半：起（windup 只在施法者头顶聚起一圈亮色音符，提交前可打断，不花代价）→
 *          令（提交后：一道回声扣在目标头上，挂共享身份 world_combat:status/encore 的真实 MobEffect；
 *             宝可梦再用共享原生锁定 `only` 把那招钉成唯一可用的一手，并留下机读回声标记供持续画面与回落读取）。
 * 持续：回声期间每 20 刻续一次音符画面，密度由剩余比例派生；目标最后那一手 PP 耗尽或不再记得时，
 *      回声当场散开（spent），并把原生锁定一并收回。
 * 结束：时间走完安静褪去（release）；被牛奶或清除效果解掉时不播退场。
 * 反制：需要目标刚出过手且那一手还能再用；带 failencore 的招（如挣扎）点不动；回声可被清除，也能靠耗光那一手的 PP 甩掉。
 */
namespace PokemonSkills {
    function encoreAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 回声标记：记录被点名的那一手与画面要用的数。 */
    function encoreLoopView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, encoreLoop);
        return views.length ? views[0] : null;
    }
    function encoreLoopOf(world: CombatWorld, actor: CombatActor): any {
        const view = encoreLoopView(world, actor);
        return view === null ? null : JSON.parse(String(view.data()));
    }

    /** 收回本单元加在目标身上的原生锁定层（`only` 指向被点名的招时才收，别的层不动）。 */
    function encoreDropLock(world: CombatWorld, actor: CombatActor, id: string): void {
        const layers = world.effects(actor, "cobblemon_world_combat:modifier");
        for (let i = 0; i < layers.length; i++) {
            const value = JSON.parse(String(layers[i].data()));
            if (value && value.only === id) world.operation(layers[i].id(), "world_combat:dispel", "{}");
        }
    }
    function encoreDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, encoreLoop);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    /** 提前结束：拿掉身份效果与锁定层；身份被移除后由 removed 处理器负责画面。 */
    function encoreRelease(world: CombatWorld, actor: CombatActor, id: string): void {
        const effect = MobEffects.read(world, actor, encoreEffect);
        if (effect !== null) world.removeMobEffect(actor, encoreEffect, effect.key());
        encoreDropMark(world, actor);
        encoreDropLock(world, actor, id);
    }

    WorldCombat.effect(encoreLoop, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.id !== "string" || !value.id) throw new Error("Invalid encore move");
        if (typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks < 1) throw new Error("Invalid encore duration");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(encoreLoop, "start", function () { });
    WorldCombat.effectHandler(encoreLoop, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: encoreId,
        cooldownParameter: "recharge",
        name: "再来一次",
        description: "把对手刚才那一手点名出来，逼它在回声散去前连续重复同一招；需要目标刚出过手、那一手还能再用，带 failencore 的招点不动。",
        uses: ["把刚做过的布置／强化锁死，逼它一直重复", "打断对手的连招节奏，让它只能做同一件事", "拖住一个刚露出破绽的对手"],
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
            const last = NativeEffects.lastMove(world, target);
            let usable = last !== null;
            if (usable) {
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
            MobEffects.apply(world, target, encoreEffect, ticks, 0);
            encoreDropMark(world, target);
            world.effect(encoreLoop, target, JSON.stringify({ id: last!.id, key: last!.key, slot: last!.slot,
                ticks: ticks, max: ticks, motes: motes, radius: radius }), ticks);
            if (String(target.domain()) === "cobblemon") NativeModifiers.apply(world, target, { only: last!.id }, ticks);
            WorldFeedback.emit(world, encoreScene, 1, at,
                { moment: "loop", target: String(target.ref()), motes: motes, scale: radius / 0.35 }, 34);
            WorldFeedback.text(world, encoreAbove(at), encoreLockText, [Math.round(ticks / 20)], 34);
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
                encoreRelease(world, actor, loop.id);
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
        encoreDropMark(world, actor);
        encoreDropLock(world, actor, loop.id);
        if (String(data.cause) !== "expired" || !world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, encoreScene, 1, body.position(), { moment: "release", target: String(actor.ref()) }, 24);
    });
}
