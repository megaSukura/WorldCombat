/**
 * 灭亡之歌 / perishsong —— 执行组织。
 *
 * 核心念头：当众唱起一首三拍子的歌——半径内所有听见的活物（包括唱的人自己）都被歌声缠上，
 *   每过一拍就离倒下更近一步；走出这场交战、被牛奶解掉、或撑到歌自己走完都会结清。
 *
 * 三幕 + 收：
 *   起（windup 只在口边聚起音符预告，提交前可打断，不花代价）→
 *   唱（提交后：对半径内每个看得见/听得见的活物挂共享身份 world_combat:status/perish_song 的真实 MobEffect，
 *       并留下机读标记带走每拍时长、拍数与音符数）。
 *   数（每 20 刻续一次倒计时画面：还剩几拍由剩余时长除以每拍时长得出，最后一拍改用更紧的读法）。
 *   结（时长走到尽头）：把持有者当前生命一次性取走，唱的人同样在名单里。
 * 分岔：走出交战（宝可梦停止交战一段时间）或牛奶清除是「替换后效果消失」的即时化——歌声被甩掉（lift），不结清。
 * 反制：走出歌声半径就不会被写进名单；已经入耳只能靠脱离交战、清除效果或抢在被唱倒前结束战斗。
 */
namespace PokemonSkills {
    function perishAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }
    const PERISH_TURNS = 3;

    function perishCountView(world: CombatWorld, actor: CombatActor): CombatEffectView | null {
        const views = world.effects(actor, perishCount);
        return views.length ? views[0] : null;
    }
    function perishDropMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, perishCount);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }
    function perishMarkOf(view: CombatEffectView | null): any {
        return view === null ? null : JSON.parse(String(view.data()));
    }

    WorldCombat.effect(perishCount, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.turnTicks !== "number" || !isFinite(value.turnTicks) || value.turnTicks < 1) throw new Error("Invalid perish turn length");
        if (typeof value.turns !== "number" || !isFinite(value.turns) || value.turns < 1) throw new Error("Invalid perish turns");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid perish window");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(perishCount, "start", function () { });
    WorldCombat.effectHandler(perishCount, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: perishId,
        name: "灭亡之歌",
        description: "唱起一首三拍子的歌：半径内所有听见的活物（包括你自己）在数完三拍后一同倒下；走出交战或被清除可以甩掉它。",
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
            const heard = world.query(origin, radius, false);
            let caught = 0;
            for (let i = 0; i < heard.length; i++) {
                const actor = heard[i];
                if (world.observe(actor) === null) continue;
                MobEffects.apply(world, actor, perishEffect, countdown, 0);
                perishDropMark(world, actor);
                world.effect(perishCount, actor, JSON.stringify({ turnTicks: turnTicks, turns: PERISH_TURNS, motes: motes, max: countdown }), countdown);
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

    // 倒计时：每 20 刻续一次画面；走出交战会甩掉歌声；时长走到尽头就把持有者结清。
    WorldCombat.on("world_combat:move_perishsong/beat", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== perishEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, perishEffect);
        if (effect === null) return;
        const mark = perishMarkOf(perishCountView(world, actor));
        // 走出交战即甩掉歌声（原生「替换后效果消失」的即时化）；原版生物没有交战计时，仍按三拍结清。
        if (String(actor.domain()) === "cobblemon") {
            const state = NativeEffects.read(world, actor);
            if (state.lastHit >= 0 && world.tick() - state.lastHit > NativeSemantics.encounterIdle) {
                world.removeMobEffect(actor, perishEffect, effect.key());
                return;
            }
        }
        if (effect.duration() <= 5) {
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "doom", target: String(actor.ref()), turnsLeft: 0 }, 52);
            WorldFeedback.text(world, perishAbove(body.position()), perishDoomText, [], 45);
            world.sound("minecraft:particle.soul_escape", body.position(), 16, "{}");
            if (body.health() > 0) world.health(actor, -body.health(), "world_combat:perishsong");
            return;
        }
        if (world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        const turn = mark === null || !(mark.turnTicks > 0) ? 90 : mark.turnTicks;
        const turnsLeft = Math.max(1, Math.ceil(effect.duration() / turn));
        WorldFeedback.keep(world, "world_combat:move_perishsong/state/" + String(actor.ref()), perishScene, 1, body.position(),
            { moment: turnsLeft <= 1 ? "final" : "beat", target: String(actor.ref()), turnsLeft: turnsLeft,
                turns: mark === null ? PERISH_TURNS : mark.turns, motes: mark === null ? 12 : mark.motes }, 40);
    });

    // 分岔：被清除或走出交战是「歌声被甩掉」（lift）；已经结清（倒下）时不播。
    WorldCombat.on("world_combat:move_perishsong/lift", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== perishEffect) return;
        const world = event.world(), actor = event.actor();
        perishDropMark(world, actor);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null || body.health() <= 0) return;
        if (String(data.cause) === "expired") {
            WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "doom", target: String(actor.ref()), turnsLeft: 0 }, 52);
            WorldFeedback.text(world, perishAbove(body.position()), perishDoomText, [], 45);
            world.sound("minecraft:particle.soul_escape", body.position(), 16, "{}");
            world.health(actor, -body.health(), "world_combat:perishsong");
            return;
        }
        WorldFeedback.emit(world, perishScene, 1, body.position(), { moment: "lift", target: String(actor.ref()) }, 26);
        WorldFeedback.text(world, perishAbove(body.position()), perishLiftText, [], 30);
        world.sound("minecraft:block.note_block.harp", body.position(), 14, "{}");
    });
}
