/**
 * 无理取闹 / torment —— 注册、封锁策略与动作。
 *
 * 一幕完整：起（windup，提交前）嘴角一挑，讥讽的符环转到指尖；击（execute，提交后）符环沿直线扑到目标身上，
 *   把它钉进一段烦躁；之后的时间里，目标想再出上一手就会被顶回去（共享动作策略，reason "tormented"）。
 *
 * 与挑衅分开：挑衅封的是所有变化招式（让对手只能打人）；无理取闹不封类别，只封“你刚才用的那一手”本身，
 *   对手换一招照样能打。与怨恨分开：怨恨抽的是 PP 存量，无理取闹不碰存量，只封当下的重复。
 *
 * 反制：射程与通视之外落空；已带烦躁的目标只被刷新不叠加；可被牛奶／`/effect clear` 解除。
 */
namespace PokemonSkills {
    // 烦躁的机读旁挂：记下烦躁值、时限与来源，供持续画面读取（不是判定依据，判定只看共享身份）。
    WorldCombat.effect(tormentMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.irritation !== "number" || !isFinite(value.irritation) || value.irritation < 1) throw new Error("Invalid torment irritation");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid torment window");
        if (typeof value.caster !== "string") throw new Error("Invalid torment source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(tormentMark, "start", function () { });
    WorldCombat.effectHandler(tormentMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function tormentTallyOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, tormentMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    // 封锁：带着烦躁身份的生物，在提交它最近一次用过的同名招式时被拒绝。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    CombatStatus.actions.define({ id: "world_combat:move_torment/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, tormentStatus)) return;
        if (String(context.actor.domain()) !== "cobblemon") return;
        const move = context.move;
        if (!move || typeof move.id !== "function") return;
        const state = NativeEffects.read(context.world, context.actor);
        if (!state.used) return;
        if (String(state.used) === String(move.id())) context.blocked.tormented = true;
    } });

    // 被判回的那一下要看得见：在真正的封锁之前放一段“顶回去”的画面。
    WorldCombat.on("world_combat:move_torment/block", "world_combat:before_commit", "", function (event) {
        const world = event.world(), actor = event.actor(), action = event.action();
        if (action === null || String(actor.domain()) !== "cobblemon") return;
        if (!CombatStatus.has(world, actor, tormentStatus)) return;
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const state = NativeEffects.read(world, actor);
        if (String(state.used) !== String(executing.id())) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = tormentTallyOf(world, actor);
        WorldFeedback.emit(world, tormentScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), irritation: mark === null ? 8 : mark.irritation }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), tormentBlockText,
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 26);
    });

    define({
        id: tormentId,
        name: "无理取闹",
        description: "当面取笑一名对手，让它在一段时间里不能连续使用同一招；烦躁还在时，重复那一手会被顶回去。",
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

    // 烦躁存续期：每 20 刻续一次画面；符环数量按烦躁值走，躁动程度由标记剩余比例派生，让玩家读出现在钉到哪。
    WorldCombat.on("world_combat:move_torment/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tormentEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const mark = tormentTallyOf(world, actor);
        if (mark === null) return;
        const views = world.effects(actor, tormentMark);
        const remaining = views.length ? views[0].remaining() : mark.max;
        const surge = Math.max(0, Math.min(1, 1 - remaining / Math.max(1, mark.max)));
        const motes = Math.max(1, Math.round(mark.irritation * (0.4 + surge * 0.6)));
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_torment/linger/" + String(actor.ref()), tormentScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), irritation: mark.irritation, motes: motes, surge: surge }, 40);
    });

    // 走完自己的时间与被外力解除是两条岔路：到期是烦躁自行褪去，被清除是被人硬压下去，画面不同。
    WorldCombat.on("world_combat:move_torment/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tormentEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const expired = String(data.cause) === "expired";
        const views = world.effects(actor, tormentMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tormentScene, 1, body.position(),
            { moment: expired ? "fade" : "subside", target: String(actor.ref()), expired: expired ? 1 : 0 }, 26);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), tormentFadeText, [], 30);
        world.sound("cobblemon:status.up.actor", body.position(), 12, "{}");
    });
}
