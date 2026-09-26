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
    const kingShieldPose = "world_combat:kingsshield_pose";
    WorldCombat.effect(kingShieldPose, 1, 1200, "action", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(kingShieldPose, "start", function () {});
    WorldCombat.effectHandler(kingShieldPose, "end", function (effect) {
        const data = JSON.parse(effect.state()), world = effect.world(), actor = effect.target();
        world.operation(data.guard, "world_combat:dispel", "{}");
        if (world.valid(actor) && MobEffects.matches(world, actor, data.carrier)) MobEffects.consume(world, actor, kingShieldEffect);
    });
    GuardEffects.register(KingShieldRule, {
        /** 只挡敌对来源的伤害；变化招式与自身来源都不进这条。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref()) || world.friendly(incoming.source)) return false;
            if (!DamageSemantics.read(incoming.data).attack && String(incoming.data.kind) !== "move") return false;
            const source = incoming.data.sourcePosition, body = world.observe(effect.target()), d = (<any>state).direction;
            if (!Array.isArray(source) || !body || !d) return false;
            const anchor = (<any>state).anchor;
            if (body.position().minus(WorldCombat.point(anchor[0], anchor[1], anchor[2])).length() > .6) return false;
            const dx = source[0] - body.position().x(), dz = source[2] - body.position().z(), length = Math.sqrt(dx * dx + dz * dz);
            return length > .001 && (dx * d[0] + dz * d[2]) / length >= .5;
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
            if (attacker !== null && kingShieldContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(attacker.ref());
                if (!custom.parried[key]) {
                    custom.parried[key] = true; effect.state(JSON.stringify(state));
                    const drop = Math.max(1, custom.drop || 1), point = world.observe(attacker)!.position();
                    NativeEffects.boost(world, attacker, "atk", -drop);
                    WorldFeedback.emit(world, kingShieldScene, 1, point, { moment: "punish", target: String(attacker.ref()),
                        drop: drop, bolts: Math.max(4, Math.round(drop * 8)), scale: scale, intensity: Math.max(0.4, Math.min(1.4, drop / 2)) }, 24);
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)), kingShieldPunishText, [drop], 30);
                    world.sound("minecraft:block.anvil.land", point, 14, "{}");
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: kingShieldIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (attacker !== null) {
                const away = body.position().minus(world.observe(attacker)!.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, kingShieldScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), kingShieldBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
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
            const failed = action.sense().random() < p("kingsshield", "fizzle", action);
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
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("kingsshield", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            const carrier = MobEffects.apply(world, actor, kingShieldEffect, window, 0);
            if (!carrier) { done(action); return; }
            const facing = WorldGeometry.flatUnit(action.direction());
            const guard = GuardEffects.apply(world, actor, { rule: KingShieldRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: drop,
                direction: [facing.x(), 0, facing.z()], parried: {}, carrier: MobEffects.anchor(carrier),
                anchor: [action.origin().x(), action.origin().y(), action.origin().z()] } as any, window);
            action.effect(kingShieldPose, actor, JSON.stringify({ guard: guard, carrier: MobEffects.anchor(carrier) }), window);
            const centre = action.origin().plus(facing.scale(radius * .55)), side = WorldCombat.point(-facing.z(), 0, facing.x()).scale(radius * .65);
            const corners = [centre.minus(side).plus(WorldCombat.point(0, -.5, 0)), centre.plus(side).plus(WorldCombat.point(0, -.5, 0)),
                centre.plus(side).plus(WorldCombat.point(0, 1, 0)), centre.minus(side).plus(WorldCombat.point(0, 1, 0)), centre.minus(side).plus(WorldCombat.point(0, -.5, 0))];
            WorldFeedback.onEffect(world, guard, kingShieldHoldKey + ":" + guard, kingShieldScene, 1, centre,
                { moment: "hold", path: corners.map(p => [p.x(), p.y(), p.z()]) });
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
