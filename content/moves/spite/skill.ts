/**
 * 怨恨 / spite —— 注册与动作。
 *
 * 两幕：
 *   起（windup，提交前）：施法者头顶聚起一团暗紫怨念（`action.present` 预告）。
 *   追（travel，提交后）：一枚缓慢的自导怨念弹扑向目标；它每刻只肯转有限角度，目标绕到掩体后就能甩掉。
 *   咬（impact）：命中活体的那一刻读它最近一次带时戳的真实进攻，作为「被记住的一手」：
 *     - 宝可梦的一层：走 CobblemonCombat.pp 从它最后使用的那一招里抠走 `ppCut` 点 PP（只会扣、不会加）。
 *     - 通用的一层：把这条进攻身份记进被命中的目标身上（本作招式按 move 身份，原生攻击按 damageType +
 *       接触／弹道通路）。目标下一次用同一手打出有效直击时，那一击的伤害保留 `penalty`，其余部分被削掉，
 *       这笔怀恨随之耗尽；换手、换伤害类型或非伤害动作都可绕开。
 *   没有可读的真实进攻时，只结算实际扣到的 PP，不挂空怀恨。
 *
 * 与同族分开：模仿/写生把招式搬进自己身上，纹理２改写自己的属性；怨恨不改自己，只取走目标手里那一手的存量。
 * 与诡异咒语分开：诡异咒语是带伤害的远程点射顺手抽 3 点；怨恨不造成任何伤害，抽 4 点并留下需要匹配才触发的怀恨。
 * 与盘蜷（Coil）共用一次回执预算（DamageBudgets）：预约后乘系数，actual>0 才 consume；对不上不花。
 */
namespace PokemonSkills {
    const spiteScene = "world_combat:move_spite";
    const SPITE_EFFECT = "world_combat:spite_grudge";
    const spiteHold = "world_combat:move_spite/hold";
    const spiteBiteText = "world_combat.move.spite.text.bite";
    const spiteMarkText = "world_combat.move.spite.text.mark";
    const spiteNoMemoryText = "world_combat.move.spite.text.nomemory";
    const spiteSpendText = "world_combat.move.spite.text.spend";
    const spiteFizzleText = "world_combat.move.spite.text.fizzle";

    /** 被记住的那一手：本作招式按 move 身份，原生攻击按 damageType 与接触／弹道通路。 */
    interface SpiteIdentity { kind: "move" | "native"; move: string; damageType: string; path: string; }
    interface SpiteHold { budget: number; carrier: MobEffects.Anchor; identity: SpiteIdentity; penalty: number; shards: number; }

    /** 目标最近一次真正放出的招式，仍在记忆窗口内时返回它。 */
    function spiteMemory(current: CombatAction, target: CombatActor): { id: string; slot: number; key: string } | null {
        if (String(target.domain()) !== "cobblemon") return null;
        const world = current.sense(), state = NativeEffects.read(world, target);
        if (!state.used || world.tick() - (state.usedTick || -1000) > p("spite", "memory", current)) return null;
        const last = NativeEffects.lastMove(world, target);
        return last === null ? null : { id: last.id, slot: last.slot, key: last.key };
    }

    /** 从目标招式表里找到那一手，扣掉 cut 点 PP；返回实际扣掉的点数（0 表示没扣动）。 */
    function spiteCut(world: CombatWorld, target: CombatActor, found: { id: string; slot: number; key: string }, cut: number): number {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return 0;
        const pokemon = CobblemonCombat.pokemon(target);
        let slot = found.slot;
        const keyMatches = (move: CombatPokemonMove | null): boolean => move !== null && String(move.id()) === found.id && (!found.key || String(move.key()) === found.key);
        if (slot < 0 || slot >= pokemon.moveSlots() || !keyMatches(pokemon.move(slot))) {
            slot = -1;
            for (let index = 0; index < pokemon.moveSlots(); index++) {
                if (keyMatches(pokemon.move(index))) { slot = index; break; }
            }
        }
        const move = slot < 0 ? null : pokemon.move(slot);
        if (move === null || String(move.id()) !== found.id) return 0;
        const before = move.pp(), after = Math.max(0, before - cut);
        if (after === before) return 0;
        return CobblemonCombat.pp(world, target, slot, String(move.key()), before, after) ? before - after : 0;
    }

    /** 来袭通路：真实接触、真实弹体或其余。与命中时记录的通路同一套判定。 */
    function spitePath(data: any): string {
        if (data.directProjectile === true) return "projectile";
        return DamageSemantics.read(data).contact ? "contact" : "direct";
    }
    function spiteOffense(world: CombatWorld, target: CombatActor, memory: number): SpiteIdentity | null {
        const recent = DamageSemantics.recentOffense(world, target, memory);
        if (!recent || typeof recent.directProjectile !== "boolean") return null;
        const path = recent.directProjectile ? "projectile" : recent.contact ? "contact" : "direct";
        if (recent.kind === "move") return recent.move ? { kind: "move", move: recent.move.replace(/^world_combat:/, ""), damageType: "", path } : null;
        return recent.type ? { kind: "native", move: "", damageType: recent.type, path } : null;
    }
    function spiteMatch(identity: SpiteIdentity, data: any): boolean {
        if (identity.kind === "move") {
            if (data.kind !== "move") return false;
            const move = String(data.move || "");
            return move.replace(/^world_combat:/, "") === identity.move && spitePath(data) === identity.path;
        }
        if (data.kind === "move") return false;
        if (String(data.damageType || "") !== identity.damageType) return false;
        return identity.path === spitePath(data);
    }

    /** 怀恨的载体旁挂：保存预算、载体锚与身份；随托管效果生命周期清理，不留下失效锚。 */
    WorldCombat.effect(spiteHold, 1, 1200000, "actor", json => json, EffectProtocols.unchanged);
    /** 预算仍有效、且载体仍是当前那一次应用时，旁挂才成立。 */
    function spiteHeld(effect: CombatEffect, value: SpiteHold): boolean {
        const world = effect.world(), actor = effect.target();
        const budget = DamageBudgets.read(world, { actor, id: value.budget });
        return !!budget && budget.remaining > 0 && MobEffects.matches(world, actor, value.carrier);
    }
    function spiteStart(effect: CombatEffect): void {
        const value: SpiteHold = JSON.parse(effect.state());
        if (!spiteHeld(effect, value)) { effect.end(); return; }
        const world = effect.world(), actor = effect.target();
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        // 表现随托管效果存续：只在此处发布一次，目标每帧由 target 锚跟随，预算耗尽即随效果结束。
        WorldFeedback.onEffect(world, effect.id(), "spite:held", spiteScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), shards: value.shards, penalty: value.penalty,
                native: value.identity && value.identity.kind === "native" ? 1 : 0 });
        WorldFeedback.onEffect(world, effect.id(), "spite:identity", "world_combat:move_spite_identity", 1, body.position(),
            { target: String(actor.ref()), move: value.identity.move, path: value.identity.path });
        effect.schedule("watch", "watch", 20, "{}");
    }
    function spiteWatch(effect: CombatEffect): void {
        const value: SpiteHold = JSON.parse(effect.state());
        if (!spiteHeld(effect, value)) { effect.end(); return; }
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(spiteHold, "start", spiteStart);
    WorldCombat.effectHandler(spiteHold, "watch", spiteWatch);
    WorldCombat.effectHandler(spiteHold, "operation:world_combat:dispel", effect => effect.end());

    // 匹配即削：只有真正被记住的那一手、且按本次回执预约成功时才乘系数；对不上不花。
    DamageBudgets.modifiers.define({ id: "world_combat:spite/penalty", apply: context => {
        const data = context.data;
        if (!(data.amount > 0) || String(context.source.ref()) === String(context.target.ref())) return;
        if (!DamageSemantics.directOffense(data)) return;
        const marks = context.world.effects(context.source, spiteHold);
        for (const mark of marks) {
            const value: SpiteHold = JSON.parse(mark.data());
            if (!MobEffects.matches(context.world, context.source, value.carrier)) continue;
            if (!spiteMatch(value.identity, data)) continue;
            const claims = DamageBudgets.reserve(context, [{ actor: context.source, id: value.budget }]);
            if (!claims) continue;
            const factor = Math.max(0, Math.min(1, 1 - value.penalty));
            data.amount *= factor;
            data.spiteFactor = factor;
            return;
        }
    } });

    // 怀恨被匹配的一击用掉：收起载体与旁挂，在目标身上碎开。实结回执写进 payload 的身份随预算耗尽。
    WorldCombat.on("world_combat:spite/spend", "world_combat:damage_settled", DamageBudgets.settledHook, event => {
        const world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data()));
        for (const result of DamageBudgets.results(data)) {
            if (!result.committed || !result.payload || result.payload.move !== "spite") continue;
            if (!world.valid(actor) || result.actor !== String(actor.ref())) continue;
            const carrier: MobEffects.Anchor = result.payload.carrier;
            world.removeMobEffect(actor, carrier.id, carrier.key);
            world.effects(actor, spiteHold).forEach(view => {
                if (JSON.parse(String(view.data())).budget === result.id) world.operation(view.id(), "world_combat:dispel", "{}");
            });
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, spiteScene, 1, body.position(),
                    { moment: "shatter", target: String(actor.ref()), shards: result.payload.shards || 8, penalty: result.payload.penalty || 0 }, 20);
                WorldFeedback.text(world, body.position(), spiteSpendText, [], 30);
            }
        }
    });

    // 载体到期或被清除：收掉已失效的旁挂；自然到期额外淡散。
    WorldCombat.on("world_combat:spite/fade", "world_combat:mob_effect_removed", "", event => {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== SPITE_EFFECT) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, spiteHold).forEach(view => {
            const value: SpiteHold = JSON.parse(String(view.data()));
            if (!MobEffects.matches(world, actor, value.carrier)) world.operation(view.id(), "world_combat:dispel", "{}");
        });
        if (String(data.cause) === "expired") {
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.emit(world, spiteScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 20);
        }
    });

    define({
        id: "spite",
        cooldownParameter: "recharge",
        name: "Spite",
        description: "向一个目标送出一道缓慢、会自动转向的怨念：命中时记住它最近一次真实进攻。它再用同一手打出有效直击时，这一击的伤害被削去一份，怀恨随之用掉；换手或非伤害动作不受影响。命中宝可梦还会从它最后使用的那一招里抠走 4 点 PP。没有可读的近期进攻时只结算 PP。怨念本身不造成伤害，追不上、被甩开或撞到障碍就散去。",
        uses: ["让对手刚打疼你的那一手下一击变钝", "抠掉对手关键招式的 PP", "惩罚重复依赖同一招的目标"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 48,
        style: "grudge",
        defaults: { ai: { maxChase: 14, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spite", "collisionRadius", pokemon), geometry: "line", style: "grudge", color: 0x5B3FA0, label: "怨念弹道" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spite"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p("spite", "charge", context),
                recover: p("spite", "afterglow", context),
                cooldown: p("spite", "recharge", context),
                active: 0,
                range: p("spite", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:spite:" + action.id(), spiteScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shards: p("spite", "shards", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            const speed = p("spite", "boltSpeed", action);
            const turn = p("spite", "wispTurn", action);
            const radius = p("spite", "collisionRadius", action);
            const cut = Math.max(1, Math.round(p("spite", "ppCut", action)));
            const shards = Math.max(6, Math.round(p("spite", "shards", action)));
            const memory = Math.max(20, Math.round(p("spite", "memory", action)));
            const grudgeTicks = Math.max(40, Math.round(p("spite", "grudgeTicks", action)));
            const penalty = Math.max(0.05, Math.min(0.95, p("spite", "penalty", action)));
            sound(action, "minecraft:entity.evoker.cast_spell");

            const appearance: LivingActions.ProjectileAppearance = { sprite: "cobblemon:generic/orb/xsfadeorb", tint: 0x5B3FA0, glow: true, scale: Math.max(0.9, radius / 0.28) };
            if (targetRef) appearance.homing = { target: targetRef, turn: turn, delay: 3, range: action.range() };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 240, appearance: appearance,
                impact: function (current, hit) {
                    const scope = current.world(), struck = hit.target();
                    if (struck === null || !scope.valid(struck) || scope.friendly(struck)) {
                        WorldFeedback.emit(scope, spiteScene, 1, hit.position(), { moment: "fizzle", shards: shards }, 22);
                        WorldFeedback.text(scope, hit.position(), spiteFizzleText, [], 26);
                        scope.sound("minecraft:block.soul_soil.break", hit.position(), 16, "{}");
                        return;
                    }
                    const ref = String(struck.ref()), point = hit.position();
                    const found = spiteMemory(current, struck);
                    const taken = found === null ? 0 : spiteCut(scope, struck, found, cut);
                    const identity = spiteOffense(scope, struck, memory);
                    let grudged = false;
                    if (identity !== null) {
                        const landed = CombatStatus.apply(scope, struck, "grudge", SPITE_EFFECT, grudgeTicks, 0, { unique: true });
                        const carrier = landed ? MobEffects.read(scope, struck, SPITE_EFFECT) : null;
                        if (carrier !== null) {
                            const anchor = MobEffects.anchor(carrier);
                            const budget = DamageBudgets.open(scope, struck, grudgeTicks, {
                                uses: 1, anchor: anchor,
                                payload: { move: "spite", carrier: anchor, identity: identity, penalty: penalty, shards: shards } });
                            if (budget !== null) {
                                scope.effect(spiteHold, struck, JSON.stringify({ budget: budget.id, carrier: anchor, identity: identity, penalty: penalty, shards: shards }), grudgeTicks);
                                grudged = true;
                            } else {
                                scope.removeMobEffect(struck, SPITE_EFFECT, carrier.key());
                            }
                        }
                    }
                    if (grudged) WorldFeedback.emit(scope, spiteScene, 1, point, {
                        moment: "bind", target: ref, shards: shards,
                        native: identity !== null && identity.kind === "native" ? 1 : 0
                    }, 34);
                    if (taken > 0) WorldFeedback.emit(scope, spiteScene, 1, point, {
                        moment: "bite", target: ref, shards: shards, taken: taken,
                        intensity: 1 + Math.min(1, taken / Math.max(1, cut))
                    }, 34);
                    if (!grudged && taken <= 0) WorldFeedback.emit(scope, spiteScene, 1, point, { moment: "empty", shards: shards }, 28);
                    if (taken > 0) {
                        WorldFeedback.text(scope, point, spiteBiteText, [taken], 34);
                        scope.sound("minecraft:block.amethyst_block.break", point, 16, "{}");
                    } else if (grudged) {
                        WorldFeedback.text(scope, point, spiteMarkText, [], 32);
                        scope.sound("minecraft:entity.evoker.cast_spell", point, 16, "{}");
                    } else {
                        WorldFeedback.text(scope, point, spiteNoMemoryText, [], 30);
                    }
                }
            }, done);
            WorldFeedback.emit(world, spiteScene, 1, action.origin(), { moment: "travel", projectile: flight, target: targetRef,
                shards: shards, flow: Math.round(16 + speed * 14) }, 60);
        }
    });
}
