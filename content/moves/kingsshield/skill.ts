/**
 * 王者盾牌 / kingsshield 的出手方式。
 *
 * 念头的形状：一面竖起的纹章钢盾在身前立稳（raise），按总量挡下打来的伤害招式（hold → block）；
 * 每一次直接的接触让盾沿把攻击者的攻击锐度削下去（punish）；量尽或到时则钢盾沉下（fall）。
 * 三幕：立盾 → 拒止 → 削锋／收盾。
 *
 * 钢盾本体是共享 GuardEffects 的 pool 模式（规则 world_combat:move_kingsshield），撑盾期间施法者身上挂
 * 真实 MobEffect `world_combat:king_guard`，承载共享身份 world_combat:status/kingsshield。
 * 打磨：变化招式不进 pool，所以**会照常落到身上**——这是它与尖刺防守／碉堡的取舍，说明里写明。
 */
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
    /** 每个攻击者在本次钢盾窗口里是否已经被削过。 */
    const kingShieldParried: { [key: string]: boolean } = Object.create(null);

    function kingShieldScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || kingShieldReferenceRadius) / kingShieldReferenceRadius));
    }
    function kingShieldIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function kingShieldContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    function kingShieldClear(effect: CombatEffect): void {
        const prefix = String(effect.id()) + ":";
        Object.keys(kingShieldParried).forEach(function (entry) { if (entry.indexOf(prefix) === 0) delete kingShieldParried[entry]; });
    }

    GuardEffects.register(KingShieldRule, {
        /** 只挡敌对来源的伤害；变化招式与自身来源都不进这条。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            if (effect.remaining() <= 8) kingShieldClear(effect);
            const initial = (<any>state).initial || state.capacity || 1;
            WorldFeedback.keep(world, kingShieldHoldKey, kingShieldScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                scale: kingShieldScale((<any>state).radius), intensity: kingShieldIntensity(state.capacity, initial)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = kingShieldScale(custom.radius);
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            if (attacker !== null && kingShieldContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(effect.id()) + ":" + String(attacker.ref());
                if (!kingShieldParried[key]) {
                    kingShieldParried[key] = true;
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
                kingShieldClear(effect);
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
        description: "摆出王者钢盾，为自身按总量挡下敌人打来的伤害招式，并削去接触者的攻击；变化招式照常落到身上，护盾耗尽或到时即散。",
        uses: ["挡住近战的连续伤害并削其攻击", "为下一记交手先把对手打软", "用最厚的一面钢盾硬吃齐射"],
        kind: "self",
        range: 0,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 85,
        stationary: false,
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
            MobEffects.apply(world, actor, kingShieldEffect, window, 0);
            GuardEffects.apply(world, actor, { rule: KingShieldRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: drop } as any, window);
            sound(action, "minecraft:block.anvil.place");
            action.present("world_combat:move_kingsshield:raise2", kingShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: kingShieldScale(radius), drop: drop }));
            done(action);
        }
    });
}
