/**
 * 挑衅 / taunt — 执行组织与家族行为。
 *
 * 核心念头：一句当面的挑衅把对手点着，让它在怒火里只想出招伤人；怒火上身期间，它所有非伤害招式
 *   都被顶回去。老实的封锁写在这里：共享身份 world_combat:status/taunt 由本单元的动作策略在提交点拒绝，
 *   宝可梦、原版生物、玩家一视同仁——只要带着这枚身份。
 *
 * 出手：短起手（windup 播聚怒预告）后提交；对单体敌人施放，需要一条通视直线。
 * 命中：提交后用 action.trace 沿直线判定；命中挂 world_combat:taunt_rage（身份 taunt），
 *       并把怒火数量、时限、来源写进 world_combat:taunt_mark 供持续画面读取。
 * 持续：存续期由该 MobEffect 承担，每 20 刻 keep 一次怒火画面；怒火随时间越烧越旺（intensity 由剩余比例派生）。
 * 封锁：任何带 taunt 身份的活体在提交非伤害招式时被拒绝（CombatStatus.actions 贡献，reason world_combat:taunted）。
 * 结束：时间走完安静褪去；被牛奶、/effect clear 或覆盖时同样收场，两条岔路画面不同。
 * 反制：射程与直线之外落空；已有该身份的目标只被刷新，不叠加；可被牛奶解除。
 */
namespace PokemonSkills {
    function tauntAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function tauntMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, tauntMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    WorldCombat.effect(tauntMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.rage !== "number" || !isFinite(value.rage) || value.rage < 1) throw new Error("Invalid taunt rage");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid taunt window");
        if (typeof value.caster !== "string") throw new Error("Invalid taunt source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tauntMark, "start", function () { });
    WorldCombat.effectHandler(tauntMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 怒火上身：只借共享身份，行为在本单元。任何活体带着 taunt 身份时，变化（Status）招式在提交点被拒绝。
    // 这条贡献走共享动作策略，原生配招与通用动作共用同一个提交闸门。
    CombatStatus.actions.define({ id: "world_combat:move_taunt/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, tauntStatus)) return;
        const move = context.move;
        if (!move || typeof move.category !== "function") return;
        if (String(move.category()) !== "status") return;
        context.blocked.taunted = true;
    } });

    define({
        id: tauntId,
        cooldownParameter: "recharge",
        name: "挑衅",
        description: "当面挑衅对手，使其怒火上头；在怒火消失前，它只能使出会造成伤害的招式。喊话要有一条通视直线，墙后与射程外都会落空。",
        uses: ["逼治疗、增益、换场型的敌人只能打人", "让依赖变化招式的敌人只能转为硬拼", "给队友创造正面交战窗口"],
        kind: "enemy",
        range: 12,
        maxRange: 26,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 130,
        style: "taunt",
        defaults: { manner: "scorn" },
        fields: [
            choice("manner", "挑衅方式", ["scorn", "goad"], ["讥讽", "怒斥"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tauntId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const goad = config.manner === "goad";
            const reach = p(tauntId, "provokeReach", context);
            return {
                prepare: Math.max(4, Math.round(p(tauntId, "tempo", context)) + (goad ? -2 : 3)),
                recover: Math.round(p(tauntId, "aftercast", context)),
                cooldown: Math.max(40, Math.round(p(tauntId, "recharge", context) * (goad ? 0.85 : 1.15))),
                range: Math.round(reach * (goad ? 1.2 : 0.85) * 10) / 10,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_taunt:windup", tauntScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()),
                    goad: config.manner === "goad" ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 1.1, geometry: "point", style: "taunt", color: 0xC0392B, label: "挑衅" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), caster = action.actor(), target = action.target();
            const goad = config.manner === "goad";
            const origin = action.origin(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = Math.max(0.5, Math.min(action.range(), delta.length() || action.range()));
            const rage = Math.max(1, Math.round(p(tauntId, "rage", action)));
            const ticks = p(tauntId, "tauntTicks", action);
            // 出口的一下：声浪沿指向冲出，先让玩家看见这句挑衅往哪去。
            WorldFeedback.emit(world, tauntScene, 1, origin,
                { moment: "shout", reach: reach, rage: rage, direction: [direction.x(), direction.y(), direction.z()],
                    target: target === null ? "" : String(target.ref()), goad: goad ? 1 : 0 }, 20);
            sound(action, "minecraft:entity.evoker.cast_spell");
            // 声浪被掩体挡住或目标已不成立：这一手落空，不挂状态。
            const visible = world.clear(origin, targetPos);
            if (target === null || !world.valid(target) || world.friendly(target) || !visible) {
                WorldFeedback.emit(world, tauntScene, 1, targetPos, { moment: "miss", rage: rage }, 18);
                WorldFeedback.text(world, tauntAbove(targetPos), tauntMissText, [], 30);
                done(action);
                return;
            }
            const landed = CombatStatus.apply(world, target, tauntStatus, tauntEffect, ticks, 0, { unique: true });
            const body = world.observe(target);
            const at = body === null ? targetPos : body.position();
            if (!landed) {
                WorldFeedback.emit(world, tauntScene, 1, at, { moment: "miss", target: String(target.ref()), rage: rage }, 18);
                WorldFeedback.text(world, tauntAbove(at), tauntMissText, [], 30);
                done(action);
                return;
            }
            const previous = tauntMarkOf(world, target);
            if (previous !== null) {
                const views = world.effects(target, tauntMark);
                if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
            }
            world.effect(tauntMark, target, JSON.stringify({ rage: rage, max: ticks, caster: String(caster.ref()) }), ticks);
            const scale = Math.max(0.6, Math.min(2, ticks / 200));
            WorldFeedback.emit(world, tauntScene, 1, at,
                { moment: "taunt", target: String(target.ref()), rage: rage, scale: scale, intensity: scale }, 34);
            WorldFeedback.text(world, tauntAbove(at), tauntRageText, [Math.round(ticks / 20)], 40);
            world.sound("cobblemon:status.down.actor", at, 14, "{}");
            done(action);
        }
    });

    // 怒火存续期：每 20 刻续一次画面；怒火随时间越烧越旺，强度由标记剩余比例派生，让玩家读出现在烧到哪。
    WorldCombat.on("world_combat:move_taunt/rage", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tauntEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = tauntMarkOf(world, actor);
        if (mark === null) return;
        const views = world.effects(actor, tauntMark);
        const remaining = views.length ? views[0].remaining() : mark.max;
        const surge = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, mark.max)));
        const motes = Math.max(1, Math.round(mark.rage * (0.35 + surge * 0.65)));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_taunt/rage/" + String(actor.ref()), tauntScene, 1, body.position(),
            { moment: "rage", target: String(actor.ref()), rage: mark.rage, motes: motes, surge: surge }, 40);
    });

    // 走完自己的时间与被外力解除是两条岔路：到期是怒火自行散去，被清除是被人硬压下去，画面不同。
    WorldCombat.on("world_combat:move_taunt/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tauntEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const views = world.effects(actor, tauntMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tauntScene, 1, body.position(),
            { moment: expired ? "fade" : "subside", target: String(actor.ref()), expired: expired ? 1 : 0 }, 26);
        if (expired) WorldFeedback.text(world, tauntAbove(body.position()), tauntFadeText, [], 30);
        world.sound("cobblemon:status.up.actor", body.position(), 12, "{}");
    });
}
