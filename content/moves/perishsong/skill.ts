/**
 * 灭亡之歌 / perishsong —— 执行组织。
 *
 * 核心念头：当众唱起一首三拍子的歌——半径内所有听见的活物（包括唱的人自己）都被歌声缠上，
 *   每过一拍就离倒下更近一步；跑出起唱中心两倍歌声半径、撑满一整拍，或在空拍外被牛奶解掉，都能甩掉它。
 *
 * 三幕 + 收：
 *   起（windup 只在口边聚起音符预告，提交前可打断，不花代价）→
 *   唱（提交后：对半径内每个看得见/听得见的活物挂共享身份 world_combat:status/perish_song 的真实 MobEffect；
 *       carrier 成功才登记，已在倒数的对象不被新歌重置；计数效果记下起唱原点、歌声半径与逃生线）。
 *   数（每过一个游戏刻读一次计数：离原点超过 songRadius×2 记下时刻，连续撑满一整拍就解歌；回到范围内清零重计。
 *       每 10 刻把 3／2／1 的剩余拍数交给绑在真实托管效果上的头顶画面）。
 *   结（身份效果自然到期的那一次 mob_effect_removed）：用现一次 world.health 原生入口只尝试一次并记录 settled，
 *       依据返回实伤与之后是否存活演出「数拍已尽」或「抵住了」；牛奶／驱散是 removed，不结算。
 * 分岔：跑出逃生线、被牛奶清除、提前死亡都通过 removed 分支甩掉歌声，不结清。
 * 反制：走出两倍歌声半径并保持一拍，或抢在被唱倒前清除／结束战斗。
 */
namespace PokemonSkills {
    function perishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }
    const PERISH_TURNS = 3;

    function perishCountView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, perishCount);
        return views.length ? views[0] : null;
    }
    function perishLingerView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, perishLinger);
        return views.length ? views[0] : null;
    }
    function perishDropMark(world: CombatWorld, actor: CombatActor): void {
        const counts = world.effects(actor, perishCount);
        for (let i = 0; i < counts.length; i++) world.operation(counts[i].id(), "world_combat:dispel", "{}");
        const lingers = world.effects(actor, perishLinger);
        for (let i = 0; i < lingers.length; i++) world.operation(lingers[i].id(), "world_combat:dispel", "{}");
    }
    function perishMarkOf(view: CombatEffectView | null): any {
        return view === null ? null : JSON.parse(String(view.data()));
    }

    WorldCombat.effect(perishCount, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.turnTicks !== "number" || !isFinite(value.turnTicks) || value.turnTicks < 1) throw new Error("Invalid perish turn length");
        if (typeof value.turns !== "number" || !isFinite(value.turns) || value.turns < 1) throw new Error("Invalid perish turns");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid perish window");
        if (!Array.isArray(value.origin) || value.origin.length !== 3) throw new Error("Invalid perish origin");
        if (typeof value.escapeRadius !== "number" || !isFinite(value.escapeRadius) || value.escapeRadius < 0) throw new Error("Invalid perish escape radius");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(perishCount, "start", function () { });
    WorldCombat.effectHandler(perishCount, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 逃生计时与结账标记持久化在计数效果里，跨 tick 一致。
    WorldCombat.effectHandler(perishCount, "operation:world_combat:perish_progress", function (effect) {
        const input = JSON.parse(String(effect.input())), state = JSON.parse(String(effect.state()));
        if (typeof input.outsideSince === "number") state.outsideSince = input.outsideSince;
        if (input.settled) state.settled = 1;
        effect.state(JSON.stringify(state));
    });

    // 头顶画面绑在真实托管效果上：随它自然到期或提前清除一起收掉。
    WorldCombat.effect(perishLinger, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid perish linger");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(perishLinger, "start", function () { });
    WorldCombat.effectHandler(perishLinger, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: perishId,
        cooldownParameter: "recharge",
        name: "灭亡之歌",
        description: "唱起一首三拍子的歌：半径内所有听见的活物（包括你自己）在数完三拍后一同倒下；跑出起唱中心两倍半径并保持一整拍、或被清除，可以甩掉它。它是一首同归于尽的歌，只有在自己比对手更能撑、或本来就打算换命时才划算。",
        uses: ["打不过时把整场拉平，逼对手速战或撤退", "对着成群的敌人一次点名", "在必输的交换里把对手主力一起带走"],
        kind: "self",
        range: 0,
        prepare: 14,
        active: 0,
        recover: 8,
        cooldown: 300,
        style: "perishsong",
        defaults: { dirge: false, ai: { threshold: 0.55, maxChase: 12, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[perishId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p(perishId, "tempo", context),
                recover: p(perishId, "aftercast", context),
                cooldown: p(perishId, "recharge", context),
                active: 0,
                range: 0
            };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_perishsong/sing", perishScene, 1, action.origin(),
                JSON.stringify({ moment: "sing", target: String(action.actor().ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const radius = pokemon ? p(perishId, "songRadius", pokemon) : 4;
            return { radius: radius, geometry: "circle", style: "perishsong", color: 0x5A6BB0, label: "灭亡之歌" };
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const dirge = !!(config && config.dirge);
            const radius = Math.max(2.5, p(perishId, "songRadius", action));
            const turnTicks = Math.max(30, Math.round(p(perishId, "turnTicks", action)));
            const countdown = turnTicks * PERISH_TURNS;
            const motes = Math.max(8, Math.round(p(perishId, "motes", action)));
            const escapeRadius = radius * 2;
            const heard = world.query(origin, radius, false);
            let caught = 0;
            for (let i = 0; i < heard.length; i++) {
                const actor = heard[i];
                if (world.observe(actor) === null) continue;
                // 已在倒数的对象不被新歌重置延长；carrier 成功才登记。
                if (MobEffects.read(world, actor, perishEffect) !== null) continue;
                const carrier = MobEffects.apply(world, actor, perishEffect, countdown, 0);
                if (carrier === null) continue;
                world.effect(perishCount, actor, JSON.stringify({ turnTicks: turnTicks, turns: PERISH_TURNS, motes: motes,
                    max: countdown, origin: [origin.x(), origin.y(), origin.z()], radius: radius,
                    escapeRadius: escapeRadius, outsideSince: 0 }), countdown);
                caught++;
                const at = world.observe(actor);
                if (at !== null && String(actor.key()) !== String(self.key()))
                    WorldFeedback.emit(world, perishScene, 1, at.position(),
                        { moment: "mark", target: String(actor.ref()), motes: motes, turns: PERISH_TURNS }, 30);
            }
            sound(action, "cobblemon:move.sing.actor");
            WorldFeedback.emit(world, perishScene, 1, origin,
                { moment: "song", target: String(self.ref()), heard: caught, turns: PERISH_TURNS, motes: motes, scale: radius / 4.0 }, 44);
            WorldFeedback.text(world, perishAbove(origin), perishSongText, [PERISH_TURNS, caught], 44);
            done(action);
        }
    });

    // 倒计时：逐 tick 读距离做「跑离一拍」判定；每 10 刻把真实剩余拍数交给绑在托管效果上的画面。
    WorldCombat.on("world_combat:move_perishsong/beat", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== perishEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, perishEffect);
        if (effect === null) return;
        const countView = perishCountView(world, actor);
        const mark = perishMarkOf(countView);
        const body = world.observe(actor);
        if (body === null) return;
        // 逃生：离起唱原点超过两倍歌声半径并撑满一整拍就解歌；回到范围内重新计时。对所有名单对象一致。
        if (countView !== null && mark !== null && mark.escapeRadius > 0) {
            const origin = WorldCombat.point(mark.origin[0], mark.origin[1], mark.origin[2]);
            const outside = body.position().minus(origin).length() > mark.escapeRadius;
            const since = typeof mark.outsideSince === "number" ? mark.outsideSince : 0;
            if (outside) {
                if (!since) world.operation(countView.id(), "world_combat:perish_progress", JSON.stringify({ outsideSince: world.tick() }));
                else if (world.tick() - since >= Math.max(1, mark.turnTicks || 1)) {
                    world.removeMobEffect(actor, perishEffect, effect.key());
                    return;
                }
            } else if (since) {
                world.operation(countView.id(), "world_combat:perish_progress", JSON.stringify({ outsideSince: 0 }));
            }
        }
        if (world.tick() % 10 !== 0) return;
        const turn = mark === null || !(mark.turnTicks > 0) ? 90 : mark.turnTicks;
        const turnsLeft = Math.max(1, Math.ceil(effect.duration() / turn));
        const turns = mark === null ? PERISH_TURNS : mark.turns;
        const motes = mark === null ? 12 : mark.motes;
        let linger = perishLingerView(world, actor);
        const lingerId = linger === null ? world.effect(perishLinger, actor, "{}", Math.max(1, effect.duration() + 2)) : linger.id();
        if (lingerId <= 0) return;
        // 绑在 carrier 自己创建的托管效果上：驱散／到期时画面同步收掉。
        WorldFeedback.onEffect(world, lingerId, "world_combat:move_perishsong/state/" + String(actor.ref()), perishScene, 1, body.position(),
            { moment: turnsLeft <= 1 ? "final" : "beat", target: String(actor.ref()), turnsLeft: turnsLeft, turns: turns, motes: motes });
    });

    // 分岔：自然到期只结清一次；跑离、牛奶、驱散都是 removed，不结算。
    WorldCombat.on("world_combat:move_perishsong/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== perishEffect) return;
        const world = event.world(), actor = event.actor();
        const countView = perishCountView(world, actor);
        const mark = perishMarkOf(countView);
        // 计数效果可能比身份先退一步；自然到期这一条移除事件只来一次，照常结账。
        if (String(data.cause) === "expired" && (mark === null || !mark.settled)) {
            const body = world.observe(actor);
            if (body === null || body.health() <= 0) { perishDropMark(world, actor); return; }
            if (countView !== null) world.operation(countView.id(), "world_combat:perish_progress", JSON.stringify({ settled: 1 }));
            const actual = world.health(actor, -body.health(), "world_combat:perishsong");
            const after = world.observe(actor);
            const died = after === null || after.health() <= 0;
            perishDropMark(world, actor);
            if (died) {
                WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "doom", target: String(actor.ref()), turnsLeft: 0 }, 52);
                WorldFeedback.text(world, perishAbove(body.position()), perishDoomText, [], 45);
                world.sound("minecraft:particle.soul_escape", body.position(), 16, "{}");
            } else if (actual < -0.001) {
                WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "final", target: String(actor.ref()), turnsLeft: 1 }, 40);
                WorldFeedback.text(world, perishAbove(body.position()), perishWithstandText, [], 40);
            } else {
                WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "lift", target: String(actor.ref()) }, 30);
                WorldFeedback.text(world, perishAbove(body.position()), perishWithstandText, [], 36);
            }
            return;
        }
        perishDropMark(world, actor);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null || body.health() <= 0) return;
        WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "lift", target: String(actor.ref()) }, 26);
        WorldFeedback.text(world, perishAbove(body.position()), perishLiftText, [], 30);
        world.sound("minecraft:block.note_block.harp", body.position(), 14, "{}");
    });
}
