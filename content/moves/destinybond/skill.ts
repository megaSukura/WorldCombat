/**
 * 同命 / destinybond —— 执行组织。
 *
 * 核心念头：当众把一条命线系在自己身上——接下来谁亲手把你打倒，线就绷紧，把你送走的那个也一起倒下。
 *
 * 两幕 + 偿：
 *   起（windup 只在身上聚起红线预告，提交前可打断，不花代价）→
 *   结（提交后：挂共享身份 world_combat:status/destiny_bond 的真实 MobEffect，留下机读标记带走画面用的线头与半径；
 *       死结取向下同时把自己 rooted 在结上）。
 *   偿（线被对手的致命一击绷紧时）：致命一击在 damage_incoming 阶段被认出并写下待偿标记；
 *       damage_applied 确认这一击真的把使用者打倒（data.after ≤ 0）后，把凶手当前全部生命一次性取走——
 *       它不会护住使用者，只是把「你来杀我」的代价摆到明面上。
 * 结束：线走完自己的时间或被清除时松开（lift），使用者不倒时不会白白拖人。
 * 反制：对手在窗口内收住最后一击（用环境伤害、别的来源或等线松开）就不会被拖下去；连续施放会失败。
 */
namespace PokemonSkills {
    function destinyAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }
    const DESTINY_PENDING = "world_combat_destinybond";

    function destinyMarkView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, destinyMark);
        return views.length ? views[0] : null;
    }
    function destinyDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, destinyMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }

    WorldCombat.effect(destinyMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.threads !== "number" || !isFinite(value.threads) || value.threads < 1) throw new Error("Invalid destiny threads");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 0) throw new Error("Invalid destiny radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid destiny window");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(destinyMark, "start", function () { });
    WorldCombat.effectHandler(destinyMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: destinyId,
        name: "同命",
        description: "当众把一条命线系在自己身上：这段时间里，谁亲手把你打倒，谁就一起倒下。它不护住你，只是把代价摆到明面上；已经有线在身时再施放会失败。",
        uses: ["残血时把「最后一击」变成对手自己的代价", "逼对手收手，争取喘息或撤退", "临死前把对面的主力一起带走"],
        kind: "self",
        range: 0,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 160,
        style: "destinybond",
        defaults: { tight: false, ai: { threshold: 0.3, maxChase: 10, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[destinyId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(destinyId, "tempo", context),
                recover: p(destinyId, "aftercast", context),
                cooldown: p(destinyId, "recharge", context),
                active: 0,
                range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (MobEffects.read(world, self, destinyEffect) !== null) return "already-armed";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_destinybond/bind", destinyScene, 1, action.origin(),
                JSON.stringify({ moment: "bind", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 1, geometry: "circle", style: "destinybond", color: 0xC2354B, label: "同命" }; },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const tight = !!(config && config.tight);
            const ticks = Math.max(40, Math.round(p(destinyId, "bondTicks", action)));
            const threads = Math.max(4, Math.round(p(destinyId, "threads", action)));
            const radius = Math.max(0.35, p(destinyId, "markRadius", action));
            MobEffects.apply(world, self, destinyEffect, ticks, 0);
            destinyDropMark(world, self);
            world.effect(destinyMark, self, JSON.stringify({ threads: threads, radius: radius, max: ticks, tight: tight ? 1 : 0 }), ticks);
            if (tight) world.effect("world_combat:rooted", self, "{}", ticks);
            sound(action, "minecraft:entity.warden.heartbeat");
            WorldFeedback.emit(world, destinyScene, 1, body.position(),
                { moment: "bind", target: String(self.ref()), threads: threads, scale: radius / 0.4, tight: tight ? 1 : 0 }, 32);
            WorldFeedback.text(world, destinyAbove(body.position()), destinyBindText, [Math.round(ticks / 20)], 32);
            done(action);
        }
    });

    // 致命一击的认出：只写待偿标记，不改伤害、不拒绝；真正是否倒下由 damage_applied 用 after 确认。
    WorldCombat.on("world_combat:move_destinybond/guard", "world_combat:damage_incoming", "", function (event) {
        const world = event.world(), target = event.target(), source = event.actor();
        if (target === null || source === null || !world.valid(target)) return;
        // The event world's source is the attacker, so friendliness is read from the victim's side.
        if (String(source.key()) === String(target.key()) || world.friendly(target)) return;
        if (MobEffects.read(world, target, destinyEffect) === null) return;
        const body = world.observe(target);
        if (body === null) return;
        const data = JSON.parse(String(event.data()));
        if (typeof data.amount !== "number" || !isFinite(data.amount) || data.amount < body.health()) return;
        const view = destinyMarkView(world, target);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        data[DESTINY_PENDING] = { threads: mark.threads || 8, radius: mark.radius || 0.4 };
        event.data(JSON.stringify(data));
    });

    // 待偿：使用者真的被这一击打倒时，把凶手当前全部生命取走。
    WorldCombat.on("world_combat:move_destinybond/toll", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const pending = data[DESTINY_PENDING];
        if (!pending || !(data.after <= 0)) return;
        const world = event.world(), killer = event.actor();
        if (killer === null || !world.valid(killer)) return;
        const body = world.observe(killer);
        if (body === null || body.health() <= 0) return;
        const at = WorldCombat.point(typeof data.x === "number" ? data.x : 0, typeof data.y === "number" ? data.y : 0, typeof data.z === "number" ? data.z : 0);
        const share = body.health();
        world.health(killer, -share, "world_combat:destinybond");
        world.sound("minecraft:entity.wither.spawn", body.position(), 16, "{}");
        WorldFeedback.emit(world, destinyScene, 1, at,
            { moment: "drag", target: String(killer.ref()), threads: pending.threads || 8,
                path: [[at.x(), at.y(), at.z()], String(killer.ref())] }, 44);
        WorldFeedback.text(world, destinyAbove(body.position()), destinyDragText, [], 40);
    });

    // 持续：每 20 刻续一次红线画面，密度随剩余比例变化。
    WorldCombat.on("world_combat:move_destinybond/promise", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== destinyEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const view = destinyMarkView(world, actor);
        if (view === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = JSON.parse(String(view.data()));
        const surge = Math.max(0, Math.min(1, view.remaining() / Math.max(1, mark.max || 1)));
        WorldFeedback.keep(world, "world_combat:move_destinybond/state/" + String(actor.ref()), destinyScene, 1, body.position(),
            { moment: "promise", target: String(actor.ref()), threads: mark.threads || 8, surge: surge,
                scale: Math.max(0.6, (mark.radius || 0.4) / 0.4) }, 40);
    });

    // 结束：线松开。使用者已经倒下时不播（它随死亡一起消失）。
    WorldCombat.on("world_combat:move_destinybond/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== destinyEffect) return;
        const world = event.world(), actor = event.actor();
        destinyDropMark(world, actor);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, destinyScene, 1, body.position(),
            { moment: "lift", target: String(actor.ref()), expired: String(data.cause) === "expired" ? 1 : 0 }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, destinyAbove(body.position()), destinyLiftText, [], 28);
    });
}
