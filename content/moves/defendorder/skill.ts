/**
 * 防御指令 / defendorder — 执行组织。
 *
 * 核心念头：召来一队手下扑上来贴住身体、叠成一层会动的甲壳——每贴一只，防御与特防各 +1；被清掉一只，甲壳薄一分。
 *   它是本组里唯一由活物承载收益的一招：收益不在你身上，在那些手下身上，对手可以先清手下再打你。
 *
 * 两幕：
 *   召（windup 播「振翅」，提交前只观察与预告，打断不花代价）。
 *   附（提交后）：放出一队手下（WorldBodies 持久实体，脑 world_combat:move/defendorder/underling）贴住身体；
 *     在**施法者自己的作用域**开一条标记效果作为这批手下的账本，按**活着的手下数量**把等级写进一条由
 *     world_combat:defendorder_guard 载体拥有的 boostWindow 临时窗口，挂上共享身份 world_combat:status/defendorder 的甲壳窗口。
 * 反制：手下是活物，会被打掉；每只结束（死亡、散去或到期）时，手下只报「自己没了」，由施法者作用域立即减去这一只并重算窗口；
 *   周期核对只作兜底。窗口只按自己的来源回收，刷新时先撤本批旧窗口再重开。
 * 结束：甲壳到期或被清除时，召来的手下一起散去，窗口随载体结束，等级一次收回。
 */
namespace PokemonSkills {
    const defendorderScene = "world_combat:move_defendorder";
    const defendorderGuard = "world_combat:defendorder_guard";
    const defendorderMark = "world_combat:defendorder_mark";
    const defendorderUnderling = "world_combat:move/defendorder/underling";
    const defendorderCallText = "world_combat.move.defendorder.text.call";
    const defendorderScatterText = "world_combat.move.defendorder.text.scatter";
    /** 本招窗口的贡献来源标记：只回收由它写下的等级。 */
    const defendorderContribution = "world_combat:move/defendorder";
    /** 表现里的参考半径：`data.scale = 实际环列半径 / 这个数`。 */
    const defendorderReferenceRadius = 1.1;
    /** 甲壳能抬到的等级上限（也受能力等级 ±6 限制）。 */
    const defendorderCap = 6;
    /** 被范围清场后的一段记忆（刻）：下一次估收益时更保守，只留观察，不阻止出手。 */
    const defendorderAoeMemory = 200;
    const defendorderAoeAt: { [ref: string]: number } = Object.create(null);
    /** 同一刻里结束的手下数：一次结束两只以上，就是被成片清掉。 */
    const defendorderLostAt: { [ref: string]: number } = Object.create(null);
    const defendorderLostCount: { [ref: string]: number } = Object.create(null);

    // 账本：记录这一批手下的 ref 与已经供给的等级数，被清掉时按差额增减。amplifier 只给图标看。
    WorldCombat.effect(defendorderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json);
        if (!Array.isArray(value.refs) || typeof value.applied !== "number") throw new Error("Invalid defend order mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(defendorderMark, "start", function () { });
    WorldCombat.effectHandler(defendorderMark, "operation:world_combat:dispel", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        effect.end();
    });
    // 清全队：关掉本批窗口再结束账本，避免刷新或驱散时留下旧贡献。
    WorldCombat.effectHandler(defendorderMark, "operation:world_combat:move_defendorder/clear", function (effect) {
        const state = JSON.parse(String(effect.state()));
        if (state.window) NativeEffects.windowClose(effect.world(), state.window);
        effect.end();
    });
    // 同步账本：在施法者作用域里按「输入去掉刚失去的手下后的真实存活数」重算窗口。手下只报失去，不改写别人的账。
    WorldCombat.effectHandler(defendorderMark, "operation:world_combat:move_defendorder/sync", function (effect) {
        const world = effect.world(), owner = effect.target();
        if (!world.valid(owner)) { effect.end(); return; }
        const input = JSON.parse(String(effect.input() || "{}"));
        const state = JSON.parse(String(effect.state()));
        const dead = String(input.dead || "");
        if (dead) state.refs = state.refs.filter(function (ref: string) { return String(ref) !== dead; });
        let live = 0;
        for (let i = 0; i < state.refs.length; i++) {
            const body = world.actor(String(state.refs[i]));
            if (body !== null && world.valid(body)) live++;
        }
        const desired = Math.max(0, Math.min(defendorderCap, live));
        const applied = Math.max(0, Math.round(Number(state.applied) || 0));
        if (desired !== applied) {
            if (state.window) NativeEffects.windowClose(world, state.window);
            const guard = MobEffects.read(world, owner, defendorderGuard);
            state.window = desired > 0 && guard !== null
                ? NativeEffects.boostWindow(world, owner, { def: desired, spd: desired }, Math.max(1, guard.duration()), defendorderContribution, guard)
                : 0;
            state.applied = desired;
        }
        effect.state(JSON.stringify(state));
    });

    export function defendorderRead(world: CombatWorld, owner: CombatActor): any | null {
        const marks = world.effects(owner, defendorderMark);
        return marks.length ? JSON.parse(String(marks[0].data())) : null;
    }
    /** 账本视图：优先按施法者观察，手下死亡当刻回退到维度查询，保证当刻就能核对。 */
    function defendorderMarkView(world: CombatWorld, owner: CombatActor): CombatEffectView | null {
        const direct = world.effects(owner, defendorderMark);
        if (direct.length) return direct[0];
        const all = world.effectsOfType(defendorderMark);
        for (let i = 0; i < all.length; i++) if (String(all[i].target().key()) === String(owner.key())) return all[i];
        return null;
    }
    /** 请求在施法者作用域同步账本；`deadRef` 是刚刚结束的那只手下（没有就省略）。 */
    function defendorderSync(world: CombatWorld, owner: CombatActor, deadRef?: string): void {
        const view = defendorderMarkView(world, owner);
        if (view === null) return;
        world.operation(view.id(), "world_combat:move_defendorder/sync", JSON.stringify({ dead: deadRef || "" }));
    }
    /** 最近是否被范围清场过：给本招的 AI 估收益用，只读观察。 */
    export function defendorderAoeRecent(world: CombatWorld, owner: CombatActor): boolean {
        const at = defendorderAoeAt[String(owner.ref())];
        return typeof at === "number" && world.tick() - at < defendorderAoeMemory;
    }

    function defendorderState(brain: CombatEffect): any { return JSON.parse(brain.state()); }

    /** 手下每 2 刻贴一次：绕着施法者转，跟不上就加速追；施法者不在了就自行散去。 */
    function defendorderHover(brain: CombatEffect): void {
        const world = brain.world(), state = defendorderState(brain), self = world.observe(brain.target());
        if (self === null) { brain.end(); return; }
        const owner = world.actor(state.owner);
        if (owner === null || !world.valid(owner)) { brain.end(); return; }
        const anchor = world.observe(owner);
        if (anchor !== null) {
            const phase = state.phase + world.tick() * state.spin, radius = state.radius;
            const goal = anchor.position().plus(WorldCombat.point(Math.cos(phase) * radius, state.hover, Math.sin(phase) * radius));
            const delta = goal.minus(self.position()), length = delta.length();
            if (length > 0.05) world.motion(brain.target(), delta.unit().scale(Math.min(0.5, length)), false);
        }
        WorldFeedback.keep(world, "defendorder:cling:" + String(brain.target().ref()), defendorderScene, 1, self.position(),
            { moment: "cling", owner: state.owner, guards: state.guards, scale: state.scale, size: 0.14 * state.scale }, 20);
    }

    WorldBodies.define(defendorderUnderling, {
        schema: 1,
        maxTicks: 600,
        start: function (brain) {
            const world = brain.world(), state = defendorderState(brain), self = world.observe(brain.target());
            if (self !== null) WorldFeedback.emit(world, defendorderScene, 1, self.position(),
                { moment: "spent", owner: state.owner, scale: state.scale }, 16);
        },
        tick: { every: 2, handler: function (brain) { defendorderHover(brain); } },
        end: function (brain) {
            const world = brain.world(), state = defendorderState(brain), body = world.observe(brain.target());
            const owner = world.actor(state.owner);
            if (body !== null) WorldFeedback.emit(world, defendorderScene, 1, body.position(),
                { moment: brain.reason() === "died" ? "shed" : "spent", owner: state.owner, scale: state.scale }, 18);
            // 同一刻结束两只以上，是成片被清：给下一次估收益留一条观察。
            if (owner !== null && world.valid(owner)) {
                const key = String(owner.ref()), now = world.tick();
                if (defendorderLostAt[key] !== now) { defendorderLostAt[key] = now; defendorderLostCount[key] = 0; }
                defendorderLostCount[key] = (defendorderLostCount[key] || 0) + 1;
                if (defendorderLostCount[key] >= 2) defendorderAoeAt[key] = now;
                // 手下只报「这一只没了」；施法者作用域当刻减去它并重算窗口，不等下一次周期核对。
                defendorderSync(world, owner, String(brain.target().ref()));
            }
        }
    });

    define({
        id: "defendorder",
        cooldownParameter: "wait",
        name: "防御指令",
        description: "召来一队手下扑上来贴住身体，叠成一层会动的甲壳：每贴一只，防御与特防各 +1；被清掉一只，甲壳立即薄一级。它是本组里唯一由活物承载收益的一招——对手可以先清手下再打你。虫海式手下更多、上限更高但更脆，精锐式更少更稳。",
        uses: ["召一队手下贴上身，把两项防护堆起来", "用会动的甲壳逼对手先清手下再打你", "在近身拉锯里叠一层可被打掉的防护"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "order",
        stationary: true,
        defaults: { swarm: false, ai: { maxChase: 12, minGap: 2, panic: 0.55 } },
        fields: [flag("swarm", "虫海式")],
        indicator: function (config, pokemon) {
            return { radius: p("defendorder", "ring", pokemon), geometry: "circle", style: "order", color: 0xF2C14E,
                label: config && config.swarm === true ? "防御指令 · 虫海" : "防御指令 · 精锐" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["defendorder"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("defendorder", "tempo", context)),
                recover: Math.round(p("defendorder", "aftercast", context)),
                cooldown: Math.round(p("defendorder", "wait", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor();
            if (MobEffects.read(world, actor, defendorderGuard) !== null) return "already-guarded";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_defendorder:call", defendorderScene, 1, action.origin(),
                JSON.stringify({ moment: "call", swarm: config && config.swarm === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const swarm = !!(config && config.swarm === true);
            const brood = Math.max(2, Math.min(5, Math.round(p("defendorder", "brood", action))));
            const bond = Math.max(100, Math.round(p("defendorder", "bond", action)));
            const ring = Math.max(0.5, p("defendorder", "ring", action));
            const chitin = Math.max(1, Math.round(p("defendorder", "chitin", action)));
            const guards = Math.max(10, Math.round(p("defendorder", "guards", action)));
            const scale = ring / defendorderReferenceRadius;
            const hover = 0.25 + body.height() * 0.15;
            const refs: string[] = [];
            for (let i = 0; i < brood; i++) {
                const angle = i * (Math.PI * 2 / brood) + world.random() * 0.4;
                const point = body.position().plus(WorldCombat.point(Math.cos(angle) * ring, hover + 0.2, Math.sin(angle) * ring));
                const underling = WorldBodies.spawn(world, point, {
                    appearance: { sprite: "cobblemon:generic/ground_bugs", scale: 0.7, tint: 0xF2C14E, glow: true },
                    size: [0.3, 0.3], health: chitin, gravity: false, pushable: false, invulnerable: false,
                    silent: true, knockbackResistance: 0.5
                }, defendorderUnderling, {
                    owner: String(actor.ref()), phase: angle, spin: 0.06, radius: ring, hover: hover,
                    guards: brood, scale: scale
                }, bond + 60);
                refs.push(String(underling.ref()));
            }
            // 账本由施法者建立；随后的同步也在施法者作用域里开窗口。
            world.effect(defendorderMark, actor, JSON.stringify({ refs: refs, applied: 0, window: 0, scale: scale }), 1200);
            MobEffects.apply(world, actor, defendorderGuard, bond, brood);
            defendorderSync(world, actor);
            WorldFeedback.emit(world, defendorderScene, 1, body.position(),
                { moment: "call", actor: String(actor.ref()), guards: brood, burst: brood * 10, motes: guards, scale: scale, swarm: swarm ? 1 : 0,
                    intensity: Math.max(0.8, Math.min(1.8, brood / 3 + guards / 40)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), defendorderCallText, [brood], 30);
            world.sound("minecraft:block.beehive.work", body.position(), 16, "{}");
            done(action);
        }
    });

    // 兜底核对：手下结束当刻已经同步过，这里每 20 刻再对一次，防止任何漏网。
    WorldCombat.on("world_combat:move_defendorder/tick", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== defendorderGuard) return;
        const world = event.world();
        if (world.tick() % 20 !== 0) return;
        defendorderSync(world, event.actor());
    });

    // 甲壳到期或被清除：召来的手下一起散去，账本连同本批窗口一起收掉。刷新出的新载体不会触发这里。
    WorldCombat.on("world_combat:move_defendorder/disperse", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== defendorderGuard) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, defendorderGuard) !== null) return;
        const view = defendorderMarkView(world, actor);
        if (view !== null) {
            const state = JSON.parse(String(view.data()));
            for (let i = 0; i < state.refs.length; i++) {
                const underling = world.actor(String(state.refs[i]));
                if (underling !== null && world.valid(underling)) world.dismiss(underling);
            }
            world.operation(view.id(), "world_combat:move_defendorder/clear", "{}");
        }
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, defendorderScene, 1, body.position(), { moment: "disperse", actor: String(actor.ref()) }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.25, 0)), defendorderScatterText, [], 24);
    });
}
