/**
 * 潮旋 / whirlpool 的出手方式。
 *
 * 核心念头：把一道水旋甩到目标脚下，命中点固定为涡心；此后水旋一边把圈内的敌人朝涡心收、一边让它绕着涡心
 * 打转（切向与向心各占原回拉预算的一半），一圈圈把受困者带回中心并持续灌水——它不是把人直着拽，而是让目标
 * 顺着水流绕行。目标能跑、能打，但很难离开这片水，直到水势耗尽或被外力拽出圈外。
 *
 * 三幕：
 *   起（windup，提交前）：脚边水花聚拢成一股回旋的预告。
 *   击（cast → grip）：提交后水箭自由飞出（可瞄实体，也可点方向／世界点）；命中第一个非友方活体即结算一次
 *       灌水（drown），在命中点立起涡心，并把共享身份 `world_combat:status/partiallytrapped`
 *       （本单元 `world_combat:whirlpool_current`，自带减速）挂到该目标身上；碰墙则散成一地水花。
 *   收（churn → release / slip）：绑定效果每 2 刻按原生碰撞位移把目标沿顺时针切向 + 向心带回，并维持水面；
 *       每 `interval` 灌一次水。目标离开涡心超过 `escape` 格、倒下、或状态被外力清掉时，水旋绷断散去。
 *
 * 与同族分开：潮旋锚定一点、靠半切向半向心的曳引把单个敌人绕回；火柱跟身、流沙只吃贴地、电笼只拦越界。
 * 位移走 `world.hitDisplace`，因此原生抗推（击退抗性）与碰撞都会真实生效：抗推目标不会被硬拽。
 */
namespace PokemonSkills {
    const whirlpoolScene = "world_combat:move_whirlpool";
    const whirlpoolCurrent = "world_combat:whirlpool_current";
    const whirlpoolBond = "world_combat:whirlpool_bond";
    const whirlpoolChurnKey = "whirlpool:churn:";
    const whirlpoolGripText = "world_combat.move.whirlpool.text.grip";
    const whirlpoolReleaseText = "world_combat.move.whirlpool.text.release";
    const whirlpoolSlipText = "world_combat.move.whirlpool.text.slip";

    function whirlpoolPoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    function whirlpoolBondData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid whirlpool anchor");
        ["drag", "drown", "interval", "escape", "radius", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid whirlpool current");
        });
        if (value.interval < 1 || value.escape <= 0 || value.radius <= 0 || value.drag < 0) throw new Error("Invalid whirlpool current");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid whirlpool carrier");
        return JSON.stringify(value);
    }

    WorldCombat.effect(whirlpoolBond, 1, 500, "actor", whirlpoolBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(whirlpoolBond, "start", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.matches(world, victim, data.carrier)) { effect.end(); return; }
        MobEffects.bind(world, victim, whirlpoolCurrent);
        effect.schedule("churn", "churn", 1, "{}");
    });
    WorldCombat.effectHandler(whirlpoolBond, "churn", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.matches(world, victim, data.carrier)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = whirlpoolPoint(data.point);
        const pos = body.position();
        // 逃脱判定相对命中锚点：被击退、冲刺或瞬移一步跨出 escape 就绷断。
        if (pos.minus(anchor).length() > data.escape) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        // 原 drag 预算拆成切向与向心各一半；水平面内操作，避免把重力算进曳引。
        const dx = anchor.x() - pos.x(), dz = anchor.z() - pos.z();
        const horiz = Math.sqrt(dx * dx + dz * dz);
        if (horiz > 0.04 && data.drag > 0) {
            const ix = dx / horiz, iz = dz / horiz;
            const tx = iz, tz = -ix; // 俯视顺时针
            const turn = Math.max(0.3, data.radius * 0.5);
            const spin = horiz > turn ? data.drag * 0.5 : 0;
            const pull = Math.min(data.drag * 0.5, horiz);
            world.hitDisplace(victim, WorldCombat.point(ix * pull + tx * spin, 0, iz * pull + tz * spin));
        }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            const landed = hurt(world, victim, "whirlpool", data.drown, { damage: damageSpec("whirlpool", "drown") });
            if (!world.valid(victim)) { effect.end(); return; }
            const at = world.observe(victim);
            if (landed) WorldFeedback.emit(world, whirlpoolScene, 1, at !== null ? at.position() : anchor,
                { moment: "squeeze", target: String(victim.ref()), count: Math.round(12 + data.drown),
                    intensity: Math.max(0.6, Math.min(2.2, data.drown / 24)), pulses: data.pulses }, 20);
            if (landed) world.sound("cobblemon:impact.water", at !== null ? at.position() : anchor, 14, "{}");
        }
        const current = world.observe(victim);
        const at = current !== null ? current.position() : anchor;
        const ax = anchor.x(), ay = anchor.y(), az = anchor.z();
        // 持续表现绑在本题的绑定效果上：效果自然到期或被驱散时，水面与连接线同时收走。
        WorldFeedback.onEffect(world, effect.id(), whirlpoolChurnKey + String(victim.ref()), whirlpoolScene, 1, anchor,
            { moment: "churn", target: String(victim.ref()), radius: data.radius, scale: data.radius / 1.15,
                flow: Math.round(36 + data.radius * 40), direction: horiz > 0.04 ? [dz / horiz, 0, -dx / horiz] : [1, 0, 0],
                path: [String(victim.ref()), [ax, ay, az]], pulses: data.pulses || 0 });
        effect.schedule("churn", "churn", 2, "{}");
    });
    WorldCombat.effectHandler(whirlpoolBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        // 只撤本绑定自己那一次种下的水流载体；旧载体被替换后不再误删新载体。
        if (data.carrier && MobEffects.matches(world, victim, data.carrier)) {
            const current = MobEffects.read(world, victim, whirlpoolCurrent);
            if (current !== null) world.removeMobEffect(victim, whirlpoolCurrent, current.key());
        }
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, whirlpoolScene, 1, body.position(),
            { moment: data.slipped ? "slip" : "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
            data.slipped ? whirlpoolSlipText : whirlpoolReleaseText, [], 24);
        world.sound("minecraft:entity.generic.splash", body.position(), 12, "{}");
    });
    WorldCombat.effectHandler(whirlpoolBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 外力清掉水流状态（牛奶、/effect clear、别的招式）时，只结束那些载体已不再匹配的绑定。
    WorldCombat.on("world_combat:move_whirlpool/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== whirlpoolCurrent) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const bonds = world.effects(victim, whirlpoolBond);
        for (let i = 0; i < bonds.length; i++) {
            let state: any;
            try { state = JSON.parse(String(bonds[i].data())); } catch (error) { state = null; }
            if (state === null || !state.carrier || !MobEffects.matches(world, victim, state.carrier))
                world.operation(bonds[i].id(), "world_combat:dispel", "{}");
        }
    });

    // 卷入者被水流拖慢：对宝可梦与原生生物一致按减速级数压低脚本导航速度（原版生物另由效果属性修饰）。
    WorldCombat.on("world_combat:move_whirlpool/current", "world_combat:navigate", "", function (event) {
        const state = MobEffects.read(event.world(), event.actor(), whirlpoolCurrent);
        if (state === null) return;
        const factor = Math.max(0.3, Math.min(0.9, 1 - 0.17 * state.amplifier()));
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (Number(data.speed) || 0) * factor);
        event.data(JSON.stringify(data));
    });

    define({
        id: "whirlpool",
        name: "Whirlpool",
        description: "甩出一道自由瞄准的水旋，命中第一个敌人处锚成涡心：它只缠住被命中的那一个目标，每 2 刻把它沿顺时针旋流朝涡心带回一段（一半绕行、一半收拢），隔一段时间再灌一次水，并拖慢它。它不钉住谁，却让目标难以离开；被拽出涡心、水势耗尽、目标倒下或状态被清除就散去。滞水式更宽更黏更久但灌水更轻；急流式更紧更短、灌水更重。",
        uses: ["把想跑的目标一遍遍绕回交战区", "限制一个机动目标的走位", "用持续灌水磨掉难缠的近战目标", "靠减速让队友补上"],
        kind: "aim",
        range: 11,
        maxRange: 18,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 44,
        style: "whirlpool",
        defaults: { mire: false, ai: { maxChase: 12, preferMovers: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("whirlpool", "reach", pokemon), geometry: "line", style: "whirlpool", color: 0x3A78C2,
                label: config && config.mire === true ? "滞水潮旋" : "急流潮旋" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["whirlpool"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const mire = !!(config && config.mire);
            return {
                prepare: Math.round(p("whirlpool", "charge", context)),
                recover: 8,
                cooldown: Math.round(p("whirlpool", "duration", context) * 0.22) + 16 + (mire ? 8 : 0),
                active: skills["whirlpool"].active,
                range: p("whirlpool", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("whirlpool:gather", whirlpoolScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", mire: config && config.mire === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const speed = Math.max(0.5, p("whirlpool", "speed", action));
            const drown = p("whirlpool", "drown", action);
            const duration = Math.max(80, Math.round(p("whirlpool", "duration", action)));
            const interval = Math.max(6, Math.round(p("whirlpool", "interval", action)));
            const slow = Math.max(1, Math.min(3, Math.round(p("whirlpool", "slowStages", action))));
            const scenes = WorldFeedback.actionScenes(whirlpoolScene);
            sound(action, "cobblemon:impact.water");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.32,
                appearance: { sprite: "cobblemon:particle/generic/water/waterjet", glow: true, scale: 1.0,
                    homing: target ? { target: String(target.ref()), turn: 10, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    scenes.stop(current, "cast");
                    const scope = current.world(), at = hit.position();
                    // 碰墙散水：只按原生方块格与表面呈现，不在墙上立涡。
                    if (!hit.hitEntity() && hit.blocked()) {
                        const cell = hit.blockPosition();
                        const point = at;
                        WorldFeedback.emit(scope, whirlpoolScene, 1, point, { moment: "scatter", face: hit.blockFace() }, 18);
                        scope.sound("minecraft:entity.generic.splash", point, 12, "{}");
                        return;
                    }
                    const victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, whirlpoolScene, 1, at, { moment: "fizzle" }, 16);
                        scope.sound("minecraft:entity.generic.splash", at, 12, "{}");
                        return;
                    }
                    // 真实伤害许可：被拒则完全不当命中，不立涡也不推目标。
                    if (!impact(current, hit, "whirlpool", drown, { damage: damageSpec("whirlpool", "drown") })) return;
                    // 体型相关参数对实际被命中的目标求值。
                    const aimed = withTarget(factContext(current), victim);
                    const actualDrag = Math.max(0, p("whirlpool", "drag", aimed));
                    const escape = Math.max(1.5, p("whirlpool", "escape", aimed));
                    const radius = Math.max(0.7, p("whirlpool", "radius", aimed));
                    const scale = radius / 1.15;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    // 旧绑定先清：它的结束只撤自己那一次载体，随后再种新的并记下新 key。
                    const existing = scope.effects(victim, whirlpoolBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", whirlpoolCurrent, duration, slow, { unique: true })) return;
                    const carrier = MobEffects.read(scope, victim, whirlpoolCurrent);
                    if (carrier === null) return;
                    const anchor = at;
                    const state = { point: [anchor.x(), anchor.y(), anchor.z()], drag: actualDrag, drown: drown, interval: interval,
                        escape: escape, radius: radius, next: scope.tick() + interval, pulses: 0, slipped: false,
                        carrier: MobEffects.anchor(carrier) };
                    scope.effect(whirlpoolBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.emit(scope, whirlpoolScene, 1, anchor,
                        { moment: "grip", target: String(victim.ref()), radius: radius, scale: scale, slow: slow }, 26);
                    WorldFeedback.text(scope, anchor.plus(WorldCombat.point(0, 1.1, 0)), whirlpoolGripText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("minecraft:block.bubble_column.whirlpool_ambient", anchor, 18, "{}");
                }
            }, function complete(current: CombatAction) { scenes.finish(current, done); });
            scenes.show(action, "cast", action.origin(),
                { moment: "cast", projectile: flight, slow: slow });
        }
    });
}
