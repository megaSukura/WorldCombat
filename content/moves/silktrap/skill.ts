/**
 * 线阱 / silktrap 的出手方式。
 *
 * 念头的形状：一张丝网贴地绷起、围住自己（raise），按总量挡下打来的伤害招式（hold → block）；
 * 第一记**直接接触**撞上丝网时，网向那名敌人收束，把他的脚缠上残丝、压低速（punish），
 * 同一刻余网被一次抽干——丝网松开、自己脱身（fall）。远射的伤害仍按原池吸收，但不抓人、也不收网。
 * 三幕：绷网 → 拒止 → 缠足脱身。
 *
 * 丝网本体是共享 GuardEffects 的 pool 模式（规则 world_combat:move_silktrap），撑网期间施法者身上挂
 * 真实 MobEffect `world_combat:silk_guard`，承载共享身份 world_combat:status/silktrap。
 * 缠足只给原降速（NativeEffects.boost）：一次防住换一次脱身机会，不再附 rooted，区别于一族里的万能禁锢。
 * 打磨：变化招式不进 pool，所以**会照常落到身上**——这是它与尖刺防守／碉堡的取舍，说明里写明。
 */
namespace PokemonSkills {
    const silkTrapScene = "world_combat:move_silktrap";
    export const SilkTrapRule = "world_combat:move_silktrap";
    const silkTrapEffect = "world_combat:silk_guard";
    const silkTrapHoldKey = "world_combat:move_silktrap:hold";
    const silkTrapBlockText = "world_combat.move.silktrap.text.block";
    const silkTrapPunishText = "world_combat.move.silktrap.text.punish";
    const silkTrapFallText = "world_combat.move.silktrap.text.fall";
    /** 表现里的参考半径：`data.scale = 实际丝网半径 / 这个数`。 */
    const silkTrapReferenceRadius = 1.6;
    /** 每个攻击者在本次丝网窗口里是否已经被缠过；接触即收网，这里保证一网对一人只缠一次。 */
    const silkTrapSnared: { [key: string]: boolean } = Object.create(null);

    function silkTrapScale(radius: number): number {
        return Math.max(0.5, Math.min(2.4, (radius || silkTrapReferenceRadius) / silkTrapReferenceRadius));
    }
    function silkTrapIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function silkTrapContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    /** 真实的来袭接触侧：原生 sourcePosition；缺省时退回来源身体位置；都没有就不给坐标，不捏造。 */
    function silkTrapContactPoint(world: CombatWorld, attacker: CombatActor | null, data: any): CombatPoint | null {
        const source = data ? data.sourcePosition : null;
        if (Array.isArray(source) && source.length === 3
            && typeof source[0] === "number" && typeof source[1] === "number" && typeof source[2] === "number")
            return WorldCombat.point(source[0], source[1], source[2]);
        const body = attacker ? world.observe(attacker) : null;
        return body === null ? null : body.position();
    }
    function silkTrapClear(effectId: number): void {
        const prefix = String(effectId) + ":";
        Object.keys(silkTrapSnared).forEach(function (entry) { if (entry.indexOf(prefix) === 0) delete silkTrapSnared[entry]; });
    }

    GuardEffects.register(SilkTrapRule, {
        /** 只挡敌对来源的伤害；变化招式与自身来源都不进这条。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), body = world.observe(effect.target());
            if (body === null) return;
            if (effect.remaining() <= 8) silkTrapClear(effect.id());
            const initial = (<any>state).initial || state.capacity || 1;
            WorldFeedback.keep(world, silkTrapHoldKey, silkTrapScene, 1, body.position(), {
                moment: "hold", target: String(effect.target().ref()),
                scale: silkTrapScale((<any>state).radius), intensity: silkTrapIntensity(state.capacity, initial)
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = silkTrapScale(custom.radius);
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            const contact = attacker !== null && silkTrapContact(incoming.data) && !world.friendly(attacker);
            if (contact && attacker !== null) {
                const key = String(effect.id()) + ":" + String(attacker.ref());
                if (!silkTrapSnared[key]) {
                    silkTrapSnared[key] = true;
                    const drop = Math.max(1, custom.drop || 1);
                    const attackerBody = world.observe(attacker)!;
                    const point = attackerBody.position();
                    const hit = silkTrapContactPoint(world, attacker, incoming.data) || body.position();
                    // 一记接触把余网抽干：只给原降速（不再附 rooted），随后收网脱身。
                    NativeEffects.boost(world, attacker, "spe", -drop);
                    const cinch: any = { moment: "cinch", target: String(target.ref()), point: [hit.x(), hit.y(), hit.z()],
                        blocked: Math.round(amount * 10) / 10, drop: drop, scale: scale,
                        intensity: Math.max(0.4, Math.min(1.5, drop / 2)),
                        path: [[body.position().x(), body.position().y(), body.position().z()], String(attacker.ref())] };
                    const away = point.minus(body.position());
                    if (away.length() > 0.01) { const direction = away.unit(); cinch.direction = [direction.x(), direction.y(), direction.z()]; }
                    WorldFeedback.emit(world, silkTrapScene, 1, body.position(), cinch, 24);
                    WorldFeedback.emit(world, silkTrapScene, 1, point, { moment: "punish", target: String(attacker.ref()),
                        threads: Math.max(4, Math.round(drop * 5)), drop: drop, scale: scale,
                        intensity: Math.max(0.4, Math.min(1.5, drop / 2)) }, 26);
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.2, 0)), silkTrapPunishText, [drop], 30);
                    world.sound("minecraft:block.cobweb.hit", point, 14, "{}");
                }
                // 接触成功挡下：立刻抽干余网、结束保护，fall 里自己脱网。
                silkTrapClear(effect.id());
                MobEffects.consume(world, target, silkTrapEffect);
                effect.end(); return;
            }
            // 未接触的远伤仍按原池吸收，但既不抓人也不收网。
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: silkTrapIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (attacker !== null) {
                const away = body.position().minus(world.observe(attacker)!.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, silkTrapScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), silkTrapBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                silkTrapClear(effect.id());
                MobEffects.consume(world, target, silkTrapEffect);
            }
        }
    });

    WorldCombat.on("world_combat:move_silktrap/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== silkTrapEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const broken = String(data.cause) === "removed";
        WorldFeedback.emit(world, silkTrapScene, 1, body.position(),
            { moment: "fall", target: String(actor.ref()), broken: broken ? 1 : 0 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), silkTrapFallText, [], 22);
    });

    define({
        id: "silktrap",
        cooldownParameter: "charge",
        name: "Silk Trap",
        description: "铺开一张丝网保护自己，按总量挡下对手的伤害招式（超出的伤害照常命中）；第一记接触攻击撞上来时网向它收束，压低其速度，余网随即抽干、自己脱身；变化招式会穿过丝网。",
        uses: ["从一名近身追击者手里脱身", "用一次接触换掉追击者的速度", "用最韧的一张网硬挡远程伤害"],
        kind: "self",
        range: 0,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 85,
        stationary: false,
        style: "web",
        defaults: { snare: false, ai: { range: 5 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["silktrap"], detail: { values: config }, world, actor, attributes };
            const snare = !!(config && config.snare);
            return {
                prepare: p("silktrap", "raise", context),
                recover: snare ? 7 : 5,
                cooldown: p("silktrap", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const scale = silkTrapScale(p("silktrap", "radius", action));
            action.present("world_combat:move_silktrap:raise", silkTrapScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: scale }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "silktrap_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("silktrap", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = Math.max(10, Math.round(p("silktrap", "window", action)));
            const capacity = Math.max(6, p("silktrap", "capacity", action));
            const radius = Math.max(1.2, p("silktrap", "radius", action));
            const drop = Math.max(1, Math.round(p("silktrap", "drop", action)));
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("silktrap", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            MobEffects.apply(world, actor, silkTrapEffect, window, 0);
            GuardEffects.apply(world, actor, { rule: SilkTrapRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, drop: drop } as any, window);
            sound(action, "minecraft:block.cobweb.place");
            action.present("world_combat:move_silktrap:raise2", silkTrapScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: silkTrapScale(radius), threads: Math.max(6, Math.round(drop * 5)) }));
            done(action);
        }
    });
}
