/**
 * 潮旋 / whirlpool 的出手方式。
 *
 * 核心念头：把一道水旋甩到目标脚下，此后水旋以命中点为涡心，一遍遍把圈内的敌人朝中心拽回并灌水——
 * 它不钉住谁，而是让谁也别想离开那片水；目标能动、能打，却总被水流拖回涡心，直到水势耗尽或被外力拽出圈外。
 *
 * 三幕：
 *   起（windup，提交前）：脚边水花聚拢成一股回旋的预告。
 *   击（cast → grip）：提交后水箭追着目标飞出；命中即结算一次灌水（drown），在落点立起涡心，并把共享身份
 *       `world_combat:status/partiallytrapped`（本单元 `world_combat:whirlpool_current`，自带减速）挂到目标身上。
 *   收（churn → release / slip）：绑定效果每 2 刻把目标朝涡心拉 `drag` 格并维持水面；每 `interval` 灌一次水。
 *       被拽离涡心超过 `escape` 格、目标倒下、或状态被外力清掉时，水旋绷断散去。
 *
 * 与同族分开：龙卷风是短促爆发涡把人往外卷、抬；潮旋是锚定一点的长时回拉水流，靠位移而不是定身。
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
        return JSON.stringify(value);
    }

    WorldCombat.effect(whirlpoolBond, 1, 500, "actor", whirlpoolBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(whirlpoolBond, "start", function (effect) { effect.schedule("churn", "churn", 1, "{}"); });
    WorldCombat.effectHandler(whirlpoolBond, "churn", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        const anchor = whirlpoolPoint(data.point);
        if (body.position().minus(anchor).length() > data.escape) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const delta = anchor.minus(body.position()), distance = delta.length();
        if (distance > 0.03 && data.drag > 0) world.displace(victim, delta.unit().scale(Math.min(data.drag, distance)));
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            hurt(world, victim, "whirlpool", data.drown, { damage: damageSpec("whirlpool", "drown") });
            if (!world.valid(victim)) { effect.end(); return; }
            WorldFeedback.emit(world, whirlpoolScene, 1, body.position(),
                { moment: "squeeze", target: String(victim.ref()), count: Math.round(12 + data.drown),
                    intensity: Math.max(0.6, Math.min(2.2, data.drown / 24)), pulses: data.pulses }, 20);
            world.sound("cobblemon:impact.water", body.position(), 14, "{}");
        }
        WorldFeedback.keep(world, whirlpoolChurnKey + String(victim.ref()), whirlpoolScene, 1, anchor,
            { moment: "churn", target: String(victim.ref()), radius: data.radius, scale: data.radius / 1.15,
                flow: Math.round(36 + data.radius * 40), drag: data.drag }, 20);
        effect.schedule("churn", "churn", 2, "{}");
    });
    WorldCombat.effectHandler(whirlpoolBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        const current = MobEffects.read(world, victim, whirlpoolCurrent);
        if (current !== null) world.removeMobEffect(victim, whirlpoolCurrent, current.key());
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, whirlpoolScene, 1, body.position(),
            { moment: data.slipped ? "slip" : "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
            data.slipped ? whirlpoolSlipText : whirlpoolReleaseText, [], 24);
        world.sound("minecraft:entity.generic.splash", body.position(), 12, "{}");
    });
    WorldCombat.effectHandler(whirlpoolBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 外力清掉水流状态（牛奶、/effect clear、别的招式）时，绑定随之结束。
    WorldCombat.on("world_combat:move_whirlpool/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== whirlpoolCurrent) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, whirlpoolCurrent) !== null) return;
        const bonds = world.effects(victim, whirlpoolBond);
        for (let i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
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
        description: "甩出一道追踪目标的水旋锚在命中点：它只缠住被命中的那一个目标，每 2 刻把它朝涡心拽回、隔一段时间再灌一次水，并拖慢它。它不钉住谁，却让目标难以离开；被拽出圈外、水势耗尽、目标倒下或状态被清除就散去。滞水式更宽更黏更久但灌水更轻；急流式更紧更短、灌水更重。",
        uses: ["把想跑的目标一遍遍拽回交战区", "限制一个机动目标的走位", "用持续灌水磨掉难缠的近战目标", "靠减速让队友补上"],
        kind: "enemy",
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
            const drag = Math.max(0, p("whirlpool", "drag", action));
            const duration = Math.max(80, Math.round(p("whirlpool", "duration", action)));
            const interval = Math.max(6, Math.round(p("whirlpool", "interval", action)));
            const escape = Math.max(1.5, p("whirlpool", "escape", action));
            const radius = Math.max(0.7, p("whirlpool", "radius", action));
            const slow = Math.max(1, Math.min(3, Math.round(p("whirlpool", "slowStages", action))));
            const scale = radius / 1.15;
            sound(action, "cobblemon:impact.water");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.32,
                appearance: { sprite: "cobblemon:particle/generic/water/waterjet", glow: true, scale: 1.0,
                    homing: target ? { target: String(target.ref()), turn: 10, delay: 2, range: action.range() } : undefined },
                impact: function (current, hit) {
                    const scope = current.world(), victim = hit.target(), at = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        WorldFeedback.emit(scope, whirlpoolScene, 1, at, { moment: "fizzle" }, 16);
                        scope.sound("minecraft:entity.generic.splash", at, 12, "{}");
                        return;
                    }
                    if (!impact(current, hit, "whirlpool", drown, { damage: damageSpec("whirlpool", "drown") })) return;
                    if (!CombatStatus.apply(scope, victim, "partiallytrapped", whirlpoolCurrent, duration, slow, { unique: true })) return;
                    const body = scope.observe(victim);
                    if (body === null) return;
                    const anchor = body.position();
                    const state = { point: [anchor.x(), anchor.y(), anchor.z()], drag: drag, drown: drown, interval: interval,
                        escape: escape, radius: radius, next: scope.tick() + interval, pulses: 0, slipped: false };
                    const existing = scope.effects(victim, whirlpoolBond);
                    for (let i = 0; i < existing.length; i++) scope.operation(existing[i].id(), "world_combat:dispel", "{}");
                    scope.effect(whirlpoolBond, victim, JSON.stringify(state), duration + 30);
                    WorldFeedback.emit(scope, whirlpoolScene, 1, anchor,
                        { moment: "grip", target: String(victim.ref()), radius: radius, scale: scale, slow: slow }, 26);
                    WorldFeedback.text(scope, anchor.plus(WorldCombat.point(0, 1.1, 0)), whirlpoolGripText,
                        [Math.round(duration / 20 * 10) / 10], 28);
                    scope.sound("minecraft:block.bubble_column.whirlpool_ambient", anchor, 18, "{}");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, whirlpoolScene, 1, action.origin(),
                { moment: "cast", projectile: flight, scale: scale, slow: slow }, 60);
        }
    });
}
