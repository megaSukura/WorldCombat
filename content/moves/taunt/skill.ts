/**
 * 挑衅 / taunt — 执行组织与家族行为。
 *
 * 核心念头：一句当面的挑衅把对手点着，让它在怒火里只想出招伤人；怒火上身期间，它所有非伤害招式
 *   都被顶回去。老实的封锁写在这里：共享身份 world_combat:status/taunt 由本单元的动作策略在提交点拒绝，
 *   宝可梦、原版生物、玩家一视同仁——只要带着这枚身份。
 *
 * 出手：短起手（windup 播聚怒预告）后提交；对单体敌人施放，需要一条通视直线。
 * 命中：提交时按真实射程与通视复核——起手后目标跑远、被换走或躲到墙后都算落空。喊声沿指向只走到
 *       目标或第一面真实墙面；被挡就停在墙面的实际接触点显示「话没传到」，不再预画整条线。
 *       命中挂 world_combat:taunt_rage（身份 taunt），并旁挂一枚绑定本次载体 revision 的
 *       world_combat:taunt_mark 供持续画面读取。
 * 换目标：命中后对有原生目标 AI 的敌人附一次 world.target 仇恨请求，把它的注意拉向施法者；
 *       请求被拒（Boss 内部行为、玩家、不可转向者）时不画转头，只保留怒火封锁。
 * 持续：存续期由该 MobEffect 承担；托管标记经 onEffect 每 20 刻续一次怒火画面，怒火随时间越烧越旺
 *       （motes 由剩余比例派生）。载体被刷新或移除时标记随 revision 收尾，不留失效锚。
 * 封锁：任何带 taunt 身份的活体在提交非伤害招式时被拒绝（CombatStatus.actions 贡献，reason world_combat:taunted）。
 *       识别范围是本作／已接入的原生招式（带 category 的 move），不逐 Boss 硬编码。
 * 结束：时间走完安静褪去；被牛奶、/effect clear 或覆盖时同样收场，两条岔路画面不同。
 * 反制：射程与直线之外落空；已有该身份的目标只被刷新，不叠加；可被牛奶解除。
 */
namespace PokemonSkills {
    function tauntAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    // 持续画面标记：绑定本次真实载体的 revision（key），而不是独立计时。载体被刷新或移除后，
    // watcher 因 key 不再匹配而结束；execute 也会在刷新时显式撤掉旧标记，避免失效锚与残余画面。
    WorldCombat.effect(tauntMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid taunt carrier revision");
        if (typeof value.rage !== "number" || !isFinite(value.rage) || value.rage < 1) throw new Error("Invalid taunt rage");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid taunt window");
        if (typeof value.caster !== "string") throw new Error("Invalid taunt source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function tauntWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        const value = JSON.parse(effect.state());
        const carrier = world.valid(target) ? world.mobEffect(target, tauntEffect) : null;
        if (body === null || carrier === null || String(carrier.key()) !== String(value.key)) { effect.end(); return; }
        const duration = carrier.duration();
        const remaining = duration < 0 ? value.max : Math.max(1, Math.min(value.max, duration));
        const surge = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, value.max)));
        const motes = Math.max(1, Math.round(value.rage * (0.35 + surge * 0.65)));
        WorldFeedback.onEffect(world, effect.id(), "rage", tauntScene, 1, body.position(),
            { moment: "rage", target: String(target.ref()), rage: value.rage, motes: motes, surge: surge });
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effectHandler(tauntMark, "start", tauntWatch);
    WorldCombat.effectHandler(tauntMark, "watch", tauntWatch);
    WorldCombat.effectHandler(tauntMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 怒火上身：只借共享身份，行为在本单元。任何活体带着 taunt 身份时，变化（Status）招式在提交点被拒绝。
    // 这条贡献走共享动作策略，原生配招与通用动作共用同一个提交闸门；可识别的是带 category 的 move。
    CombatStatus.actions.define({ id: "world_combat:move_taunt/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, tauntStatus)) return;
        const move = context.move;
        if (!move || typeof move.category !== "function") return;
        if (String(move.category()) !== "status") return;
        context.blocked.taunted = true;
        context.detail.taunted = {status:"taunt"};
    } });

    define({
        id: tauntId,
        cooldownParameter: "recharge",
        name: "挑衅",
        description: "当面挑衅对手，使其怒火上头；在怒火消失前，它的变化招式会被顶回去，只能使出会造成伤害的招式。喊话要有一条通视直线，墙后与射程外都会落空。",
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
            const span = delta.length();
            const direction = span < 0.01 ? action.direction() : delta.unit();
            const limit = action.range();
            const rage = Math.max(1, Math.round(p(tauntId, "rage", action)));
            const ticks = p(tauntId, "tauntTicks", action);
            // 提交点复核：目标仍成立、到其真实碰撞箱最近点在射程内、且到瞄点没有被墙挡住。
            const live = target !== null && world.valid(target) && !world.friendly(target);
            const contact = live ? world.closestPoint(target!, origin) : targetPos;
            const distance = contact.minus(origin).length();
            // 真实墙面：clipBlocks 畅通也返回 MISS，blockHit 只保留实际 BLOCK。
            const wall = live ? WorldGeometry.blockHit(world, origin, targetPos) : null;
            const reachable = live && distance <= limit + 0.5 && wall === null;
            // 喊声只喊到真实走到的地方：被墙挡住就停在墙面，够不到就停在射程边缘。
            const toTarget = Math.min(limit, span);
            const lineTo = wall === null ? toTarget : Math.min(toTarget, wall.position().minus(origin).length());
            WorldFeedback.emit(world, tauntScene, 1, origin,
                { moment: "shout", reach: lineTo, rage: rage, direction: [direction.x(), direction.y(), direction.z()],
                    target: target === null ? "" : String(target.ref()), goad: goad ? 1 : 0 }, 20);
            sound(action, "minecraft:entity.evoker.cast_spell");
            if (!reachable) {
                // 落空停在真实落点：墙面接触点，或射程边缘的实际喊断处。
                const fall = wall === null ? origin.plus(direction.scale(toTarget)) : wall.position();
                WorldFeedback.emit(world, tauntScene, 1, fall,
                    { moment: "miss", rage: rage, target: target === null ? "" : String(target.ref()) }, 18);
                WorldFeedback.text(world, tauntAbove(fall), tauntMissText, [], 30);
                done(action);
                return;
            }
            const landed = CombatStatus.apply(world, target!, tauntStatus, tauntEffect, ticks, 0, { unique: true });
            const body = world.observe(target!);
            const at = body === null ? targetPos : body.position();
            if (!landed) {
                WorldFeedback.emit(world, tauntScene, 1, at, { moment: "miss", target: String(target!.ref()), rage: rage }, 18);
                WorldFeedback.text(world, tauntAbove(at), tauntMissText, [], 30);
                done(action);
                return;
            }
            // 标记绑定本次真实载体的 revision；刷新时先撤旧标记再挂新标记，watcher 也随 key 变化结束。
            const carrier = CombatStatus.representative(world, target!, tauntStatus);
            const carrierKey = carrier === null || String(carrier.id()) !== tauntEffect ? "" : String(carrier.key());
            world.effects(target!, tauntMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            if (carrierKey) world.effect(tauntMark, target!, JSON.stringify({ key: carrierKey, rage: rage, max: ticks, caster: String(caster.ref()) }), ticks);
            const scale = Math.max(0.6, Math.min(2, ticks / 200));
            WorldFeedback.emit(world, tauntScene, 1, at,
                { moment: "taunt", target: String(target!.ref()), rage: rage, scale: scale, intensity: scale }, 34);
            WorldFeedback.text(world, tauntAbove(at), tauntRageText, [Math.round(ticks / 20)], 40);
            world.sound("cobblemon:status.down.actor", at, 14, "{}");
            // 换目标请求：一次真实请求，成功才画转头；拒绝（Boss 内部行为、玩家、不可转向者）不假播。
            const pulled = world.target(target!, caster);
            if (pulled && world.valid(caster)) {
                const toward = origin.minus(at);
                const reach = toward.length();
                const heading = reach < 0.01 ? [0, 1, 0] : [toward.x() / reach, toward.y() / reach, toward.z() / reach];
                WorldFeedback.emit(world, tauntScene, 1, at,
                    { moment: "goad", target: String(target!.ref()), rage: rage, reach: reach, direction: heading,
                        goad: goad ? 1 : 0 }, 26);
            }
            done(action);
        }
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
