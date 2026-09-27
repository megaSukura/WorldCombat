/** Hold a fixed-facing shield; front contact attacks can lose Attack once per attacker. */
namespace PokemonSkills {
    const kingShieldScene = "world_combat:move_kingsshield";
    export const KingShieldRule = "world_combat:move_kingsshield";
    const kingShieldEffect = "world_combat:king_guard";
    const kingShieldHoldKey = "world_combat:move_kingsshield:hold";
    const kingShieldBlockText = "world_combat.move.kingsshield.text.block";
    const kingShieldPunishText = "world_combat.move.kingsshield.text.punish";
    const kingShieldFallText = "world_combat.move.kingsshield.text.fall";
    /** 表现里的参考半径：`data.scale = 实际盾影半径 / 这个数`。 */
    const kingShieldReferenceRadius = 1.6;
    function kingShieldScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || kingShieldReferenceRadius) / kingShieldReferenceRadius));
    }
    function kingShieldIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function kingShieldContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    /** 盾面局部几何：朝向固定的正面矩形，横向半宽与画面同一份；判定与表现读同一组顶点。 */
    function kingShieldPlate(state: any, origin: CombatPoint): { centre: CombatPoint; corners: CombatPoint[] } {
        const f = WorldGeometry.flatUnit(WorldCombat.point(state.direction[0], 0, state.direction[2]));
        const forward = typeof state.forward === "number" ? state.forward : (state.radius || kingShieldReferenceRadius) * 0.55;
        const halfWidth = typeof state.halfWidth === "number" ? state.halfWidth : (state.radius || kingShieldReferenceRadius) * 0.65;
        const side = WorldCombat.point(-f.z(), 0, f.x()).scale(halfWidth);
        const centre = origin.plus(f.scale(forward));
        const lowY = typeof state.lowY === "number" ? state.lowY : origin.y() - 0.5;
        const highY = typeof state.highY === "number" ? state.highY : origin.y() + 1.0;
        const bottom = lowY - centre.y(), top = highY - centre.y();
        const corners = [centre.minus(side).plus(WorldCombat.point(0, bottom, 0)), centre.plus(side).plus(WorldCombat.point(0, bottom, 0)),
            centre.plus(side).plus(WorldCombat.point(0, top, 0)), centre.minus(side).plus(WorldCombat.point(0, top, 0)),
            centre.minus(side).plus(WorldCombat.point(0, bottom, 0))];
        return { centre: centre, corners: corners };
    }
    /** 来袭起点：优先原生 sourcePosition，其次真实弹道最后一段的实际接触点，再次攻击者身体位置；都没有就不猜方向。 */
    function kingShieldSource(world: CombatWorld, incoming: GuardEffects.Incoming): CombatPoint | null {
        const data = incoming.data, source = data && data.sourcePosition;
        if (Array.isArray(source) && source.length === 3 && source.every((v: any) => typeof v === "number" && isFinite(v)))
            return WorldCombat.point(source[0], source[1], source[2]);
        const path = data && data.projectilePath;
        if (Array.isArray(path) && path.length) {
            const to = path[path.length - 1] && path[path.length - 1].to;
            if (Array.isArray(to) && to.length === 3) return WorldCombat.point(to[0], to[1], to[2]);
        }
        // 实体来源的伤害常常没有显式 sourcePosition；攻击者在场就用它的真实身体位置。
        const attacker = incoming.source ? world.observe(incoming.source) : null;
        return attacker === null ? null : attacker.position();
    }
    /**
     * 真实盾面相交：来袭线段必须从正面（forward>0）穿过画出来的盾面矩形；宽度与高度都用实盾尺寸判断，
     * 未知来袭方向返回 null（不猜正面）。返回盾面上的实际接触点，供格挡火花使用。
     */
    function kingShieldIncident(world: CombatWorld, state: any, body: CombatObservation, incoming: GuardEffects.Incoming): CombatPoint | null {
        const anchor = state.anchor, direction = state.direction;
        if (!Array.isArray(anchor) || !Array.isArray(direction)) return null;
        const origin = WorldCombat.point(anchor[0], anchor[1], anchor[2]);
        if (body.position().minus(origin).length() > 0.6) return null;
        const source = kingShieldSource(world, incoming); if (source === null) return null;
        const f = WorldGeometry.flatUnit(WorldCombat.point(direction[0], 0, direction[2]));
        const side = WorldCombat.point(-f.z(), 0, f.x());
        const forward = typeof state.forward === "number" ? state.forward : (state.radius || kingShieldReferenceRadius) * 0.55;
        const halfWidth = typeof state.halfWidth === "number" ? state.halfWidth : (state.radius || kingShieldReferenceRadius) * 0.65;
        const low = typeof state.lowY === "number" ? state.lowY : anchor[1] - 0.5;
        const high = typeof state.highY === "number" ? state.highY : anchor[1] + 1.0;
        const rel = source.minus(origin), forwardSource = rel.x() * f.x() + rel.z() * f.z();
        // 身后/正侧向的来袭不穿过正面，照常打到身上。
        if (!(forwardSource > 0.02)) return null;
        // 沿「来袭起点→身体」线段找到它穿过盾面的点；起点已贴到盾面后侧时按身体点判定（近身正面仍挡住）。
        const toTarget = body.position().minus(source), denom = toTarget.x() * f.x() + toTarget.z() * f.z();
        let hit: CombatPoint;
        if (Math.abs(denom) > 1e-6) {
            const t = (forward - forwardSource) / denom;
            hit = t >= 0 && t <= 1 ? source.plus(toTarget.scale(t)) : body.position();
        } else hit = body.position();
        const lateral = hit.x() * side.x() + hit.z() * side.z();
        if (Math.abs(lateral) > halfWidth + 0.05 || hit.y() < low - 0.1 || hit.y() > high + 0.1) return null;
        const clamped = Math.max(-halfWidth, Math.min(halfWidth, lateral)), clampedY = Math.max(low, Math.min(high, hit.y()));
        return WorldCombat.point(origin.x() + f.x() * forward + side.x() * clamped, clampedY, origin.z() + f.z() * forward + side.z() * clamped);
    }
    /** 持壁轮廓：绑在 guard 效果上按剩余池更新，量尽或效果结束时随它消失。 */
    function kingShieldHold(world: CombatWorld, effect: CombatEffect, state: any): void {
        const anchor = state.anchor; if (!Array.isArray(anchor)) return;
        const origin = WorldCombat.point(anchor[0], anchor[1], anchor[2]);
        const plate = kingShieldPlate(state, origin);
        WorldFeedback.onEffect(world, effect.id(), kingShieldHoldKey + ":" + effect.id(), kingShieldScene, 1, plate.centre,
            { moment: "hold", path: plate.corners.map(p => [p.x(), p.y(), p.z()]),
                remaining: Math.round(state.capacity * 10) / 10, initial: state.initial || 1,
                intensity: kingShieldIntensity(state.capacity, state.initial || 1) });
    }
    const kingShieldPose = "world_combat:kingsshield_pose";
    WorldCombat.effect(kingShieldPose, 1, 1200, "action", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(kingShieldPose, "start", function () {});
    WorldCombat.effectHandler(kingShieldPose, "end", function (effect) {
        const data = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        world.operation(data.guard, "world_combat:dispel", "{}");
        if (world.valid(actor) && MobEffects.matches(world, actor, data.carrier)) MobEffects.consume(world, actor, kingShieldEffect);
    });
    GuardEffects.register(KingShieldRule, {
        /** 只挡敌对来源的真正直攻；indirect/residual 脚本伤害与变化招式都不进这条，未知来袭方向不猜。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref()) || world.friendly(incoming.source)) return false;
            if (!DamageSemantics.directOffense(incoming.data)) return false;
            const body = world.observe(effect.target());
            if (!body) return false;
            return kingShieldIncident(world, state, body, incoming) !== null;
        },
        pulse: function (effect, state) {
            const world = effect.world(), actor = effect.target(), body = world.observe(actor), custom: any = state;
            if (!body || !MobEffects.matches(world, actor, custom.carrier)) { effect.end(); return; }
            if (body.position().minus(WorldCombat.point(custom.anchor[0], custom.anchor[1], custom.anchor[2])).length() > .6) { MobEffects.consume(world, actor, kingShieldEffect); effect.end(); }
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = kingShieldScale(custom.radius);
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            // 火花落在真实来袭穿到盾面的接触点上；判不出来时退回身体位置。
            const contact = kingShieldIncident(world, state, body, incoming) || body.position();
            if (attacker !== null && kingShieldContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(attacker.ref());
                if (!custom.parried[key]) {
                    custom.parried[key] = true; effect.state(JSON.stringify(state));
                    const drop = Math.max(1, custom.drop || 1);
                    // 只有真正削掉级数才算成功：boost 返回实际负增量，已满负级（回执 0）不播成功字。
                    const applied = NativeEffects.boost(world, attacker, "atk", -drop);
                    if (applied < 0) {
                        WorldFeedback.emit(world, kingShieldScene, 1, contact, { moment: "punish", target: key,
                            drop: drop, bolts: Math.max(4, Math.round(drop * 8)), scale: scale, intensity: Math.max(0.4, Math.min(1.4, drop / 2)) }, 24);
                        WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 1.3, 0)), kingShieldPunishText, [Math.abs(applied)], 30);
                        world.sound("minecraft:block.anvil.land", contact, 14, "{}");
                    }
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: kingShieldIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (attacker !== null) {
                const away = body.position().minus(world.observe(attacker)!.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, kingShieldScene, 1, contact, data, 22);
            WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 1.4, 0)), kingShieldBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", contact, 16, "{}");
            // 剩余池直接改持壁轮廓的亮度。
            kingShieldHold(world, effect, state);
            if (state.capacity <= 0) {
                MobEffects.consume(world, target, kingShieldEffect);
            }
        }
    });

    // 收：身份走完自己的时间或被外力解除时，钢盾沉下。两条路画面不同。
    WorldCombat.on("world_combat:move_kingsshield/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== kingShieldEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const broken = String(data.cause) === "removed";
        WorldFeedback.emit(world, kingShieldScene, 1, body.position(),
            { moment: "fall", target: String(actor.ref()), broken: broken ? 1 : 0 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), kingShieldFallText, [], 22);
    });

    define({
        id: "kingsshield",
        cooldownParameter: "charge",
        name: "King's Shield",
        description: "站定举起朝向固定的王者钢盾，承受正面攻击；背后来击照常命中。本次举盾对每名真正接触盾面的攻击者只削攻一次。",
        uses: ["挡住近战的连续伤害并削其攻击", "为下一记交手先把对手打软", "用最厚的一面钢盾硬吃齐射"],
        kind: "self",
        range: 0,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 85,
        stationary: true,
        style: "regal",
        defaults: { majesty: false, ai: { range: 5 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["kingsshield"], detail: { values: config }, world, actor, attributes };
            const majesty = !!(config && config.majesty);
            return {
                prepare: p("kingsshield", "raise", context),
                recover: majesty ? 7 : 5,
                cooldown: p("kingsshield", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const scale = kingShieldScale(p("kingsshield", "radius", action));
            action.present("world_combat:move_kingsshield:raise", kingShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: scale }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "kingsshield_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const world = action.sense(), actor = action.actor(), now = world.tick();
            const count = GuardEffects.stall(state(world, actor, GuardEffects.stallKey), now, p("kingsshield", "stallReset", action));
            // 失误率读复位后的计数：超过 stallReset 没连用，这里就是 0，不会因久置而留下高失误率。
            const source: FactContext = { world: world, actor: actor, action: action,
                state: function (id: string) { return id === GuardEffects.stallKey ? { stall: count, at: now } : state(world, actor, id); } };
            const failed = world.random() < p("kingsshield", "fizzle", source);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = Math.max(10, Math.round(p("kingsshield", "window", action)));
            const capacity = Math.max(8, p("kingsshield", "capacity", action));
            const radius = Math.max(1.2, p("kingsshield", "radius", action));
            const drop = Math.max(1, Math.round(p("kingsshield", "drop", action)));
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = GuardEffects.stall(previous, now, p("kingsshield", "stallReset", action));
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const carrier = MobEffects.apply(world, actor, kingShieldEffect, window, 0);
            if (!carrier) { done(action); return; }
            const facing = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            const forward = radius * 0.55, halfWidth = radius * 0.65, anchor = action.origin();
            // 盾面的竖直范围取施法者真实碰撞箱，让画面与判定都盖住身体，越顶的来袭才越过盾面。
            const self = world.observe(actor);
            const lowY = self === null ? anchor.y() - 0.5 : self.boundsMin().y();
            const highY = self === null ? anchor.y() + 1.0 : self.boundsMax().y();
            const stateJson: any = { rule: KingShieldRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: drop,
                forward: forward, halfWidth: halfWidth, lowY: lowY, highY: highY,
                direction: [facing.x(), 0, facing.z()], parried: {}, carrier: MobEffects.anchor(carrier),
                anchor: [anchor.x(), anchor.y(), anchor.z()] };
            const guard = GuardEffects.apply(world, actor, stateJson, window);
            action.effect(kingShieldPose, actor, JSON.stringify({ guard: guard, carrier: MobEffects.anchor(carrier) }), window);
            const plate = kingShieldPlate(stateJson, anchor);
            WorldFeedback.onEffect(world, guard, kingShieldHoldKey + ":" + guard, kingShieldScene, 1, plate.centre,
                { moment: "hold", path: plate.corners.map(p => [p.x(), p.y(), p.z()]),
                    remaining: Math.round(capacity * 10) / 10, initial: capacity,
                    intensity: kingShieldIntensity(capacity, capacity) });
            sound(action, "minecraft:block.anvil.place");
            action.present("world_combat:move_kingsshield:raise2", kingShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: kingShieldScale(radius), drop: drop }));
            world.stopMovement(actor);
            function hold(current: CombatAction): void {
                const scope = current.world();
                if (!scope.effects(current.actor(), "world_combat:guard").some(view => view.id() === guard)) { done(current); return; }
                current.after(1, hold);
            }
            action.after(1, hold);
        }
    });
}
