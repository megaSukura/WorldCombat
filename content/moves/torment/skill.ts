/** torment：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 普通攻击的伤害类型归成可读类别，用于拒绝说明与断拍标记（与裸的 damageType 分开）。 */
    function tormentKind(type: string): string {
        const value = String(type || "");
        if (value === "minecraft:mob_attack" || value === "minecraft:mob_attack_no_aggro" || value === "minecraft:player_attack"
            || value === "minecraft:sting" || value === "minecraft:ram" || value === "minecraft:mace_smash") return "melee";
        if (value === "minecraft:arrow" || value === "minecraft:trident" || value === "minecraft:mob_projectile" || value === "minecraft:thrown") return "ranged";
        if (value === "minecraft:magic" || value === "minecraft:indirect_magic" || value === "minecraft:wither_skull"
            || value === "minecraft:dragon_breath" || value === "minecraft:sonic_boom") return "magic";
        return "other";
    }

    function tormentTallyOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, tormentMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    // 烦躁存续的托管标记：把「头上双节拍」绑在真实状态的生命周期上，自然到期、牛奶／`/effect clear`
    // 提前拿掉都随它一起停；表现用 onEffect 绑本标记，标记一收画面立刻停，不靠自己的计时。
    function tormentLinger(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target), carrier = world.mobEffect(target, tormentEffect);
        if (body === null || carrier === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(6000, carrier.duration()));
        const surge = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, data.max)));
        const beat = Math.floor(world.tick() / 10) % 2;
        WorldFeedback.onEffect(world, effect.id(), "linger", tormentScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), irritation: data.irritation, surge: surge, beat: beat,
                litLeft: beat === 0 ? 1 : 0, litRight: beat === 1 ? 1 : 0,
                dimLeft: beat === 0 ? 0 : 1, dimRight: beat === 1 ? 0 : 1, kind: data.lastKind || "" });
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 10, "{}");
    }
    WorldCombat.effect(tormentMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.irritation !== "number" || !isFinite(value.irritation) || value.irritation < 1) throw new Error("Invalid torment irritation");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid torment window");
        if (typeof value.caster !== "string") throw new Error("Invalid torment source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tormentMark, "start", tormentLinger);
    WorldCombat.effectHandler(tormentMark, "watch", tormentLinger);
    WorldCombat.effectHandler(tormentMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 不同的攻击成功落下时，把这一拍记进标记：持续画面据此亮出新的节拍。
    WorldCombat.effectHandler(tormentMark, "operation:world_combat:move_torment/beat", function (effect) {
        const value = JSON.parse(effect.input() || "{}");
        if (typeof value.type !== "string") return;
        const data = JSON.parse(effect.state());
        data.last = String(value.type); data.lastKind = String(value.kind || "");
        effect.state(JSON.stringify(data));
    });

    // 封锁：带着烦躁身份的生物，在提交它最近一次用过的同名招式时被拒绝。
    // 普通攻击按实际成功命中过的攻击类型判定（recentAttack 只记真正造成伤害的那一下），不是 AI 意图。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    CombatStatus.actions.define({ id: "world_combat:move_torment/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, tormentStatus)) return;
        if (context.phase === "damage" && DamageSemantics.read(context.metadata).attack) {
            const last = DamageSemantics.recentAttack(context.world, context.actor, 30);
            if (last && last.type === String(context.metadata.damageType)) {
                context.blocked.tormented = true;
                context.detail.tormented = { kind: tormentKind(last.type), type: String(last.type) };
            }
            return;
        }
        if (String(context.actor.domain()) !== "cobblemon") return;
        const move = context.move;
        if (!move || typeof move.id !== "function") return;
        const state = NativeEffects.read(context.world, context.actor);
        if (!state.used) return;
        if (String(state.used) === String(move.id())) {
            context.blocked.tormented = true;
            context.detail.tormented = { move: String(move.id()) };
        }
    } });

    // 被判回的那一下要看得见：普通攻击与宝可梦共用同一张回执，头上亮出断拍符号并写清原因。
    // 不另叠减速或伤害，拒绝只是拒绝。
    CombatStatus.rejected.define({ id: "world_combat:move_torment/reject", applies: function (context) {
        return String(context.reason) === "tormented";
    }, apply: function (context) {
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = tormentTallyOf(world, actor);
        const details = context.details || {};
        const move = typeof details.move === "string" ? String(details.move) : "";
        const kind = typeof details.kind === "string" ? String(details.kind) : "";
        const arg = move ? { key: "cobblemon.move." + move, fallback: move }
            : { key: "world_combat.move.torment.kind." + (kind || "other"), fallback: kind || "attack" };
        WorldFeedback.emit(world, tormentScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), irritation: mark === null ? 8 : mark.irritation, kind: kind }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), tormentBlockText, [arg], 26);
    } });

    // 换了一种攻击并真正打中：下一拍更新，持续画面的节拍随之翻到新的一手。
    WorldCombat.on("world_combat:move_torment/beat", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data()));
        if (!world.valid(actor) || !(data.actual > 0)) return;
        if (!CombatStatus.has(world, actor, tormentStatus)) return;
        if (!DamageSemantics.read(data).attack) return;
        const views = world.effects(actor, tormentMark);
        if (!views.length) return;
        const mark = JSON.parse(String(views[0].data()));
        const type = String(data.damageType);
        if (String(mark.last || "") === type) return;
        world.operation(views[0].id(), "world_combat:move_torment/beat", JSON.stringify({ type: type, kind: tormentKind(type) }));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tormentScene, 1, body.position(),
            { moment: "beat", target: String(actor.ref()), irritation: mark.irritation, kind: tormentKind(type) }, 16);
    });

    define({
        id: tormentId,
        cooldownParameter: "recharge",
        name: "无理取闹",
        description: "让目标烦躁，打乱重复出手的节奏。宝可梦不能连续使用同一招；普通生物和玩家连续使用同一种攻击时，需要多等一拍。",
        uses: ["拆掉只会一招的对手的节奏", "逼对手换招", "惩罚仰赖同一次连击的敌人"],
        kind: "enemy",
        range: 12,
        maxRange: 22,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 110,
        style: "torment",
        defaults: { manner: 1, ai: { maxChase: 14, leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            return { radius: p(tormentId, "reach", pokemon), geometry: "line", style: "torment", color: 0x8E5BD0,
                label: read(config, ["manner"]) === 1 ? "无理取闹·讥讽" : "无理取闹·怒斥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[tormentId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p(tormentId, "tempo", context),
                recover: p(tormentId, "aftercast", context),
                cooldown: p(tormentId, "recharge", context),
                active: 0,
                range: p(tormentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_torment:windup", tormentScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: target === null ? "" : String(target.ref()),
                    path: [String(action.actor().ref()), target === null ? String(action.actor().ref()) : String(target.ref())],
                    irritation: p(tormentId, "irritation", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            const origin = action.origin(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = Math.max(0.5, Math.min(action.range(), delta.length() || action.range()));
            const irritation = Math.max(1, Math.round(p(tormentId, "irritation", action)));
            const ticks = Math.max(40, Math.round(p(tormentId, "tormentTicks", action)));
            WorldFeedback.emit(world, tormentScene, 1, origin,
                { moment: "cast", target: target === null ? "" : String(target.ref()),
                    path: [String(caster.ref()), target === null ? String(caster.ref()) : String(target.ref())],
                    reach: reach, irritation: irritation, direction: [direction.x(), direction.y(), direction.z()] }, 22);
            sound(action, "minecraft:entity.pillager.celebrate");
            const visible = world.clear(origin, targetPos);
            if (target === null || !world.valid(target) || world.friendly(target) || !visible) {
                WorldFeedback.emit(world, tormentScene, 1, targetPos, { moment: "miss", irritation: irritation }, 18);
                WorldFeedback.text(world, targetPos.plus(WorldCombat.point(0, 1, 0)), tormentTurnText, [], 30);
                done(action);
                return;
            }
            const landed = CombatStatus.apply(world, target, tormentStatus, tormentEffect, ticks, 0, { unique: true });
            const body = world.observe(target);
            const at = body === null ? targetPos : body.position();
            if (!landed) {
                WorldFeedback.emit(world, tormentScene, 1, at, { moment: "miss", target: String(target.ref()), irritation: irritation }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1, 0)), tormentTurnText, [], 30);
                done(action);
                return;
            }
            const previous = tormentTallyOf(world, target);
            if (previous !== null) {
                const views = world.effects(target, tormentMark);
                if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
            }
            world.effect(tormentMark, target, JSON.stringify({ irritation: irritation, max: ticks, caster: String(caster.ref()) }), ticks);
            WorldFeedback.emit(world, tormentScene, 1, at,
                { moment: "lock", target: String(target.ref()), irritation: irritation,
                    scale: Math.max(0.6, Math.min(2, ticks / 240)), intensity: Math.max(0.5, Math.min(1.6, ticks / 260)) }, 34);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1, 0)), tormentLockText, [Math.round(ticks / 20)], 40);
            world.sound("cobblemon:status.down.actor", at, 14, "{}");
            done(action);
        }
    });

    // 走完自己的时间与被外力解除是两条岔路：到期是烦躁自行褪去，被清除是被人硬压下去，画面不同。
    WorldCombat.on("world_combat:move_torment/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tormentEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const views = world.effects(actor, tormentMark);
        const mark = views.length ? JSON.parse(String(views[0].data())) : null;
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tormentScene, 1, body.position(),
            { moment: expired ? "fade" : "subside", target: String(actor.ref()), expired: expired ? 1 : 0,
                irritation: mark === null ? 8 : mark.irritation }, 26);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), tormentFadeText, [], 30);
        world.sound("cobblemon:status.up.actor", body.position(), 12, "{}");
    });
}
