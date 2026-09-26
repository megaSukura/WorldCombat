/**
 * 吐丝 / String Shot — 执行组织。
 *
 * 核心念头：从口边射出一缕会飞的丝，缠住对手的腿脚。它有飞行时间，所以掩体与走位能躲开；
 *   命中活体就缠住（大幅掉速度、短定身），没缠住就黏在它真实撞上的那个表面，留一小片蛛网。
 *
 * 出手：`kind: "aim"`——可朝任意方向、地点或实体射出。LivingActions.projectile 负责飞行与原生碰撞，
 *   撞到第一个身体或方块就停在那里；完整动作用同一份位置与阶段数据判定与呈现。
 * 命中：活体挂共享的 world_combat:string_bound（身份 world_combat:status/silked）并 NativeEffects.boost
 *       大幅下降速度，真正掉速才在缠足模式下叠一段共享的 rooted 定身。
 * 落点：`Impact.blockPosition()/blockFace()` 给出原生方块格与表面，在首碰那一格的外侧铺少量蛛网
 *       （terrain 租借，受原生保护与占用限制，到期归还原方块）；放不下就只留一段装饰丝，不在远端目标点凭空铺网。
 * 反制：丝有飞行时间、会被掩体挡下；蛛网只作用到走进去的人，绕开即可；它不阻止对方离场。
 */
namespace PokemonSkills {
    function stringshotAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 方块表面的外法线方向；未知朝向按向上处理。 */
    function stringshotNormal(face: string): CombatPoint {
        switch (face) {
            case "down": return WorldCombat.point(0, -1, 0);
            case "north": return WorldCombat.point(0, 0, -1);
            case "south": return WorldCombat.point(0, 0, 1);
            case "west": return WorldCombat.point(-1, 0, 0);
            case "east": return WorldCombat.point(1, 0, 0);
            default: return WorldCombat.point(0, 1, 0);
        }
    }

    /** 缠住一个目标：真正掉速才挂身份、定身并给符号。返回实际下降级数。 */
    function stringshotBind(world: CombatWorld, self: CombatActor, target: CombatActor, drop: number, bindTicks: number, rootTicks: number): number {
        const body = world.observe(target);
        if (body === null) return 0;
        const changed = NativeEffects.boost(world, target, "spe", -drop);
        if (changed === 0) {
            WorldFeedback.emit(world, stringshotScene, 1, body.position(), { moment: "ward", target: String(target.ref()) }, 18);
            return 0;
        }
        const applied = Math.abs(changed);
        MobEffects.apply(world, target, stringshotEffect, bindTicks, 0);
        const rooted = rootTicks > 0;
        if (rooted) WorldEffects.apply(world, target, "rooted", {}, Math.round(rootTicks));
        WorldFeedback.emit(world, stringshotScene, 1, body.position(),
            { moment: "bind", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                drop: applied, coils: 10 + applied * 8, rooted: rooted ? 1 : 0 }, 30);
        WorldFeedback.text(world, stringshotAbove(body.position()), "world_combat.move.stringshot.text.bind", [applied], 36);
        return applied;
    }

    /** 在首碰方块的表面外侧铺一小片蛛网；只落在空气里，受原生保护与占用限制，放不下返回 0。 */
    function stringshotWeb(world: CombatWorld, hit: CombatImpact, budget: number, ticks: number): number {
        const block = hit.blockPosition();
        if (block === null || !hit.blocked()) return 0;
        const normal = stringshotNormal(hit.blockFace());
        const base = WorldCombat.point(Math.floor(block.x()) + normal.x(), Math.floor(block.y()) + normal.y(), Math.floor(block.z()) + normal.z());
        // 贴合表面在面内推开：墙面用「竖直 + 另一条水平」两轴，地面用 x/z。
        const vertical = Math.abs(normal.y()) > 0.5;
        const axisU = vertical ? WorldCombat.point(1, 0, 0) : WorldCombat.point(0, 1, 0);
        const axisV = vertical ? WorldCombat.point(0, 0, 1) : Math.abs(normal.x()) > 0.5 ? WorldCombat.point(0, 0, 1) : WorldCombat.point(1, 0, 0);
        const rows: number[][] = [[0, 0], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
        const cells: any[] = [];
        const cap = Math.max(1, Math.round(budget));
        for (let i = 0; i < rows.length && cells.length < cap; i++) {
            const p = base.plus(axisU.scale(rows[i][0])).plus(axisV.scale(rows[i][1]));
            const cell = world.block(p);
            if (cell === null || cell.id() !== "minecraft:air") continue;
            cells.push({ x: Math.floor(p.x()), y: Math.floor(p.y()), z: Math.floor(p.z()), block: "minecraft:cobweb" });
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(20, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: stringshotId,
        name: "吐丝",
        description: "从口中朝任意方向射出一缕会飞的丝：缠住第一个碰到的对手，大幅降低它的速度并短时间定住它的脚步；没缠住就黏在它真实撞上的表面，留一小片蛛网。结网形态把同一根丝打成稍大一点的小网，但不再定身。",
        uses: ["拦住冲锋或逃跑的敌人", "封住一条通道或门口", "削弱高速目标"],
        kind: "aim",
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
            const rootTicks = net ? 0 : Math.round(p(stringshotId, "rootTicks", action));
            const speed = Math.max(0.6, p(stringshotId, "strandSpeed", action));
            const radius = Math.max(0.15, p(stringshotId, "strandRadius", action));
            const netRadius = Math.max(1.4, Math.min(3.0, p(stringshotId, "netRadius", action)));
            const netTicks = Math.max(100, Math.round(p(stringshotId, "netTicks", action)));
            sound(action, "minecraft:block.cobweb.place");
            let resolved = false;
            function resolve(current: CombatAction, hit: CombatImpact | null): void {
                if (resolved) return;
                resolved = true;
                const scope = current.world();
                const struck = hit === null ? null : hit.target();
                if (struck !== null && scope.valid(struck) && !scope.friendly(struck) && String(struck.ref()) !== String(self.ref())) {
                    stringshotBind(scope, self, struck, drop, bindTicks, rootTicks);
                    return;
                }
                // 首碰方块：在真实表面外侧铺少量蛛网；没碰到方块（空气／纯实体）只留装饰丝。
                const onBlock = hit !== null && hit.blocked() && hit.blockPosition() !== null;
                const budget = net ? Math.max(2, Math.round(netRadius)) : 1;
                const ticks = net ? netTicks : Math.max(40, Math.round(bindTicks * 0.5));
                const laid = onBlock ? stringshotWeb(scope, hit!, budget, ticks) : 0;
                const at = onBlock ? hit!.blockPosition()! : hit !== null ? hit.position() : current.targetPosition();
                const webRadius = laid > 0 ? (net ? netRadius : 1.0) : 0;
                WorldFeedback.emit(scope, stringshotScene, 1, at,
                    { moment: laid > 0 ? "net" : "tangle", path: [String(self.ref()), [at.x(), at.y(), at.z()]],
                        laid: laid, radius: webRadius, threads: 8 + laid * 10, scale: laid > 0 ? (net ? netRadius / 2.0 : 0.6) : 1 }, laid > 0 ? 30 : 22);
            }
            const strand = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 60,
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.7, tint: 0xEDEDED },
                impact: function (current, hit) { resolve(current, hit); }
            }, function (current) {
                resolve(current, null);
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
