/**
 * 岩石炮 / rockwrecker 的出手方式。
 *
 * 核心念头：扛起一块巨石，沿抛物线砸向选定的落点——石头走弧线，所以矮掩体不一定救得了人，但高墙仍能把它挡下。
 * 落地的一刻整块碎开，把落点一圈的敌人一起砸伤、向外顶开，并扬起一片短命的碎石尘；扛石过力，施法者随后力竭一段时间。
 *
 * 三幕：
 *   起：把巨石举过头顶、脚下起尘（windup，提交前）。
 *   击：提交后用 `action.projectile` 的重力弹道沿抛物线抛出巨石（看得见、能躲）；出手方向按这块石头的真实初速与重力解出，
 *       解不出的落点会自然抛不到；命中活体或落地即碎裂（shatter），对碎裂半径内的敌人各结算一记 `boulder` 并沿背离方向顶开。
 *       碎裂只扬起临时碎石视觉，不替换地面方块——地板保持原材质。
 *   收：无论砸中与否，施法者挂上 `world_combat:status/mustrecharge` 力竭并浮字；期间 mob_effect_tick 维持余尘。
 *
 * 选取：`kind: "point"`——自由选落点空投；AI 仍可为攻击用途推荐敌人，命中权限由命中层判定。
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 rooted 补上。
 */
namespace PokemonSkills {
    const rockwreckerScene = "world_combat:move_rockwrecker";
    const rockwreckerSpentEffect = "world_combat:rockwrecker_spent";
    const rockwreckerShatterText = "world_combat.move.rockwrecker.text.shatter";
    const rockwreckerMissText = "world_combat.move.rockwrecker.text.miss";
    const rockwreckerSpentText = "world_combat.move.rockwrecker.text.spent";
    /** 这一抛的固定重力；预告与执行共用，保证画出的可达落点就是实际弹道。 */
    const rockwreckerGravity = 0.05;

    /** 用这块石头的真实初速与重力，估算它水平最多能落到多远；预告的可达落点与射程上限读同一个数。 */
    function rockwreckerReach(speed: number, gravity: number, limit: number): number {
        if (!(speed > 0) || !(gravity > 0) || !(limit > 0)) return limit;
        let reachable = 0;
        for (let distance = 1; distance <= limit; distance += 0.5) {
            if (LivingActions.ballistic(WorldCombat.point(0, 0, 0), WorldCombat.point(distance, 0, 0), speed, gravity) === null) break;
            reachable = distance;
        }
        return Math.max(1, reachable);
    }

    /** 扛石过力：挂上力竭状态（共享身份 mustrecharge）并停步，播放收场表现与浮字。 */
    function rockwreckerSpent(action: CombatAction, ticks: number, hits: number, intensity: number): void {
        const world = action.world();
        MobEffects.apply(world, action.actor(), rockwreckerSpentEffect, ticks, 0);
        WorldEffects.apply(world, action.actor(), "rooted", {}, ticks);
        world.stopMovement(action.actor());
        const body = world.observe(action.actor());
        if (body !== null) {
            WorldFeedback.emit(world, rockwreckerScene, 1, body.position(),
                { moment: "spent", scale: intensity, seconds: ticks / 20, hits: hits, count: Math.round(10 + (ticks / 20) * 5) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), rockwreckerSpentText,
                [Math.round(ticks / 20 * 10) / 10], 30);
        }
        sound(action, "minecraft:entity.generic.big_fall");
    }

    define({
        freeMovement: true,
        id: "rockwrecker",
        name: "Rock Wrecker",
        description: "扛起一块巨石按抛物线砸向选定的落点：石头按真实初速与重力飞出，能越过矮掩体，但高墙会提前把它挡碎；落地碎裂，把落点一圈的敌人一起砸伤、顶开并扬起碎石；放完自己扛石过力、力竭一段时间，无法行动也无法移动。",
        uses: ["一发走抛物线的大石", "越过矮掩体砸在目标脚下", "把落点一圈砸开并扬起碎石"],
        kind: "point",
        range: 10,
        maxRange: 18,
        prepare: 12,
        active: 50,
        recover: 10,
        cooldown: 74,
        style: "rock",
        stationary: true,
        defaults: { crush: false, ai: { minHealth: 0.35, minRange: 3 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["rockwrecker"], detail: { values: config } };
            const speed = p("rockwrecker", "speed", context);
            const limit = p("rockwrecker", "reach", context);
            return { radius: Math.min(limit, rockwreckerReach(speed, rockwreckerGravity, limit)), geometry: "line", style: "rock", color: 0x8C7B63, label: "岩石炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["rockwrecker"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("rockwrecker", "charge", context)),
                recover: 10,
                cooldown: Math.round(p("rockwrecker", "exhaust", context)) + 16,
                range: p("rockwrecker", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const target = action.targetPosition();
            action.present("world_combat:move_rockwrecker:windup", rockwreckerScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, crush: !!(config && config.crush),
                    point: [target.x(), target.y(), target.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(rockwreckerScene);
            const world = action.world();
            const origin = action.origin();
            const point = action.targetPosition();
            const speed = p("rockwrecker", "speed", action);
            const radius = p("rockwrecker", "radius", action);
            const power = p("rockwrecker", "boulder", action);
            const shove = p("rockwrecker", "shove", action);
            const stone = p("rockwrecker", "collisionRadius", action);
            const debris = Math.max(20, Math.round(p("rockwrecker", "rubbleTicks", action)));
            const base = Math.max(1, Math.round(p("rockwrecker", "exhaust", action)));
            const gravity = rockwreckerGravity;
            const scale = radius / 1.9;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            let settled = false, landing: CombatPoint | null = null;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.stop(current, "flight");
                const scope = current.world();
                if (landing === null) {
                    const miss = current.targetPosition();
                    WorldFeedback.emit(scope, rockwreckerScene, 1, miss, { moment: "miss", point: [miss.x(), miss.y(), miss.z()], scale: scale }, 20);
                    WorldFeedback.text(scope, miss.plus(WorldCombat.point(0, 1.0, 0)), rockwreckerMissText, [], 24);
                    rockwreckerSpent(current, base, 0, intensity);
                    scenes.finish(current, done);
                    return;
                }
                const at = landing;
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2, above: 4 }), function (enemy, facts) {
                    if (!hurt(current, enemy, "rockwrecker", power, { damage: damageSpec("rockwrecker", "boulder") })) return;
                    hits++;
                    const outward = facts.position().minus(at);
                    if (outward.length() >= 0.05 && scope.valid(enemy)) scope.hitDisplace(enemy, outward.unit().scale(shove));
                    WorldFeedback.emit(scope, rockwreckerScene, 1, facts.position(),
                        { moment: "crush", target: String(enemy.ref()), scale: scale, intensity: intensity, count: Math.round(16 + power * 0.35) }, 26);
                });
                WorldFeedback.emit(scope, rockwreckerScene, 1, at,
                    { moment: "shatter", point: [at.x(), at.y(), at.z()], scale: scale, intensity: intensity,
                        radius: radius, count: Math.round(60 + power * 0.8), shove: shove, hits: hits }, 38);
                // 临时碎石：只在落点扬起碎屑与尘，不改动方块，地板保持原材质；停留时长由 rubbleTicks 决定。
                WorldFeedback.emit(scope, rockwreckerScene, 1, at,
                    { moment: "rubble", point: [at.x(), at.y(), at.z()], scale: scale, intensity: intensity,
                        radius: radius, debris: Math.min(120, debris), count: Math.round(24 + power * 0.3) }, debris);
                sound(current, "minecraft:block.stone.break");
                sound(current, "cobblemon:impact.rock");
                if (hits > 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), rockwreckerShatterText, [hits], 28);
                    sound(current, "cobblemon:move.rockthrow.target");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), rockwreckerMissText, [], 24);
                }
                rockwreckerSpent(current, base, hits, intensity);
                scenes.finish(current, done);
            }

            // 出手方向按真实初速与重力解出；解不出（超出这一抛可达范围）就沿瞄准方向抛出，让它自然落短。
            const launch = LivingActions.ballistic(origin, point, speed, gravity) || aim(action);
            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockwreckerScene, 1, origin, { moment: "throw", scale: scale, intensity: intensity, radius: radius }, 18);
            const flight = action.projectile(origin, launch.scale(speed), gravity, stone, action.range() + 4, 140,
                function (current, hit) {
                    if (landing === null) landing = hit.position();
                    finish(current);
                },
                function (current) { finish(current); },
                JSON.stringify({ block: "minecraft:stone", scale: Math.max(1.0, radius * 0.7), spin: true }));
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity, radius: radius, debris: Math.min(120, debris) });
        }
    });

    // 力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:rockwrecker/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 力竭挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_rockwrecker/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockwreckerSpentEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 力竭期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_rockwrecker/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), rockwreckerSpentEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持低密度的余尘：少而稳，靠近脚边，让玩家看清目标。
    WorldCombat.on("world_combat:move_rockwrecker/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockwreckerSpentEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_rockwrecker/recharge/" + String(actor.ref()), rockwreckerScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
