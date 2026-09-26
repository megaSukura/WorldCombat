/** disable：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 普通攻击的伤害类型归成可读类别，拒绝时按真实来源显示，而不是一律「普通攻击」。 */
    function disableKind(type: string): string {
        const value = String(type || "");
        if (value === "minecraft:mob_attack" || value === "minecraft:mob_attack_no_aggro" || value === "minecraft:player_attack"
            || value === "minecraft:sting" || value === "minecraft:ram" || value === "minecraft:mace_smash") return "melee";
        if (value === "minecraft:arrow" || value === "minecraft:trident" || value === "minecraft:mob_projectile" || value === "minecraft:thrown") return "ranged";
        if (value === "minecraft:magic" || value === "minecraft:indirect_magic" || value === "minecraft:wither_skull"
            || value === "minecraft:dragon_breath" || value === "minecraft:sonic_boom") return "magic";
        return "other";
    }

    export function disableLast(world: CombatWorld, actor: CombatActor): { id: string; tick: number; native?: boolean } | null {
        if (String(actor.domain()) === "cobblemon") return NativeEffects.lastMove(world, actor);
        const last = DamageSemantics.recentAttack(world, actor, 1200);
        return last ? { id: last.type, tick: last.tick, native: true } : null;
    }
    /** 明确的时间戳：世界刻 0 也是合法时间，不用 `|| -1000` 把 0 误判成很久以前。 */
    function disableFresh(world: CombatWorld, last: { id: string; tick: number } | null, memory: number): boolean {
        if (last === null || String(last.id) === "struggle") return false;
        const tick = typeof last.tick === "number" && isFinite(last.tick) ? last.tick : -1000;
        return world.tick() - tick <= memory;
    }

    /** 机读旁挂：记下被点名的招式、所属载体、时限与画面要用的数。 */
    WorldCombat.effect(disableMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.move !== "string" || !value.move) throw new Error("Invalid disable move");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid disable window");
        if (typeof value.caster !== "string") throw new Error("Invalid disable source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(disableMark, "start", function (effect) { disableHold(effect); });
    WorldCombat.effectHandler(disableMark, "hold", function (effect) { disableHold(effect); });
    WorldCombat.effectHandler(disableMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 当前定身载体的原生钥匙；旁挂只有仍由这个载体拥有时才生效，旧钉不隔空续封。 */
    function disableCarrierKey(world: CombatWorld, actor: CombatActor): string {
        const carrier = MobEffects.read(world, actor, disableEffect);
        return carrier === null ? "" : String(carrier.key());
    }
    /** 只取仍由当前载体拥有的那枚钉；被替换的旧钉立即失效。 */
    function disableData(world: CombatWorld, actor: CombatActor): any {
        const key = disableCarrierKey(world, actor);
        if (key === "") return null;
        const views = world.effects(actor, disableMark);
        for (let i = 0; i < views.length; i++) {
            const value = JSON.parse(String(views[i].data()));
            if (String(value.carrier || "") === key) return value;
        }
        return null;
    }
    /** 清掉载体已经失效的旁挂；仍被当前载体拥有的钉保持不动。 */
    function disableReleaseStale(world: CombatWorld, actor: CombatActor): void {
        const key = disableCarrierKey(world, actor);
        world.effects(actor, disableMark).forEach(function (view) {
            if (String(JSON.parse(String(view.data())).carrier || "") !== key) world.operation(view.id(), "world_combat:dispel", "{}");
        });
    }
    /** 只撤这名施法者自己的旧钉，别人的钉与身份不动。 */
    function disableReleaseOwn(world: CombatWorld, actor: CombatActor, casterRef: string): void {
        world.effects(actor, disableMark).forEach(function (view) {
            if (JSON.parse(String(view.data())).caster === casterRef) world.operation(view.id(), "world_combat:dispel", "{}");
        });
    }
    /** 目标当前是否还拥有某一手（含临时层）；不再拥有时这一钉提前松开。 */
    function disableKnows(world: CombatWorld, actor: CombatActor, id: string): boolean {
        if (String(actor.domain()) !== "cobblemon") return true;
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor);
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            if ((layers.moves && layers.moves[String(slot)] || String(move.id())) === id) return true;
        }
        return false;
    }

    /** 钉存续期间把画面绑在旁挂自己的生命周期上；牛奶、/effect clear 或换招提前结束时钉弹开。 */
    function disableHold(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const value = JSON.parse(effect.state());
        const carrier = MobEffects.read(world, victim, disableEffect);
        if (carrier === null || String(carrier.key()) !== String(value.carrier || "")) { effect.end(); return; }
        if (!disableKnows(world, victim, String(value.move))) {
            world.removeMobEffect(victim, disableEffect, carrier.key());
            effect.end(); return;
        }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_disable/pin", disableScene, 1, body.position(),
            { moment: "hold", target: String(victim.ref()), nails: value.nails || 5, move: String(value.move),
                native: value.native ? 1 : 0, kind: value.kind || "" });
        effect.schedule("hold", "hold", 25, "{}");
    }

    // 封锁：带着定身身份的活体，在提交被点名的那一手时被顶回去。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    // 普通攻击按实际最后命中过的 damageType 精确判定，只阻这一种，不偷封所有攻击类别。
    CombatStatus.actions.define({ id: "world_combat:move_disable/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, disableStatus)) return;
        const data = disableData(context.world, context.actor);
        if (data === null || !data.move) return;
        if (context.phase === "damage" && DamageSemantics.read(context.metadata).attack) {
            const type = String(context.metadata.damageType || "");
            if (type === String(data.move)) {
                context.blocked.disabled = true;
                context.detail.disabled = { native: true, type: type, kind: disableKind(type) };
            }
        } else if (context.move && typeof context.move.id === "function" && String(context.move.id()) === String(data.move)) {
            context.blocked.disabled = true;
            context.detail.disabled = { native: false, move: String(context.move.id()) };
        }
    } });

    // 被判回的那一下要看得见：普通攻击显示真实 damageType 的可读名，宝可梦显示被点名的招式；只闪一次，不加额外惩罚。
    CombatStatus.rejected.define({ id: "world_combat:move_disable/reject", applies: function (context) {
        return String(context.reason) === "disabled";
    }, apply: function (context) {
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const details = context.details || {};
        const native = details.native === true;
        const kind = typeof details.kind === "string" ? String(details.kind) : "other";
        const move = typeof details.move === "string" ? String(details.move) : "";
        const mark = disableData(world, actor);
        const arg = native ? { key: "world_combat.move.disable.kind." + kind, fallback: kind }
            : { key: "cobblemon.move." + move, fallback: move };
        WorldFeedback.emit(world, disableScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), nails: mark === null ? 5 : mark.nails || 5, native: native ? 1 : 0, kind: kind }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), disableBlockText, [arg], 26);
    } });

    define({
        id: disableId,
        cooldownParameter: "recharge",
        name: "定身法",
        description: "封住目标刚用过的招式。对普通生物和玩家，则按最近命中过人的真实攻击类型封住，例如近战或箭矢；换一种攻击仍能出手。",
        uses: ["封住对手的主力输出招", "拆掉刚露出的强攻手段", "逼对手换招、打乱它的连招"],
        kind: "enemy",
        range: 8,
        maxRange: 20,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 120,
        style: "pin",
        defaults: { heavy: false, ai: { maxChase: 14, leaveStation: false } },
        fields: [
            flag("heavy", "重钉")
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(disableId, "reach", pokemon) : 8, geometry: "line", style: "pin",
                color: 0xE8C15A, label: config && config.heavy === true ? "定身法·重钉" : "定身法·轻钉" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[disableId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const heavy = !!(config && config.heavy);
            return {
                prepare: p(disableId, "tempo", context),
                recover: p(disableId, "aftercast", context),
                cooldown: Math.round(p(disableId, "recharge", context) * (heavy ? 1.15 : 0.85)),
                active: 0,
                range: p(disableId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const last = disableLast(world, target);
            if (!disableFresh(world, last, p(disableId, "memory", action))) return "no-move";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(disableId, "reach", action)) return "out-of-range";
            return world.clear(action.origin(), body.position()) ? "" : "no-line";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_disable:windup", disableScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: target === null ? "" : String(target.ref()),
                    nails: p(disableId, "nails", action), heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            const origin = action.origin(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = p(disableId, "reach", action);
            const memory = p(disableId, "memory", action);
            const nails = Math.max(3, Math.round(p(disableId, "nails", action)));
            sound(action, "minecraft:entity.evoker.prepare_attack");
            function fizzle(reason: string, point: CombatPoint): void {
                WorldFeedback.emit(world, disableScene, 1, point, { moment: "miss", nails: nails }, 20);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), disableMissText, [], 28);
                done(action);
            }
            // 执行时再读一次真实快照：目标换过招就点名现在这一手，不沿用旧名单、不偷封所有攻击类别。
            const last = target === null ? null : disableLast(world, target);
            if (target === null || !world.valid(target) || world.friendly(target) || !disableFresh(world, last, memory)) { fizzle("invalid-target", targetPos); return; }
            const body = world.observe(target);
            if (body === null) { fizzle("invalid-target", targetPos); return; }
            if (body.position().minus(origin).length() > reach) { fizzle("out-of-range", targetPos); return; }
            if (!world.clear(origin, body.position())) { fizzle("no-line", targetPos); return; }
            const ticks = Math.max(40, Math.round(p(disableId, "disableTicks", action)));
            const at = body.position();
            const landed = CombatStatus.apply(world, target, disableStatus, disableEffect, ticks, 0, { unique: true });
            if (!landed) { fizzle("immune", at); return; }
            const nativeMove = !!(last && last.native);
            const moveId = String(last!.id);
            const kind = nativeMove ? disableKind(moveId) : "";
            const carrier = MobEffects.read(world, target, disableEffect);
            const carrierKey = carrier === null ? "" : String(carrier.key());
            const casterRef = String(caster.ref());
            disableReleaseOwn(world, target, casterRef);
            world.effect(disableMark, target, JSON.stringify({ move: moveId, native: nativeMove, kind: kind, max: ticks,
                nails: nails, caster: casterRef, carrier: carrierKey }), ticks);
            const power = nativeMove ? 60 : CobblemonCombat.moveTemplate(moveId).power();
            WorldFeedback.emit(world, disableScene, 1, at,
                { moment: "lock", target: String(target.ref()), nails: nails, count: nails,
                  intensity: 1 + Math.min(1, power / 120), direction: [direction.x(), direction.y(), direction.z()],
                  reach: Math.max(0.5, Math.min(reach, delta.length() || reach)), native: nativeMove ? 1 : 0, kind: kind }, 34);
            // 瞬时命中的到达提示：施法者一侧的出手与命中点同帧，不沿路径伪造飞行。
            WorldFeedback.emit(world, disableScene, 1, origin,
                { moment: "cast", target: String(target.ref()), nails: nails, native: nativeMove ? 1 : 0, kind: kind,
                  reach: Math.max(0.5, Math.min(reach, delta.length() || reach)),
                  direction: [direction.x(), direction.y(), direction.z()] }, 14);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), disableLockText,
                [nativeMove ? { key: "world_combat.move.disable.kind." + kind, fallback: kind } : { key: "cobblemon.move." + moveId, fallback: moveId }], 36);
            world.sound("minecraft:block.anvil.land", at, 14, "{}");
            done(action);
        }
    });

    // 结束：到期是钉自己松开，被外力清除是被人硬拔下来，画面不同；只收掉载体已失效的旧钉。
    WorldCombat.on("world_combat:move_disable/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== disableEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        disableReleaseStale(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, disableScene, 1, body.position(),
            { moment: expired ? "release" : "break", target: String(actor.ref()), expired: expired ? 1 : 0 }, 24);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), disableFadeText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
}
