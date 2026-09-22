/**
 * 碉堡 / banefulbunker 的出手方式。
 *
 * 念头的形状：一座毒壁从地面鼓起、合拢成碉堡（raise），按总量挡下每一击（hold → block）；
 * 每一次直接的接触让攻击者被倒钩灌进毒液，已经在中毒的人则改灌剧毒（punish）；变化招式连人带招被毒壁封住（deflect）；
 * 量尽或到时则碉堡塌成一滩（fall）。四幕：鼓壁 → 拒止 → 灌毒 → 塌壁。
 *
 * 碉堡本体是共享 GuardEffects 的 pool 模式（规则 world_combat:move_banefulbunker），撑壁期间施法者身上挂
 * 真实 MobEffect `world_combat:baneful_guard`，承载共享身份 world_combat:status/banefulbunker；
 * 灌毒走 CombatStatus.inflict 的共享主异常，宝可梦那侧由共享库同步成原生异常。
 */
namespace PokemonSkills {
    const banefulScene = "world_combat:move_banefulbunker";
    export const BanefulRule = "world_combat:move_banefulbunker";
    const banefulEffect = "world_combat:baneful_guard";
    const banefulStatus = "banefulbunker";
    const banefulHoldKey = "world_combat:move_banefulbunker:hold";
    const banefulBlockText = "world_combat.move.banefulbunker.text.block";
    const banefulPunishText = "world_combat.move.banefulbunker.text.punish";
    const banefulToxicText = "world_combat.move.banefulbunker.text.toxic";
    const banefulWardText = "world_combat.move.banefulbunker.text.ward";
    const banefulFallText = "world_combat.move.banefulbunker.text.fall";
    /** 表现里的参考半径：`data.scale = 实际碉堡半径 / 这个数`。 */
    const banefulReferenceRadius = 1.6;
    /** 每个攻击者在本次碉堡窗口里是否已经被灌过。 */
    const banefulVenomed: { [key: string]: boolean } = Object.create(null);
    /** 被顶回的敌方变化招式：提交点只读，先记在这里，等身份下一次 tick（可写作用域）补播画面。 */
    const banefulWards: { [ref: string]: { at: number; move: string } } = Object.create(null);

    function banefulScale(radius: number): number {
        return Math.max(0.5, Math.min(2.3, (radius || banefulReferenceRadius) / banefulReferenceRadius));
    }
    function banefulIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function banefulContact(data: any): boolean {
        return data && (data.direct === true || data.kind === "move" && data.contact === true);
    }
    function banefulClear(effect: CombatEffect): void {
        const prefix = String(effect.id()) + ":";
        Object.keys(banefulVenomed).forEach(function (entry) { if (entry.indexOf(prefix) === 0) delete banefulVenomed[entry]; });
    }

    GuardEffects.register(BanefulRule, {
        /** 只挡敌对来源的攻击；自身来源不消耗毒壁。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            if (effect.remaining() <= 8) banefulClear(effect);
            const initial = (<any>state).initial || state.capacity || 1;
            WorldFeedback.keep(world, banefulHoldKey, banefulScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                scale: banefulScale((<any>state).radius), intensity: banefulIntensity(state.capacity, initial)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = banefulScale(custom.radius);
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            if (attacker !== null && banefulContact(incoming.data) && !world.friendly(attacker)) {
                const key = String(effect.id()) + ":" + String(attacker.ref());
                if (!banefulVenomed[key]) {
                    banefulVenomed[key] = true;
                    const point = world.observe(attacker)!.position(), venom = Math.max(40, custom.venom || 40);
                    // 已经在中毒的人改灌剧毒：把战场上已有的状态当材料。
                    const worsen = CombatStatus.has(world, attacker, "poison") || CombatStatus.has(world, attacker, "toxic");
                    const landed = CombatStatus.inflict(world, attacker, worsen ? "toxic" : "poison", venom);
                    WorldFeedback.emit(world, banefulScene, 1, point, { moment: "punish", target: String(attacker.ref()),
                        venous: Math.max(4, Math.round(venom / 40)), worsen: worsen ? 1 : 0, landed: landed ? 1 : 0,
                        scale: scale, intensity: worsen ? 1.4 : 1 }, 26);
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)),
                        worsen ? banefulToxicText : banefulPunishText, [], 30);
                    world.sound("cobblemon:impact.poison", point, 14, "{}");
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: banefulIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (attacker !== null) {
                const away = body.position().minus(world.observe(attacker)!.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, banefulScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), banefulBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                banefulClear(effect);
                MobEffects.consume(world, target, banefulEffect);
            }
        }
    });

    // 封变化招：带身份的活体被敌方变化招式瞄上时，整条在提交点顶回。
    WorldCombat.on("world_combat:move_banefulbunker/ward", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status") return;
        const world = event.world(), target = action.target();
        if (target === null) return;
        if (String(event.actor().key()) === String(target.key())) return;
        if (world.friendly(target)) return;
        if (!CombatStatus.has(world, target, banefulStatus)) return;
        event.reject("banefulbunker");
        banefulWards[String(target.ref())] = { at: world.tick(), move: String(move.id()) };
    });

    WorldCombat.on("world_combat:move_banefulbunker/deflect", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== banefulEffect) return;
        const world = event.world(), actor = event.actor(), ref = String(actor.ref());
        const pending = banefulWards[ref];
        if (pending === undefined) return;
        delete banefulWards[ref];
        if (world.tick() - pending.at > 20) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, banefulScene, 1, body.position(), { moment: "deflect", target: ref }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), banefulWardText, [], 22);
        world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
    });

    WorldCombat.on("world_combat:move_banefulbunker/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== banefulEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        delete banefulWards[String(actor.ref())];
        const body = world.observe(actor);
        if (body === null) return;
        const broken = String(data.cause) === "removed";
        WorldFeedback.emit(world, banefulScene, 1, body.position(),
            { moment: "fall", target: String(actor.ref()), broken: broken ? 1 : 0 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), banefulFallText, [], 22);
    });

    define({
        id: "banefulbunker",
        name: "Baneful Bunker",
        description: "A venomous wall closes into a bunker, blocking attacks and status moves by a total pool; every direct contact poisons the attacker, and an already poisoned one is worsened to toxic.",
        uses: ["引诱近战对手撞上毒壁", "用一次接触把对手拖进持续掉血", "封住变化招式的同时反灌毒液"],
        kind: "self",
        range: 0,
        prepare: 11,
        active: 0,
        recover: 6,
        cooldown: 95,
        stationary: false,
        style: "bastion",
        defaults: { venomous: false, ai: { range: 5 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["banefulbunker"], detail: { values: config }, world, actor, attributes };
            const venomous = !!(config && config.venomous);
            return {
                prepare: p("banefulbunker", "raise", context),
                recover: venomous ? 8 : 5,
                cooldown: p("banefulbunker", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const scale = banefulScale(p("banefulbunker", "radius", action));
            action.present("world_combat:move_banefulbunker:raise", banefulScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: scale }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "banefulbunker_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("banefulbunker", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = Math.max(10, Math.round(p("banefulbunker", "window", action)));
            const capacity = Math.max(6, p("banefulbunker", "capacity", action));
            const radius = Math.max(1.2, p("banefulbunker", "radius", action));
            const venom = Math.max(40, Math.round(p("banefulbunker", "venom", action)));
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("banefulbunker", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            MobEffects.apply(world, actor, banefulEffect, window, 0);
            GuardEffects.apply(world, actor, { rule: BanefulRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, venom: venom } as any, window);
            sound(action, "minecraft:block.honey_block.place");
            action.present("world_combat:move_banefulbunker:raise2", banefulScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: banefulScale(radius), venom: Math.max(6, Math.round(venom / 40)) }));
            done(action);
        }
    });
}
