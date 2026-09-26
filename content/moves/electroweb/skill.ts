/**
 * 电网 / electroweb 的出手方式。
 *
 * 核心念头：把一张带电的网抛到选定的点上摊开，网面留在那里通电；谁踏进来就被电一下、速度下降、脚被
 * 短时间缠住，还留在网里会持续挨电。它是本组唯一可以提前布下、等人踩的招——布网的位置就是它的形状。
 *
 * 三幕：
 *   起（windup，提交前）：指爪间织起电丝、噼啪作响的预告。
 *   抛（toss → spread）：提交后电网飞向落点，撞墙就落在附近合法的地面，落地摊开成一张网格。
 *   驻（hum → catch → zap）：网面通电存续 `netTicks`；每有非友方踏进来就触电（`strike` 伤害 + 减速
 *       `slowStages` 级 + 缠足 `pinTicks`），留在网内的人每隔 `pulseTicks` 再挨一次余电（`tickle`）。
 *   收（fade）：网面电量耗尽散去。
 *
 * 网面是真实的 `WorldEffects` 场地效果（规则 `world_combat:electroweb_net` 由本单元注册），以施法者为
 * 源、落在世界坐标上；伤害走本招的 `strike`／`tickle` 伤害段，减速走共享能力等级阶梯，缠身走本单元的
 * `world_combat:electrowebbed`（身份 `world_combat:status/netted`）。
 *
 * 判定与表现读同一套事实：伤害先结算，只有真正电到（`hurt` 返回 true）才附上减速与缠足；免电目标不会
 * 被假电根束。电网的网格顶点由服务端按同一落点与半径算出，贴着实际落面铺；落到没有合法支撑处就散网。
 * 离网后残留的缠身丝线挂在一只独立托管效果上，和地网分开，效果一收丝线就断。
 *
 * 配置 `overcharge`（过载式）由 resolve 改时序、由公式改网面与初击：开启＝窄而狠、锁得更死；关闭＝广而久。
 */
namespace PokemonSkills {
    const electrowebScene = "world_combat:move_electroweb";
    const electrowebEffect = "world_combat:electrowebbed";
    const electrowebThreads = "world_combat:electroweb_threads";
    const electrowebCatchText = "world_combat.move.electroweb.text.catch";
    const electrowebSpreadText = "world_combat.move.electroweb.text.spread";
    const electrowebFizzleText = "world_combat.move.electroweb.text.fizzle";

    /** 踏进来的脚离网面太远（比如另一层楼）就不算踩中：网格贴地，不跨楼层。 */
    function electrowebFeet(body: CombatObservation): CombatPoint {
        return body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
    }
    function electrowebOnNet(field: WorldEffects.Field, body: CombatObservation): boolean {
        const feet = electrowebFeet(body);
        return feet.y() >= field.position[1] - 1.5 && feet.y() <= field.position[1] + 2.0;
    }

    /** 电网场地：踏进来触电并缠足，留在网里持续被余电咬；离开后缠身自然消退。 */
    WorldEffects.fieldRule("world_combat:electroweb_net", {
        enter: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null || !electrowebOnNet(field, body)) return;
            // 先结算伤害；免电目标（hurt 失败）不附减速与缠足，避免假电根束。
            if (!hurt(world, actor, "electroweb", Math.max(0, field.data.strike || 0), { damage: damageSpec("electroweb", "strike") })) return;
            if (!world.valid(actor)) return;
            const stages = Math.max(1, Math.round(field.data.stages || 1));
            NativeEffects.boost(world, actor, "spe", -stages);
            const pin = Math.max(6, Math.round(field.data.pin || 12));
            WorldEffects.apply(world, actor, "rooted", {}, pin);
            const hold = Math.max(20, Math.round(field.data.hold || 26));
            MobEffects.apply(world, actor, electrowebEffect, hold, 0);
            // 离网后的短余丝挂在独立托管效果上，和地网分开，随它一起收。
            world.effect(electrowebThreads, actor, JSON.stringify({ ref: String(actor.ref()), stages: stages, hold: hold }), hold);
            const next = field.data.next || (field.data.next = {});
            next[String(actor.ref())] = world.tick() + Math.max(6, Math.round(field.data.pulse || 16));
            const feet = electrowebFeet(body);
            WorldFeedback.emit(world, electrowebScene, 1, feet,
                { moment: "catch", target: String(actor.ref()), stages: stages, scale: Math.max(0.7, (field.data.radius || 2.2) / 2.2) }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), electrowebCatchText, [stages], 28);
            world.sound("cobblemon:impact.electric", feet, 16, "{}");
        },
        stay: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null || !electrowebOnNet(field, body)) return;
            const hold = Math.max(20, Math.round(field.data.hold || 26));
            MobEffects.apply(world, actor, electrowebEffect, hold, 0);
            const next = field.data.next || (field.data.next = {}), ref = String(actor.ref());
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + Math.max(6, Math.round(field.data.pulse || 16));
            // 持续余电按原预算结算，与缠足是否成立无关。
            if (!hurt(world, actor, "electroweb", Math.max(0, field.data.tickle || 0), { damage: damageSpec("electroweb", "tickle") })) return;
            if (!world.valid(actor)) return;
            WorldFeedback.emit(world, electrowebScene, 1, electrowebFeet(body),
                { moment: "zap", target: ref, count: Math.round(8 + (field.data.tickle || 0)), scale: Math.max(0.6, (field.data.radius || 2.2) / 2.2) }, 18);
        }
    });

    /** 离网后挂在被缠者身上的短余丝；自身到点或缠身被清除就结束，和地网分别收。 */
    WorldCombat.effect(electrowebThreads, 1, 120, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(electrowebThreads, "start", function (effect) {
        const world = effect.world(), body = world.observe(effect.target());
        if (body === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), "electroweb:threads:" + String(effect.target().ref()), electrowebScene, 1, body.position(),
            { moment: "residual", target: String(effect.target().ref()), stages: state.stages || 1, hold: effect.remaining() });
    });
    WorldCombat.on("world_combat:move_electroweb/clear", "world_combat:mob_effect_removed", "", function (event) {
        if (String(JSON.parse(String(event.data())).id) !== electrowebEffect) return;
        const world = event.world(), actor = event.actor();
        if (MobEffects.read(world, actor, electrowebEffect) !== null) return;
        world.effects(actor, electrowebThreads).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    /** 把落点收到地表：向下找到第一块实体方块，把网面放在它上面；找不到合法落面返回 null。 */
    function electrowebGround(world: CombatWorld, point: CombatPoint): CombatPoint | null {
        const baseX = Math.floor(point.x()), baseZ = Math.floor(point.z()), baseY = Math.floor(point.y());
        for (let dy = 1; dy >= -4; dy--) {
            const block = world.block(WorldCombat.point(baseX, baseY + dy, baseZ));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return WorldCombat.point(baseX + 0.5, baseY + dy + 1, baseZ + 0.5);
        }
        return null;
    }

    /** 贴地网格顶点：按实际落点与半径画成一条蛇形折线，线就是会通电的网格，而不是一个圆圈。 */
    function electrowebGrid(point: CombatPoint, radius: number): number[][] {
        const lines = Math.max(3, Math.min(8, Math.round(radius * 1.6)));
        const step = (radius * 2) / (lines - 1), path: number[][] = [];
        for (let i = 0; i < lines; i++) {
            const z = point.z() - radius + i * step;
            const left = point.x() - radius, right = point.x() + radius;
            if (i % 2 === 0) path.push([left, point.y() + 0.06, z], [right, point.y() + 0.06, z]);
            else path.push([right, point.y() + 0.06, z], [left, point.y() + 0.06, z]);
        }
        return path;
    }

    define({
        id: "electroweb",
        name: "Electroweb",
        description: "把一张带电的网抛到选定的点上摊开：踏进网里的敌人被电一下、速度下降并被短时间缠住脚，还留在网里的人持续挨电。网只落在合法地面上，落下就没有支撑会散掉；过载式网面更窄更狠、锁得更死。",
        uses: ["提前在敌人必经之路上布网", "封住一片地逼对手绕行", "把冲进来的目标短时间缠住", "一次电到站位分散的几个敌人"],
        kind: "point",
        range: 9,
        maxRange: 13.5,
        prepare: 10,
        active: 16,
        recover: 8,
        cooldown: 30,
        style: "electroweb",
        defaults: { overcharge: false, ai: { maxChase: 11, minFoes: 2, lead: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("electroweb", "netRadius", pokemon), geometry: "area", style: "electroweb",
                color: 0xBFE9FF, label: config && config.overcharge === true ? "过载电网" : "广域电网" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["electroweb"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const over = !!(config && config.overcharge);
            return {
                prepare: p("electroweb", "tempo", context),
                recover: p("electroweb", "recover", context),
                cooldown: p("electroweb", "cooldown", context) + (over ? 8 : 0),
                active: skills["electroweb"].active,
                range: p("electroweb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("electroweb:weave", electrowebScene, 1, action.origin(),
                JSON.stringify({ moment: "weave", over: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p("electroweb", "throwSpeed", action));
            const radius = Math.max(1.2, p("electroweb", "netRadius", action));
            const netTicks = Math.max(60, Math.round(p("electroweb", "netTicks", action)));
            const strike = p("electroweb", "strike", action);
            const tickle = p("electroweb", "tickle", action);
            const stages = Math.max(1, Math.round(p("electroweb", "slowStages", action)));
            const pin = Math.max(6, Math.round(p("electroweb", "pinTicks", action)));
            const pulse = Math.max(6, Math.round(p("electroweb", "pulseTicks", action)));
            const hold = Math.max(16, Math.round(p("electroweb", "holdTicks", action)));
            const scale = radius / 2.2;
            let opened = false;

            function open(current: CombatAction, raw: CombatPoint): void {
                if (opened) { return; }
                opened = true;
                const scope = current.world();
                const point = electrowebGround(scope, raw);
                if (point === null) {
                    WorldFeedback.emit(scope, electrowebScene, 1, raw, { moment: "fizzle", scale: scale }, 22);
                    WorldFeedback.text(scope, raw.plus(WorldCombat.point(0, 0.6, 0)), electrowebFizzleText, [], 24);
                    sound(current, "cobblemon:move.thundershock.actor");
                    done(current); return;
                }
                const grid = electrowebGrid(point, radius);
                const flow = Math.round(50 + radius * 30);
                const fieldId = WorldEffects.field(scope, "world_combat:electroweb_net", point, radius,
                    { radius: radius, strike: strike, tickle: tickle, stages: stages, pin: pin, pulse: pulse, hold: hold, next: {} }, netTicks);
                WorldFeedback.emit(scope, electrowebScene, 1, point,
                    { moment: "spread", radius: radius, flow: flow, stages: stages, scale: scale, path: grid, lines: grid.length / 2 }, 34);
                WorldFeedback.onEffect(scope, fieldId, "electroweb:hum", electrowebScene, 1, point,
                    { moment: "hum", radius: radius, flow: flow, stages: stages, scale: scale, path: grid, lines: grid.length / 2 });
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), electrowebSpreadText, [], 30);
                sound(current, "cobblemon:impact.electric");
                done(current);
            }

            sound(action, "cobblemon:move.thundershock.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: Math.max(0.25, radius * 0.32), gravity: 0.03, lifetime: 120,
                appearance: { sprite: "cobblemon:generic/orb/energyorb", glow: true, tint: 0xBFE9FF, scale: 0.9 },
                impact: function (current: CombatAction, hit: CombatImpact) { open(current, hit.position()); }
            }, function (current: CombatAction) { open(current, current.targetPosition()); });
            WorldFeedback.emit(world, electrowebScene, 1, action.origin(),
                { moment: "toss", projectile: flight, radius: radius, scale: scale }, 30);
        }
    });
}
