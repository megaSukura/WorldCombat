/**
 * 尖刺防守 / spikyshield 的出手方式。
 *
 * 念头的形状：一圈藤刺从脚下炸开围住自己（raise），按总量完整挡下每一击（hold → block）；
 * 每一次直接的接触攻击撞上来，撞的人在接触点被刺进一根刺、当场掉血（punish）；变化招式连人带招被刺甲抖开（deflect）；
 * 量尽则藤刺倒下散开（fall）。四幕：炸甲 → 拒止 → 刺惩罚 → 收拢。
 *
 * 藤甲本体是共享 GuardEffects 的 pool 模式（规则 world_combat:move_spikyshield），规则里的 `guarded`
 * 回调完成接触穿刺。撑甲期间施法者身上挂真实 MobEffect `world_combat:spiky_guard`，它承载共享身份
 * world_combat:status/spikyshield，也是变化招式拒绝与 AI 重复施放的判据；量尽时连同身份一起收掉。
 *
 * 载体绑定：护池、去重与变化招式的防护都随同一个 `spiky_guard` 身份存亡。去重表放进护池状态本身，
 * 只在护池结束时随之消失，不再于末 8 刻提前清空；任一时刻 `spiky_guard` 被清除，护池在下一拍自行结束。
 * 变化招式由两条路封住：提交点由护池声明的 `statusWard` 顶回（带 target 的变化招），任何经共享状态路由
 * 抵达的有害状态由本单元在 `CombatStatus.gate` 上拒绝（覆盖无 target 的施加路线）。两条路都只拒绝，不假装成功。
 * 反刺走共享伤害结算，标 `indirect` 以免两个尖刺防守无限互刺；反刺的真实命中才由伤害回执播伤口。
 */
namespace PokemonSkills {
    const spikyShieldScene = "world_combat:move_spikyshield";
    export const SpikyShieldRule = "world_combat:move_spikyshield";
    const spikyShieldEffect = "world_combat:spiky_guard";
    const spikyShieldStatus = "spikyshield";
    const spikyShieldHoldKey = "world_combat:move_spikyshield:hold";
    const spikyShieldBlockText = "world_combat.move.spikyshield.text.block";
    const spikyShieldPunishText = "world_combat.move.spikyshield.text.punish";
    const spikyShieldWardText = "world_combat.move.spikyshield.text.ward";
    const spikyShieldFallText = "world_combat.move.spikyshield.text.fall";
    /** 表现里的参考半径：`data.scale = 实际藤刺半径 / 这个数`。 */
    const spikyShieldReferenceRadius = 1.6;
    /** 被顶回的敌方变化招式：提交点只读，先记在这里，等身份下一次 tick（可写作用域）补播画面。 */
    const spikyShieldWards: { [ref: string]: { at: number; move: string } } = Object.create(null);

    function spikyShieldScale(radius: number): number {
        return Math.max(0.5, Math.min(2.4, (radius || spikyShieldReferenceRadius) / spikyShieldReferenceRadius));
    }
    function spikyShieldIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function spikyShieldContact(data: any): boolean {
        return DamageSemantics.read(data).contact;
    }
    /** 从当前护池读出本招的实际藤刺半径；找不到时退回参考半径。 */
    function spikyShieldRadius(world: CombatWorld, actor: CombatActor): number {
        const guards = world.effects(actor, "world_combat:guard");
        for (let i = 0; i < guards.length; i++) {
            try {
                const state = JSON.parse(String(guards[i].data()));
                if (state.rule === SpikyShieldRule && isFinite(Number(state.radius))) return Number(state.radius);
            } catch (error) { }
        }
        return spikyShieldReferenceRadius;
    }
    /** 变化招式被抖开的同一份画面：提交点补播与状态到达拒绝都走这里。 */
    function spikyShieldDeflect(world: CombatWorld, actor: CombatActor): void {
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, spikyShieldScene, 1, body.position(),
            { moment: "deflect", target: String(actor.ref()), scale: spikyShieldScale(spikyShieldRadius(world, actor)) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), spikyShieldWardText, [], 22);
        world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
    }

    GuardEffects.register(SpikyShieldRule, {
        /** 只挡敌对来源的直接攻击：自身来源（摔落、灼伤）与已标 indirect 的反刺/环境伤害都不消耗藤甲。 */
        accepts: function (effect, state, incoming) {
            const world = effect.world();
            if (incoming.data && incoming.data.indirect === true) return false;
            return !!incoming.source && String(incoming.source.ref()) !== String(effect.target().ref()) && !world.friendly(incoming.source);
        },
        pulse: function (effect, state) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            // 身份被净化或替换、藤甲却还在：护池随身份一起结束，避免只留下拒招的假象。
            if (MobEffects.read(world, target, spikyShieldEffect) === null) { effect.end(); return; }
            const custom: any = state, initial = custom.initial || state.capacity || 1;
            const intensity = spikyShieldIntensity(state.capacity, initial);
            WorldFeedback.keep(world, spikyShieldHoldKey, spikyShieldScene, 1, body.position(), {
                moment: "hold", target: String(target.ref()),
                scale: spikyShieldScale(custom.radius), intensity: intensity,
                reach: spikyShieldReferenceRadius * intensity
            }, 20);
        },
        guarded: function (effect, state, amount, incoming) {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state, scale = spikyShieldScale(custom.radius);
            const attacker = incoming.source && String(incoming.source.ref()) !== String(target.ref()) && world.observe(incoming.source) !== null ? incoming.source : null;
            if (attacker !== null && spikyShieldContact(incoming.data) && !world.friendly(attacker)) {
                const pierced: any = custom.pierced || (custom.pierced = {});
                const key = String(attacker.ref());
                if (!pierced[key]) {
                    pierced[key] = true;
                    effect.state(JSON.stringify(state));
                    const spike = Math.max(1, custom.spike || 1);
                    const features: any = { damage: damageSpec("spikyshield", "spike"), indirect: true,
                        spikyPierce: Math.max(4, Math.round(spike)), spikyScale: scale,
                        spikyIntensity: Math.max(0.4, Math.min(1.6, spike / 24)) };
                    hurt(world, attacker, "spikyshield", spike, features);
                    // 伤口与浮字不在这里播：只有反刺真实命中（damage_applied.actual > 0）才由回执显示。
                }
            }
            const blocked = Math.round(amount * 10) / 10, remaining = Math.round(state.capacity * 10) / 10;
            const data: any = { moment: "block", target: String(target.ref()), scale: scale,
                intensity: spikyShieldIntensity(state.capacity, custom.initial || 1), blocked: blocked, remaining: remaining };
            if (attacker !== null) {
                const away = body.position().minus(world.observe(attacker)!.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, spikyShieldScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), spikyShieldBlockText, [blocked, remaining], 30);
            world.sound("minecraft:item.shield.block", body.position(), 16, "{}");
            if (state.capacity <= 0) {
                // 量尽即收：连身份一起拿掉，变化招式的封口同一刻失效；去重表随护池状态一起消失。
                MobEffects.consume(world, target, spikyShieldEffect);
            }
        }
    });

    // 反刺的真实伤口由伤害回执驱动：只有 actual > 0 才播穿刺与浮字，被拒绝/免疫的反刺不发假成功。
    PokemonDamage.onDamageApplied("world_combat:spikyshield/punish", function (receipt) {
        if (!(receipt.actual > 0)) return;
        const world = receipt.world, attacker = receipt.target, body = world.observe(attacker);
        const at = typeof receipt.x === "number" && typeof receipt.y === "number" && typeof receipt.z === "number"
            ? WorldCombat.point(receipt.x, receipt.y, receipt.z) : body === null ? null : body.position();
        if (at === null) return;
        const data = receipt.data;
        WorldFeedback.emit(world, spikyShieldScene, 1, at, { moment: "punish", target: String(attacker.ref()),
            piercing: Math.max(4, Math.round(Number(data.spikyPierce) || 8)), scale: Number(data.spikyScale) || 1,
            intensity: Number(data.spikyIntensity) || 1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), spikyShieldPunishText, [], 28);
        world.sound("minecraft:entity.player.hurt_sweet_berry_bush", at, 14, "{}");
    }, { move: "spikyshield", segment: "spike" });

    // 封变化招（带 target 的路线）：带身份的活体被敌方变化招式瞄上时，整条在提交点顶回；护池的
    // `statusWard` 声明也让共享提交点做同样的拒绝，这里补上这次抖开的画面。提交点是只读作用域，先记下这一手。
    WorldCombat.on("world_combat:move_spikyshield/ward", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status") return;
        const world = event.world(), target = action.target();
        if (target === null) return;
        if (String(event.actor().key()) === String(target.key())) return;
        if (world.friendly(target)) return;
        if (!CombatStatus.has(world, target, spikyShieldStatus)) return;
        event.reject("spikyshield");
        spikyShieldWards[String(target.ref())] = { at: world.tick(), move: String(move.id()) };
    });

    // 顶回画面的兑现点：身上身份每 tick 收到一次可写事件，发现刚被顶回的变化招就补播一记。
    WorldCombat.on("world_combat:move_spikyshield/deflect", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== spikyShieldEffect) return;
        const world = event.world(), actor = event.actor(), ref = String(actor.ref());
        const pending = spikyShieldWards[ref];
        if (pending === undefined) return;
        delete spikyShieldWards[ref];
        if (world.tick() - pending.at > 20) return;
        spikyShieldDeflect(world, actor);
    });

    // 封变化招（无 target 的真实到达路线）：任何经共享状态路由落到藤甲持有者身上的有害状态都在这里被拒绝。
    // 只问「有没有活跃护池」，与护池同生共死；自愿自施加不走这层保护。
    CombatStatus.gate.define({ id: "world_combat:move_spikyshield/gate", apply: function (context) {
        if (!context.allowed || !context.harmful) return;
        if (!GuardEffects.has(context.world, context.actor, SpikyShieldRule)) return;
        if (String(context.world.source().key()) === String(context.actor.key())) return;
        context.allowed = false; context.reason = "spikyshield";
        spikyShieldDeflect(context.world, context.actor);
    } });

    // 收：身份走完自己的时间或被外力解除时，藤刺倒下散开，并结束同一份护池，避免只留下护池或只留下拒招。
    WorldCombat.on("world_combat:move_spikyshield/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== spikyShieldEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        delete spikyShieldWards[String(actor.ref())];
        world.effects(actor, "world_combat:guard").forEach(function (guard) {
            try { if (JSON.parse(String(guard.data())).rule === SpikyShieldRule) world.operation(guard.id(), "world_combat:dispel", "{}"); }
            catch (error) { }
        });
        const body = world.observe(actor);
        if (body === null) return;
        const broken = String(data.cause) === "removed";
        WorldFeedback.emit(world, spikyShieldScene, 1, body.position(),
            { moment: "fall", target: String(actor.ref()), broken: broken ? 1 : 0 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), spikyShieldFallText, [], 22);
    });

    define({
        id: "spikyshield",
        cooldownParameter: "charge",
        name: "Spiky Shield",
        description: "在自己身上炸开一圈藤刺甲，按总量完整挡下敌人的攻击，并把指向自己的变化招式抖开；每一次被挡下的接触攻击都会反刺攻击者，同一个攻击者一次藤甲只会被扎一次。",
        uses: ["引诱近战对手贴上藤刺", "挡住齐射的同时反刺冲上来的近战", "在变化招式落下来之前连招带人一起封住"],
        kind: "self",
        range: 0,
        prepare: 10,
        active: 0,
        recover: 6,
        cooldown: 90,
        stationary: false,
        style: "bramble",
        defaults: { thorn: false, ai: { range: 5 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spikyshield"], detail: { values: config }, world, actor, attributes };
            const thorn = !!(config && config.thorn);
            return {
                prepare: p("spikyshield", "raise", context),
                recover: thorn ? 5 : 8,
                cooldown: p("spikyshield", "charge", context),
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            const scale = spikyShieldScale(p("spikyshield", "radius", action));
            action.present("world_combat:move_spikyshield:raise", spikyShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: scale }));
            return prepare;
        },
        ready: function (action, config) {
            const key = "spikyshield_fizzle", stored = action.data(key);
            if (stored !== null) return JSON.parse(stored).failed ? "world_combat:fizzle" : "";
            const failed = action.sense().random() < p("spikyshield", "fizzle", action);
            action.data(key, JSON.stringify({ failed: failed }));
            return failed ? "world_combat:fizzle" : "";
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const window = Math.max(10, Math.round(p("spikyshield", "window", action)));
            const capacity = Math.max(6, p("spikyshield", "capacity", action));
            const radius = Math.max(1.2, p("spikyshield", "radius", action));
            const spike = Math.max(1, p("spikyshield", "spike", action));
            const previous = state(world, actor, GuardEffects.stallKey), now = world.tick();
            const count = previous && typeof previous.stall === "number" && now - (previous.at || 0) <= p("spikyshield", "stallReset", action) ? previous.stall : 0;
            setState(world, actor, GuardEffects.stallKey, { stall: count + 1, at: now });
            MobEffects.apply(world, actor, spikyShieldEffect, window, 0);
            GuardEffects.apply(world, actor, { rule: SpikyShieldRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: 0, initial: capacity, radius: radius, spike: spike,
                statusWard: true } as any, window);
            sound(action, "minecraft:block.sweet_berry_bush.place");
            action.present("world_combat:move_spikyshield:raise2", spikyShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", scale: spikyShieldScale(radius), thorns: Math.max(6, Math.round(p("spikyshield", "spike", action))) }));
            done(action);
        }
    });
}
