/** 暂时封住目标的道具使用。宝可梦的携带物能力停止生效，普通生物与玩家暂停饮食、格挡、蓄力和手持物交互；道具留在原位。 */
namespace PokemonSkills {
    const embargoScene = "world_combat:move_embargo";
    const embargoEffect = "world_combat:embargo";
    const embargoLock = "world_combat:move_embargo/lock";
    const embargoStatus = "embargo";
    const embargoSealText = "world_combat.move.embargo.text.seal";
    const embargoBareText = "world_combat.move.embargo.text.seal.bare";
    const embargoOpenText = "world_combat.move.embargo.text.open";
    const embargoBreakText = "world_combat.move.embargo.text.break";
    const embargoMissText = "world_combat.move.embargo.text.miss";

    /** 目标当前的原生携带物或主副手。 */
    function embargoHeld(world: CombatWorld, actor: CombatActor): string {
        const held = NativeItems.heldOf(world, actor);
        return held === null ? "" : held.id;
    }
    /** 真实持物位置：身体中心向上抬到手的高度，封条与锁环都对到这里，而不是笼统的身体中心。 */
    function embargoHeldPoint(body: CombatObservation): CombatPoint {
        return WorldCombat.point(body.position().x(), body.boundsMin().y() + body.height() * 0.62, body.position().z());
    }
    WorldCombat.on("world_combat:move_embargo/item-use", "world_combat:item_use", "", function (event) {
        if (NativeItems.sealed(event.world(), event.actor())) event.reject("item-sealed");
    });
    function embargoItemKey(id: string): string { return "item." + String(id).replace(":", "."); }

    // 常驻锁：一份挂在目标身上、随本次查封印记的 carrier 修订存续的托管效果。印记到期、被清除或被替换时，
    // 锁在自己的脉冲里读不到同一修订就收场，表现（onEffect 绑在锁上）与 suppressItems 层随它一起结束。
    WorldCombat.effect(embargoLock, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.shackles !== "number" || !isFinite(value.shackles) || value.shackles < 1) throw new Error("Invalid embargo lock");
        if (typeof value.scale !== "number" || !isFinite(value.scale) || value.scale <= 0) throw new Error("Invalid embargo lock scale");
        if (value.anchor !== undefined && value.anchor !== null && !MobEffects.validAnchor(value.anchor)) throw new Error("Invalid embargo lock anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function embargoLockPulse(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target(), state = JSON.parse(String(effect.state()));
        const status = world.valid(target) ? MobEffects.read(world, target, embargoEffect) : null;
        if (status === null || (state.anchor && !MobEffects.matches(world, target, state.anchor))) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_embargo/lock", embargoScene, 1, embargoHeldPoint(body),
            { moment: "hold", target: String(target.ref()), shackles: state.shackles, scale: state.scale });
        effect.schedule("pulse", "pulse", 25, "{}");
    }
    WorldCombat.effectHandler(embargoLock, "start", embargoLockPulse);
    WorldCombat.effectHandler(embargoLock, "pulse", embargoLockPulse);
    WorldCombat.effectHandler(embargoLock, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 结束：印记自己松开是 release，被外力清除是 break；两者都收掉本次常驻锁，并只在真实持物位置通报。
    WorldCombat.on("world_combat:move_embargo/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== embargoEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        world.effects(actor, embargoLock).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, embargoScene, 1, embargoHeldPoint(body),
            { moment: expired ? "release" : "break", target: String(actor.ref()), expired: expired ? 1 : 0 }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
            expired ? embargoOpenText : embargoBreakText, [], 26);
        world.sound("minecraft:block.conduit.deactivate", body.position(), 12, "{}");
    });

    define({
        id: "embargo",
        cooldownParameter: "recharge",
        name: "查封",
        description: "暂时封住目标的道具使用。宝可梦的携带物能力停止生效，普通生物与玩家暂停饮食、格挡、蓄力和手持物交互；道具留在原位。",
        uses: ["封住依赖持有物的对手", "在道具交换发生前先按住对方的手", "提前按住对手，让它之后捡到的道具也用不出"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 95,
        style: "seal",
        defaults: { deep: false, ai: { maxChase: 12, denyItems: true, leaveStation: false } },
        fields: [flag("deep", "深锁")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["embargo"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var deep = !!(config && config.deep);
            return { prepare: Math.round(p("embargo", "tempo", context)),
                recover: Math.round(p("embargo", "aftercast", context)),
                cooldown: Math.round(p("embargo", "recharge", context)) + (deep ? 6 : -4),
                active: 0, range: p("embargo", "reach", context) };
        },
        ready: function (action) {
            var world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            var self = world.observe(action.actor()), body = world.observe(target);
            if (self === null || body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("embargo", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, embargoStatus)) return "already-sealed";
            return "";
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_embargo:windup", embargoScene, 1, action.origin(), JSON.stringify({
                moment: "windup", scale: scale, motes: Math.round(p("embargo", "motes", action)),
                deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor(), target = action.target();
            var origin = action.origin(), targetPos = action.targetPosition();
            var delta = targetPos.minus(origin);
            var direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            var ticks = Math.max(60, Math.round(p("embargo", "seal", action)));
            var radius = Math.max(0.18, p("embargo", "radius", action));
            var shackles = Math.max(6, Math.round(p("embargo", "shackles", action)));
            var motes = Math.max(6, Math.round(p("embargo", "motes", action)));
            var scale = radius / 0.32;
            sound(action, "minecraft:block.conduit.deactivate");
            function fizzle(point: CombatPoint): void {
                WorldFeedback.emit(world, embargoScene, 1, point, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), embargoMissText, [], 24);
                done(action);
            }
            if (target === null || !world.valid(target) || world.friendly(target)) { fizzle(targetPos); return; }
            var body = world.observe(target);
            if (body === null || !world.clear(origin, body.position())) { fizzle(targetPos); return; }
            var at = body.position(), heldPoint = embargoHeldPoint(body);
            var held = embargoHeld(world, target);
            WorldFeedback.emit(world, embargoScene, 1, origin,
                { moment: "cast", target: String(target.ref()),
                    path: [String(caster.ref()), [heldPoint.x(), heldPoint.y(), heldPoint.z()]],
                    motes: motes, scale: 1,
                    direction: [direction.x(), direction.y(), direction.z()],
                    reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())) }, 18);
            if (!CombatStatus.apply(world, target, embargoStatus, embargoEffect, ticks, 0, { unique: true })) { fizzle(at); return; }
            var status = world.mobEffect(target, embargoEffect);
            // 只有宝可梦的携带物效果会真的被封层；普通生物由 item_use 门禁按同一身份拦下物品使用。
            // 层绑定本次印记的 carrier 修订：印记清除、替换或重载后，层随 carrier 失效，不留旧抑制。
            var sealed = false;
            if (status !== null && String(target.domain()) === "cobblemon") {
                try {
                    sealed = NativeModifiers.apply(world, target,
                        { suppressItems: true, carrier: MobEffects.anchor(status), source: "world_combat:move_embargo" }, ticks) > 0;
                } catch (error) { sealed = false; }
            }
            world.effect(embargoLock, target,
                JSON.stringify({ shackles: shackles, scale: scale, anchor: status ? MobEffects.anchor(status) : null }), ticks);
            WorldFeedback.emit(world, embargoScene, 1, heldPoint,
                { moment: "seal", target: String(target.ref()), shackles: shackles, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, ticks / 260)) }, 32);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), sealed ? embargoSealText : embargoBareText,
                sealed ? [{ key: embargoItemKey(held), fallback: held }] : [], 34);
            world.sound("minecraft:block.beacon.deactivate", at, 14, "{}");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["embargo"], detail: { values: config } };
            return { radius: pokemon ? p("embargo", "reach", context) : 9, geometry: "line", style: "seal", color: 0x8C6BD8,
                label: config && config.deep === true ? "查封·深锁" : "查封·快锁" };
        }
    });
}
