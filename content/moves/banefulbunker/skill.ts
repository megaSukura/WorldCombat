/**
 * 碉堡 / banefulbunker 的出手方式。
 *
 * 念头的形状：一座毒壁从脚边鼓起、合拢成碉堡（raise），钉在释放原位按总量挡下每一击（hold → block）；
 * 每一次直接的接触让攻击者被倒钩灌进毒液，已经在中毒的人则改灌剧毒（punish）；变化招式连人带招被毒壁封住（deflect）；
 * 主动离开原位、被推离、量尽或到时则碉堡塌成一滩（fall）。四幕：鼓壁 → 拒止 → 灌毒 → 塌壁。
 *
 * 与原位的绑定：毒壁只守施法者的落脚点（state.anchor）。施法者离开锚点超过 banefulAnchorTolerance 后，
 * 规则不再接受新的来击（accepts 拒绝），pulse 随即收掉毒壁与共享身份——「驻守原位」就是这招的代价。
 *
 * 碉堡本体是共享 GuardEffects 的 pool 模式（规则 world_combat:move_banefulbunker），撑壁期间施法者身上挂
 * 真实 MobEffect `world_combat:baneful_guard`，承载共享身份 world_combat:status/banefulbunker；
 * 封变化招式与灌毒都把「实时有效的盾」当作唯一判据：盾量尽、离位或消失时两者一起失效。
 * 每个攻击者在本盾内只灌一次，记录随盾托管效果一起结束，不会在尾段提前清空后重灌。
 */
namespace PokemonSkills {
    const banefulScene = "world_combat:move_banefulbunker";
    export const BanefulRule = "world_combat:move_banefulbunker";
    const banefulEffect = "world_combat:baneful_guard";
    const banefulHoldKey = "world_combat:move_banefulbunker:hold";
    const banefulBlockText = "world_combat.move.banefulbunker.text.block";
    const banefulPunishText = "world_combat.move.banefulbunker.text.punish";
    const banefulToxicText = "world_combat.move.banefulbunker.text.toxic";
    const banefulWardText = "world_combat.move.banefulbunker.text.ward";
    const banefulFallText = "world_combat.move.banefulbunker.text.fall";
    /** 离起点的容差（格）：脚离开这一小圈即视为离开，毒壁不再接受来击并在下一次 pulse 收场。 */
    const banefulAnchorTolerance = 0.9;
    /** 被顶回的敌方变化招式：提交点只读，先记在这里，等身份下一次 tick（可写作用域）补播画面。 */
    const banefulWards: { [ref: string]: { at: number; move: string } } = Object.create(null);
    /** 本次毒壁的原位锚点；身份移除后 fall 要在毒壁原本的位置收场，而不是跟着走开的角色。 */
    const banefulAnchors: { [ref: string]: number[] } = Object.create(null);

    function banefulScale(radius: number): number {
        return Math.max(0.5, Math.min(2.3, (radius || 1.6) / 1.6));
    }
    function banefulIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function banefulContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    function banefulAnchor(state: any): CombatPoint | null {
        const value = state ? state.anchor : null;
        if (Array.isArray(value) && value.length === 3
            && typeof value[0] === "number" && typeof value[1] === "number" && typeof value[2] === "number")
            return WorldCombat.point(value[0], value[1], value[2]);
        return null;
    }
    /** 同样的三点距离：主动走开或被顶离锚点都算离开，毒壁随之失效。 */
    function banefulStillThere(body: CombatObservation, state: any): boolean {
        const anchor = banefulAnchor(state);
        if (anchor === null) return true;
        return body.position().minus(anchor).length() <= banefulAnchorTolerance;
    }
    /** 实时有效的毒壁盾：规则匹配、盾量未尽。离位由 accepts/pulse 另行收场。 */
    function banefulGuardState(world: CombatWorld, target: CombatActor): any | null {
        const views = world.effects(target, "world_combat:guard");
        for (let i = 0; i < views.length; i++) {
            try {
                const value = JSON.parse(String(views[i].data()));
                if (value && value.rule === BanefulRule && (value.mode !== "pool" || value.capacity > 0)) return value;
            } catch (error) { }
        }
        return null;
    }
    /** 壁面实际接触点：沿锚点→攻击者方向到达毒壁外缘（不超过攻击者本身），不再取攻击者原位置。 */
    function banefulEdge(world: CombatWorld, centre: CombatPoint, attacker: CombatActor, radius: number): CombatPoint | null {
        const body = world.observe(attacker);
        if (body === null) return null;
        const away = body.position().minus(centre), length = away.length();
        if (!(length > 1e-4) || !(radius > 0)) return centre;
        return centre.plus(away.unit().scale(Math.min(radius, length)));
    }
    /** 连用计数：超过 stallReset 不用即归零，执行与失误率读同一复位结果。 */
    function banefulStall(world: CombatWorld, actor: CombatActor, action: CombatAction): number {
        return GuardEffects.stall(state(world, actor, GuardEffects.stallKey), world.tick(), p("banefulbunker", "stallReset", action));
    }

    GuardEffects.register(BanefulRule, {
        /** 只挡敌对来源的攻击；施法者已离开锚点则不再接受来击（走开即放弃剩余护池）。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null || !banefulStillThere(body, state)) return false;
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            if (!banefulStillThere(body, state)) {
                MobEffects.consume(world, effect.target(), banefulEffect);
                effect.end(); return;
            }
            const anchor = banefulAnchor(state) || body.position();
            const initial = (<any>state).initial || state.capacity || 1;
            // 持壁画面绑在毒壁这条托管效果上：随它自然到期、量尽或被离位收掉一起消失。
            WorldFeedback.onEffect(world, effect.id(), banefulHoldKey, banefulScene, 1, anchor, {
                moment: "hold", target: String(effect.target().ref()), point: [anchor.x(), anchor.y(), anchor.z()],
                radius: (<any>state).radius || 1.6, anchor: banefulAnchorTolerance,
                scale: banefulScale((<any>state).radius), intensity: banefulIntensity(state.capacity, initial)
            });
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = banefulScale(custom.radius), centre = banefulAnchor(custom) || body.position();
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            if (attacker !== null && banefulContact(incoming.data) && !world.friendly(attacker)) {
                const venomed: any = custom.venomed || (custom.venomed = {});
                const ref = String(attacker.ref());
                if (!venomed[ref]) {
                    const attackerBody = world.observe(attacker)!;
                    const contact = banefulEdge(world, centre, attacker, custom.radius) || body.position();
                    const venom = Math.max(40, custom.venom || 40);
                    // 已经在中毒的人改灌剧毒：把战场上已有的状态当材料。
                    const worsen = CombatStatus.has(world, attacker, "poison") || CombatStatus.has(world, attacker, "toxic");
                    const landed = CombatStatus.inflict(world, attacker, worsen ? "toxic" : "poison", venom);
                    // 被原生拒绝（免疫等）时不记、不播成功字，下一次接触再试。
                    if (landed) {
                        venomed[ref] = true;
                        effect.state(JSON.stringify(custom));
                        const data: any = { moment: "punish", target: ref,
                            venous: Math.max(4, Math.round(venom / 40)), worsen: worsen ? 1 : 0, landed: 1,
                            scale: scale, intensity: worsen ? 1.4 : 1,
                            // 毒从壁面实际接触点滴到攻击者：一条由壁缘到攻击者的真实连线，两帧都跟着它们走。
                            path: [[contact.x(), contact.y(), contact.z()], ref] };
                        const away = attackerBody.position().minus(contact);
                        if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
                        WorldFeedback.emit(world, banefulScene, 1, contact, data, 26);
                        WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 1.2, 0)),
                            worsen ? banefulToxicText : banefulPunishText, [], 30);
                        world.sound("cobblemon:impact.poison", contact, 14, "{}");
                    }
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            // 受击反馈落在壁缘（真实接触侧），不是攻击者原位置。
            const contact = (attacker !== null ? banefulEdge(world, centre, attacker, custom.radius) : null) || body.position();
            const data: any = { moment: "block", target: String(target.ref()), point: [contact.x(), contact.y(), contact.z()],
                radius: custom.radius || 1.6, anchor: banefulAnchorTolerance,
                scale: scale, intensity: banefulIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            const away = contact.minus(centre);
            if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            WorldFeedback.emit(world, banefulScene, 1, contact, data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), banefulBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, banefulEffect);
        }
    });

    // 封变化招：带身份的活体被敌方变化招式瞄上时，按同一份实时有效盾整条在提交点顶回。
    WorldCombat.on("world_combat:move_banefulbunker/ward", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status") return;
        const world = event.world(), target = action.target();
        if (target === null) return;
        if (String(event.actor().key()) === String(target.key())) return;
        if (world.friendly(target)) return;
        const shield = banefulGuardState(world, target);
        if (shield === null) return;
        const body = world.observe(target);
        if (body === null || !banefulStillThere(body, shield)) return;
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
        WorldFeedback.emit(world, banefulScene, 1, body.position(),
            { moment: "deflect", target: ref, radius: (banefulGuardState(world, actor) || {}).radius || 1.6, anchor: banefulAnchorTolerance }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), banefulWardText, [], 22);
        world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
    });

    WorldCombat.on("world_combat:move_banefulbunker/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== banefulEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const ref = String(actor.ref());
        delete banefulWards[ref];
        const stored = banefulAnchors[ref];
        delete banefulAnchors[ref];
        const body = world.observe(actor);
        // 毒壁钉在原位：离位塌壁也要在它原本站着的地方收场，不跟着走开的角色飘。
        const at = stored !== undefined ? WorldCombat.point(stored[0], stored[1], stored[2]) : body === null ? null : body.position();
        if (at === null) return;
        const broken = String(data.cause) === "removed";
        WorldFeedback.emit(world, banefulScene, 1, at,
            { moment: "fall", target: ref, point: [at.x(), at.y(), at.z()], broken: broken ? 1 : 0 }, 22);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.4, 0)), banefulFallText, [], 22);
    });

    define({
        id: "banefulbunker",
        cooldownParameter: "charge",
        name: "Baneful Bunker",
        description: "在落脚点合拢一座毒壁碉堡，按总量挡下敌人打来的伤害，并封住瞄准你的变化招式；离开原位、量尽或到时即塌。每一次直接接触都会让攻击者中毒，已中毒者改为剧毒。",
        uses: ["钉在原位引诱近战对手撞上毒壁", "用一次接触把对手拖进持续掉血", "封住变化招式的同时反灌毒液"],
        kind: "self",
        range: 0,
        prepare: 11,
        active: 0,
        recover: 6,
        cooldown: 95,
        stationary: true,
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
            const radius = Math.max(1.2, p("banefulbunker", "radius", action));
            action.present("world_combat:move_banefulbunker:raise", banefulScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", radius: radius, anchor: banefulAnchorTolerance, scale: banefulScale(radius) }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "banefulbunker_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const world = action.sense(), actor = action.actor(), now = world.tick();
            const count = banefulStall(world, actor, action);
            // 失误率读复位后的计数：超过 stallReset 没连用，这里就是 0。
            const source: FactContext = { world: world, actor: actor, action: action,
                state: function (id: string) { return id === GuardEffects.stallKey ? { stall: count, at: now } : state(world, actor, id); } };
            const failed = world.random() < p("banefulbunker", "fizzle", source);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = Math.max(10, Math.round(p("banefulbunker", "window", action)));
            const capacity = Math.max(6, p("banefulbunker", "capacity", action));
            const radius = Math.max(1.2, p("banefulbunker", "radius", action));
            const venom = Math.max(40, Math.round(p("banefulbunker", "venom", action)));
            const origin = action.origin();
            const now = world.tick();
            setState(world, actor, GuardEffects.stallKey, { stall: banefulStall(world, actor, action) + 1, at: now });
            banefulAnchors[String(actor.ref())] = [origin.x(), origin.y(), origin.z()];
            MobEffects.apply(world, actor, banefulEffect, window, 0);
            GuardEffects.apply(world, actor, { rule: BanefulRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, venom: venom,
                anchor: [origin.x(), origin.y(), origin.z()] } as any, window);
            sound(action, "minecraft:block.honey_block.place");
            action.present("world_combat:move_banefulbunker:raise2", banefulScene, 1, origin,
                JSON.stringify({ moment: "raise", radius: radius, anchor: banefulAnchorTolerance,
                    scale: banefulScale(radius), venom: Math.max(6, Math.round(venom / 40)) }));
            done(action);
        }
    });
}
