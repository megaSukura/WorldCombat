/**
 * 绑紧 / bind 的出手方式。
 *
 * 核心念头：**甩出一根绷在两者之间的缚索**——长身或藤蔓掉头缠住目标，另一头系在施法者身上。
 * 目标想跑就被绳拽回来，绳每勒一下更紧一点；施法者也被张力拖慢。目标能动、能打，却走不出这根绳；
 * 施法者被拉开、目标也被一起拽走。绳要么走完自己的时间，要么被一步扯断。
 *
 * 三幕：
 *   起（windup，提交前）：长身或藤蔓在身侧收束、绷起，只播预告。
 *   缠（lash → grip）：提交后沿瞄准方向甩出一条线；缠住第一个活体即结算一记 cinch 接触伤害、挂上
 *       `world_combat:status/partiallytrapped`（本单元 `world_combat:bind_cinch`），施法者带上 `bind_hold`。
 *       线撞到实墙、或没缠到任何活体时就只是甩空，不建看不见的绳。
 *   牵（pull → cinch / release / snap）：绑定效果每 2 刻量一次两者距离——超过绳长且绳绷紧就把目标朝施法者拉回
 *       `drag`，超过 `snap` 或两端之间被实墙隔断就绷断；绳**绷紧时才**每 `interval` 勒一次，`tight` 每增一档
 *       威力抬高 `ramp`、绳也收紧一截。任一方身上的状态被外力清掉（牛奶、/effect clear）或一方倒下时绳松开。
 *
 * 与同族分开：紧束把目标裹住钉在原地、藤不需要施法者维持；绑紧把目标拴在施法者身边拖着走，越拉越紧，
 * 代价是施法者也被拖慢。与缠绕（一次性减速＋短定身）、贝壳夹击（双方被钉住）也不同：绑紧是可移动的牵引。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体，也可只给方向或世界点；只有实际甩中的首个敌对活体才会被系上，
 *   空放/打墙都只留下甩空的表现。
 *
 * 配置 `choke`（勒紧式）由 resolve 改时序、由公式改绳长／回拽／加紧／时长，提交后才触碰世界。
 */
namespace PokemonSkills {
    const bindScene = "world_combat:move_bind";
    const bindCinch = "world_combat:bind_cinch";
    const bindHold = "world_combat:bind_hold";
    const bindBond = "world_combat:bind_bond";
    const bindLeashKey = "bind:leash";
    const bindGripText = "world_combat.move.bind.text.grip";
    const bindReleaseText = "world_combat.move.bind.text.release";
    const bindSnapText = "world_combat.move.bind.text.snap";

    function bindBondData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid bind bond");
        ["cinch", "leash", "drag", "ramp", "interval", "snap", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid bind bond");
        });
        if (value.interval < 1 || value.leash <= 0 || value.snap <= value.leash || value.drag < 0) throw new Error("Invalid bind bond");
        return JSON.stringify(value);
    }

    WorldCombat.effect(bindBond, 1, 500, "actor", bindBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(bindBond, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), caster = effect.source(), data = JSON.parse(effect.state());
        if (!CombatStatus.apply(world, victim, "partiallytrapped", bindCinch, data.duration, 0, { unique: true })) { effect.end(); return; }
        data.victimLease = MobEffects.bind(world, victim, bindCinch);
        if (!data.victimLease) { effect.end(); return; }
        const hold = MobEffects.apply(world, caster, bindHold, data.duration, 0);
        data.casterLease = MobEffects.bind(world, caster, bindHold, hold);
        effect.state(JSON.stringify(data));
        if (!data.casterLease) { effect.end(); return; }
        effect.schedule("pull", "pull", 1, "{}");
    });
    WorldCombat.effectHandler(bindBond, "pull", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        // 绳的两端各挂一个状态：任一端被外力清掉，绳就松开（走 end 的收尾表现）。
        if (!MobEffects.present(world, data.victimLease)) { data.reason = "released"; effect.state(JSON.stringify(data)); effect.end(); return; }
        const caster = world.actor(data.caster);
        if (caster === null || !world.valid(caster) || !MobEffects.present(world, data.casterLease)) {
            data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null) { effect.end(); return; }
        const anchor = holder.position(), at = held.position();
        const distance = anchor.minus(at).length();
        // 索须通视：实墙隔在两端之间，绳绕不过去，直接绷断。
        if (distance > data.snap || !world.clear(anchor, at)) {
            data.reason = "snapped"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const leash = Math.max(data.leash * 0.5, data.leash * (1 - data.ramp * 0.15 * (data.tight || 0)));
        // 只有绷紧的绳才勒得动：远于收紧后的绳长才拉回，并遵守原生位移的真实结果；拉不动的目标不会被补写坐标。
        const taut = distance >= leash - 0.05;
        if (distance > leash && data.drag > 0) {
            const step = Math.min(distance - leash, data.drag);
            if (step > 0.01) world.displace(victim, anchor.minus(at).unit().scale(step));
        }
        if (taut && world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.tight = (data.tight || 0) + 1;
            effect.state(JSON.stringify(data));
            const power = data.cinch * (1 + data.ramp * data.tight);
            hurt(world, victim, "bind", power, { damage: damageSpec("bind", "cinch"), contact: true });
            if (!world.valid(victim)) { effect.end(); return; }
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, bindScene, 1, body.position(),
                    { moment: "cinch", target: String(victim.ref()), tight: data.tight, notes: data.notes,
                        intensity: Math.max(0.5, Math.min(2.2, power / 18)) }, 18);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), bindGripText, [data.tight], 18);
            }
            world.sound("minecraft:block.vine.step", body !== null ? body.position() : at, 14, "{}");
        }
        // 绳的表现绑在这次束缚的托管效果上：两端读实际位置、张力读真实距离；效果自然到期或被驱散都一起收回。
        WorldFeedback.onEffect(world, effect.id(), bindLeashKey, bindScene, 1, at,
            { moment: "leash", target: String(victim.ref()), path: ["source", String(victim.ref())],
                tension: Math.max(0.2, Math.min(1, distance / data.leash)), notes: data.notes, tight: data.tight || 0 });
        effect.schedule("pull", "pull", 2, "{}");
    });
    WorldCombat.effectHandler(bindBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        const caster = world.actor(data.caster);
        if (world.valid(victim)) {
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, bindScene, 1, body.position(),
                    { moment: data.reason === "snapped" ? "snap" : "release", target: String(victim.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
                    data.reason === "snapped" ? bindSnapText : bindReleaseText, [], 22);
            }
        }
        if (caster !== null && world.valid(caster)) {
            const body = world.observe(caster);
            if (body !== null) WorldFeedback.emit(world, bindScene, 1, body.position(), { moment: "slack", target: String(caster.ref()) }, 18);
        }
    });
    WorldCombat.effectHandler(bindBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "bind",
        cooldownParameter: "recharge",
        name: "Bind",
        description: "甩出一根绷在两者之间的缚索：长身或藤蔓缠住一个目标，另一头系在自己身上。目标想跑就被拽回来，绳每勒一下更紧一点；被拴住的目标走得更慢，拉绳的自己也一样。目标能动、能打，却走不出这根绳——除非把绳一步扯断、被实墙隔断、等它走完，或任一方身上的束缚被清除。可点任意目标，也可只给方向空甩；只有实际甩中的首个敌人才会被系上。",
        uses: ["把一个想跑的目标拴在身边拖着走", "用持续收紧的伤害压住一个难缠目标", "把对手从掩体或水里拖出来"],
        kind: "aim",
        range: 3.5,
        maxRange: 4.8,
        prepare: 7,
        active: 14,
        recover: 6,
        cooldown: 34,
        style: "tether",
        defaults: { choke: false, ai: { maxChase: 7, preferRunners: true, minHealth: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bind", "reach", pokemon), geometry: "line", style: "tether", color: 0xB08C5A,
                label: config && config.choke === true ? "勒紧式" : "牵引式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["bind"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            const choke = !!(config && config.choke);
            return {
                prepare: Math.round(p("bind", "tempo", context)),
                recover: Math.round(p("bind", "aftercast", context)),
                cooldown: Math.round(p("bind", "recharge", context)) + (choke ? 4 : 0),
                active: skills["bind"].active,
                range: p("bind", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_bind:coil", bindScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", choke: config && config.choke === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(2.4, p("bind", "reach", action));
            const grip = Math.max(0.3, p("bind", "grip", action));
            const end = origin.plus(direction.scale(reach));
            const path = [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
            WorldFeedback.emit(world, bindScene, 1, origin,
                { moment: "lash", path: path, notes: Math.round(p("bind", "notes", action)) }, 14);
            sound(action, "minecraft:block.vine.place");

            const grab = action.trace(origin, end, grip);
            const target = grab.hitEntity() ? grab.target() : null;
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, bindScene, 1, end, { moment: "whiff" }, 16);
                done(action);
                return;
            }
            const cinch = p("bind", "cinch", action);
            if (!hurt(action, target, "bind", cinch, { damage: damageSpec("bind", "cinch"), contact: true })) { done(action); return; }
            const duration = Math.max(60, Math.round(p("bind", "duration", action)));
            const existing = world.effects(target, bindBond);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            const body = world.observe(target);
            if (body === null) { done(action); return; }
            const state = { caster: String(actor.ref()), cinch: cinch, leash: Math.max(1.8, p("bind", "leash", action)),
                drag: Math.max(0, p("bind", "drag", action)), ramp: Math.max(0, p("bind", "ramp", action)),
                interval: Math.max(6, Math.round(p("bind", "interval", action))), snap: Math.max(3.0, p("bind", "snap", action)),
                notes: Math.max(8, Math.round(p("bind", "notes", action))), next: world.tick() + Math.round(p("bind", "interval", action)),
                duration: duration, victimLease: 0, casterLease: 0, tight: 0, reason: "" };
            const id = world.effect(bindBond, target, JSON.stringify(state), duration + 40);
            if (!world.effects(target, bindBond).some(function (view) { return view.id() === id; })) { done(action); return; }
            WorldFeedback.emit(world, bindScene, 1, body.position(),
                { moment: "grip", target: String(target.ref()), path: [[origin.x(), origin.y(), origin.z()], [body.position().x(), body.position().y(), body.position().z()]],
                    notes: state.notes, tight: 0 }, 24);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), bindGripText, [0], 22);
            sound(action, "cobblemon:impact.normal");
            done(action);
        }
    });
}
