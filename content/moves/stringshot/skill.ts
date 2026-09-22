/**
 * 吐丝 / String Shot — 执行组织。
 *
 * 核心念头：从口边射出一缕会飞的丝，缠住对手的腿脚。它有飞行时间，所以掩体与走位能躲开；
 *   命中活体就缠住（大幅掉速度、短定身），落空就把丝黏在地上留一小块蛛网。
 * 「结网」把丝打到目标落点铺开一张黏网，谁踏进去谁被黏，但不再定身、起手与冷却更长。
 *
 * 出手：短起手（windup 在口边聚起丝光）后提交；LivingActions.projectile 负责飞行与碰撞。
 * 命中：活体挂共享的 world_combat:string_bound（身份 world_combat:status/silked）并 NativeEffects.boost
 *       大幅下降速度；缠足再叠一段共享的 rooted 定身。落点按结网模式铺 cobweb（terrain 租借，到期归还）。
 * 反制：丝有飞行时间、会被掩体挡下；结网不会定身、起手更慢；蛛网只作用到走进去的人，绕开即可。
 */
namespace PokemonSkills {
    function stringshotAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 缠住一个目标：挂身份、掉速度，按模式决定要不要顺手定身。 */
    function stringshotBind(world: CombatWorld, target: CombatActor, drop: number, bindTicks: number, rootTicks: number): void {
        MobEffects.apply(world, target, stringshotEffect, bindTicks, 0);
        NativeEffects.boost(world, target, "spe", -drop);
        if (rootTicks > 0) WorldEffects.apply(world, target, "rooted", {}, Math.round(rootTicks));
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, stringshotScene, 1, body.position(),
            { moment: "bind", target: String(target.ref()), drop: drop, coils: 10 + drop * 8, rooted: rootTicks > 0 ? 1 : 0 }, 30);
        WorldFeedback.text(world, stringshotAbove(body.position()), "world_combat.move.stringshot.text.bind", [drop], 36);
    }

    /** 在落点铺一张蛛网：逐列找地表，放一层 cobweb（租借，到期归还原方块）。 */
    function stringshotNet(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            for (let dy = 0; dy >= -3; dy--) {
                const p = WorldCombat.point(centre.x() + dx, centre.y() + dy, centre.z() + dz);
                const here = world.block(p), below = world.block(p.minus(WorldCombat.point(0, 1, 0)));
                if (here === null || below === null) continue;
                if (here.id() !== "minecraft:air" || below.id() === "minecraft:air") continue;
                cells.push({ x: Math.floor(p.x()), y: Math.floor(p.y()), z: Math.floor(p.z()), block: "minecraft:cobweb" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(20, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: stringshotId,
        name: "吐丝",
        description: "从口中射出一缕会飞的丝，缠住一个对手，大幅降低它的速度并短时间定住它的脚步；落空时丝黏在地上留下一小块蛛网。也可以把丝打成一张网，谁踏进去谁被黏。",
        uses: ["拦住冲锋或逃跑的敌人", "封住一条通道或门口", "削弱高速目标"],
        kind: "enemy",
        range: 5,
        maxRange: 11,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "silk",
        defaults: { silk: false },
        fields: [
            flag("silk", "结网")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stringshotId], detail: { values: config }, world, actor, attributes };
            const net = !!(config && config.silk);
            return {
                prepare: Math.round(p(stringshotId, "tempo", context)) + (net ? 4 : 0),
                recover: p(stringshotId, "recover", context),
                cooldown: Math.round(p(stringshotId, "cooldown", context) * (net ? 1.25 : 1)),
                active: 1,
                range: Math.min(11, p(stringshotId, "reach", context) + (net ? 3 : 0))
            };
        },
        windup: function (action, config, prepare) {
            action.present("stringshot-windup", stringshotScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", silk: config && config.silk ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            const net = !!(config && config.silk);
            return { radius: net ? 8 : 5, geometry: "line", style: "silk", label: net ? "吐丝·结网" : "吐丝" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position().plus(WorldCombat.point(0, 1, 0));
            const net = !!(config && config.silk);
            const drop = Math.max(1, Math.min(3, Math.round(p(stringshotId, "speedDrop", action))));
            const bindTicks = Math.max(60, Math.round(p(stringshotId, "bindTicks", action)));
            const rootTicks = Math.round(p(stringshotId, "rootTicks", action));
            const speed = Math.max(0.6, p(stringshotId, "strandSpeed", action));
            const radius = Math.max(0.15, p(stringshotId, "strandRadius", action));
            const netRadius = Math.max(1.4, Math.min(3.0, p(stringshotId, "netRadius", action)));
            const netTicks = Math.max(100, Math.round(p(stringshotId, "netTicks", action)));
            sound(action, "minecraft:block.cobweb.place");
            let resolved = false;
            function resolve(current: CombatAction, point: CombatPoint, entity: CombatActor | null): void {
                if (resolved) return;
                resolved = true;
                const scope = current.world();
                if (net) {
                    const laid = stringshotNet(scope, point, netRadius, netTicks);
                    const caught = WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, netRadius), function (actor) {
                        stringshotBind(scope, actor, drop, bindTicks, 0);
                    });
                    WorldFeedback.emit(scope, stringshotScene, 1, point,
                        { moment: "net", radius: netRadius, laid: laid, caught: caught, threads: 30 + caught * 10, drop: drop, scale: netRadius / 2.0 }, 34);
                    if (caught > 0)
                        WorldFeedback.text(scope, stringshotAbove(point), "world_combat.move.stringshot.text.net", [caught], 36);
                    return;
                }
                if (entity !== null && !scope.friendly(entity)) {
                    stringshotBind(scope, entity, drop, bindTicks, rootTicks);
                    return;
                }
                const laid = stringshotNet(scope, point, 1.0, Math.max(40, Math.round(bindTicks * 0.5)));
                WorldFeedback.emit(scope, stringshotScene, 1, point, { moment: "tangle", laid: laid, scale: 0.55 }, 22);
            }
            const strand = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 60,
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.7, tint: 0xEDEDED },
                impact: function (current, hit) {
                    const target = hit.target();
                    resolve(current, hit.position(), target !== null && !current.world().friendly(target) ? target : null);
                }
            }, function (current) {
                resolve(current, current.targetPosition(), null);
                done(current);
            });
            WorldFeedback.emit(world, stringshotScene, 1, origin,
                { moment: "strand", projectile: strand, silk: net ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }, 26);
        }
    });

    // 被丝缠住期间，目标身上持续挂着未干的丝光。
    WorldCombat.on("world_combat:move_stringshot/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== stringshotEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "stringshot:" + String(actor.ref()), stringshotScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
