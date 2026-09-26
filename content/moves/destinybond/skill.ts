/**
 * 同命 / destinybond —— 执行组织。
 *
 * 核心念头：当众把一条命线系在自己身上——接下来谁亲手把你打倒，线就绷紧，把你送走的那个也一起倒下。
 *
 * 两幕 + 偿：
 *   起（windup 只在身上聚起红线预告，提交前可打断，不花代价）→
 *   结（提交后：挂共享身份 world_combat:status/destiny_bond 的真实 MobEffect，留下机读标记带走画面用的线头与半径；
 *       死结取向下同时把自己 rooted 在结上，root 的实例 id 记在标记里，随命线一起收回）。
 *   偿（线被对手的致命一击绷紧时）：每次符合条件的非友方一击都在 damage_incoming 阶段把命线快照附到该次伤害；
 *       damage_applied 用最终 after ≤ 0 确认这一击真的把使用者打倒后，才把凶手当前生命交给现一次 world.health，
 *       以它返回的真实伤害与之后的存活分别演出同归／牵伤／抵抗；一次结账后立刻收回命线，不会重复结算。
 * 结束：线走完自己的时间或被清除时松开（lift），使用者不倒时不会白白拖人。
 * 反制：对手在窗口内收住最后一击（用环境伤害、别的来源或等线松开）就不会被拖下去；连续施放会失败。
 */
namespace PokemonSkills {
    function destinyAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }
    const DESTINY_PENDING = "world_combat_destinybond";
    // 一次结账的会话内记录：同一场死亡只偿还一次，重复的致命回执不再接账。
    const destinySettled: { [key: string]: boolean } = Object.create(null);

    function destinyMarkView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, destinyMark);
        return views.length ? views[0] : null;
    }
    function destinyDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, destinyMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    /** 只收回本实例记下的那一根 root；别人的定身不动。 */
    function destinyDropRoot(world: CombatWorld, actor: CombatActor, mark: any): void {
        if (mark && typeof mark.rootId === "number" && mark.rootId > 0) world.operation(mark.rootId, "world_combat:dispel", "{}");
    }
    function destinyTeardown(world: CombatWorld, actor: CombatActor, mark: any): void {
        destinyDropMark(world, actor);
        destinyDropRoot(world, actor, mark);
    }

    WorldCombat.effect(destinyMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.threads !== "number" || !isFinite(value.threads) || value.threads < 1) throw new Error("Invalid destiny threads");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 0) throw new Error("Invalid destiny radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid destiny window");
        if (value.rootId !== undefined && (typeof value.rootId !== "number" || !isFinite(value.rootId) || value.rootId < 0))
            throw new Error("Invalid destiny root");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(destinyMark, "start", function () { });
    WorldCombat.effectHandler(destinyMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        freeMovement: function (config) { return !!config.tight; },
        id: destinyId,
        cooldownParameter: "recharge",
        name: "同命",
        description: "当众把一条命线系在自己身上：这段时间里，谁亲手把你打倒，谁就一起倒下。它不护住你，只是把「你来杀我」的代价摆到明面上；已经有命线在身时再施放会失败。",
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
            destinySettled[String(self.key())] = false;
            const ticks = Math.max(40, Math.round(p(destinyId, "bondTicks", action)));
            const threads = Math.max(4, Math.round(p(destinyId, "threads", action)));
            const radius = Math.max(0.35, p(destinyId, "markRadius", action));
            MobEffects.apply(world, self, destinyEffect, ticks, 0);
            destinyDropMark(world, self);
            let rootId = 0;
            if (tight) rootId = world.effect("world_combat:rooted", self, "{}", ticks);
            world.effect(destinyMark, self, JSON.stringify({ threads: threads, radius: radius, max: ticks, tight: tight ? 1 : 0, rootId: rootId }), ticks);
            sound(action, "minecraft:entity.warden.heartbeat");
            WorldFeedback.emit(world, destinyScene, 1, body.position(),
                { moment: "bind", target: String(self.ref()), threads: threads, scale: radius / 0.4, tight: tight ? 1 : 0 }, 32);
            WorldFeedback.text(world, destinyAbove(body.position()), destinyBindText, [Math.round(ticks / 20)], 32);
            done(action);
        }
    });

    // 命线快照：每次符合「非友方、另一个来源」的一击都把标记附到该次伤害上，不预估是否致死。
    WorldCombat.on("world_combat:move_destinybond/guard", "world_combat:damage_incoming", "", function (event) {
        const world = event.world(), target = event.target(), source = event.actor();
        if (target === null || source === null || !world.valid(target)) return;
        // The event world's source is the attacker, so friendliness is read from the victim's side.
        if (String(source.key()) === String(target.key()) || world.friendly(target)) return;
        if (MobEffects.read(world, target, destinyEffect) === null || destinySettled[String(target.key())]) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.amount > 0)) return;
        const view = destinyMarkView(world, target);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        data[DESTINY_PENDING] = { threads: mark.threads || 8, radius: mark.radius || 0.4 };
        event.data(JSON.stringify(data));
    });

    // 结账：只有最终 after ≤ 0 才算真被这一击打倒；world.health 尝试一次，按实伤与存活分岔，随后收回命线防重复。
    WorldCombat.on("world_combat:move_destinybond/toll", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        const pending = data[DESTINY_PENDING];
        if (!pending || !(data.after <= 0)) return;
        const world = event.world(), victim = event.target(), killer = event.actor();
        if (victim === null || killer === null || !world.valid(killer)) return;
        if (String(killer.key()) === String(victim.key()) || destinySettled[String(victim.key())]) return;
        // 先消费：收回命线与 root，之后同一场死亡不会再结第二次。载体可能已随死亡清掉，不阻止接账。
        destinySettled[String(victim.key())] = true;
        const view = destinyMarkView(world, victim);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        destinyTeardown(world, victim, mark);
        const carrier = MobEffects.read(world, victim, destinyEffect);
        if (carrier !== null) world.removeMobEffect(victim, destinyEffect, carrier.key());
        const body = world.observe(killer);
        if (body === null || body.health() <= 0) return;
        const at = WorldCombat.point(typeof data.x === "number" ? data.x : 0, typeof data.y === "number" ? data.y : 0, typeof data.z === "number" ? data.z : 0);
        const share = body.health();
        const actual = world.health(killer, -share, "world_combat:destinybond");
        const after = world.observe(killer);
        const dead = after === null || after.health() <= 0;
        const path: any[] = [[at.x(), at.y(), at.z()], String(killer.ref())];
        const payload = { target: String(killer.ref()), threads: pending.threads || 8, path: path };
        if (dead) {
            world.sound("minecraft:entity.wither.spawn", body.position(), 16, "{}");
            WorldFeedback.emit(world, destinyScene, 1, at, { moment: "drag", target: payload.target, threads: payload.threads, path: payload.path }, 44);
            WorldFeedback.text(world, destinyAbove(body.position()), destinyDragText, [], 40);
            return;
        }
        if (actual < -0.001) {
            WorldFeedback.emit(world, destinyScene, 1, at, { moment: "graze", target: payload.target, threads: payload.threads, path: payload.path }, 40);
            WorldFeedback.text(world, destinyAbove(body.position()), destinyGrazeText, [], 36);
            return;
        }
        WorldFeedback.emit(world, destinyScene, 1, at, { moment: "resist", target: payload.target, threads: payload.threads, path: payload.path }, 32);
        WorldFeedback.text(world, destinyAbove(body.position()), destinyResistText, [], 32);
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

    // 结束：线松开，本招的 root 与标记一起收回。使用者已经倒下时不播（它随死亡一起消失）。
    WorldCombat.on("world_combat:move_destinybond/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== destinyEffect) return;
        const world = event.world(), actor = event.actor();
        const view = destinyMarkView(world, actor);
        const mark = view === null ? {} : JSON.parse(String(view.data()));
        destinyTeardown(world, actor, mark);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, destinyScene, 1, body.position(),
            { moment: "lift", target: String(actor.ref()), expired: String(data.cause) === "expired" ? 1 : 0 }, 24);
        if (String(data.cause) === "expired") WorldFeedback.text(world, destinyAbove(body.position()), destinyLiftText, [], 28);
    });
}
