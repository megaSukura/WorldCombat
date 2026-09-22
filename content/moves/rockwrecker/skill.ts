/**
 * 岩石炮 / rockwrecker 的出手方式。
 *
 * 核心念头：扛起一块巨石，沿抛物线砸向目标——石头走弧线，所以掩体不一定救得了人；落地的一刻整块碎开，
 * 把落点一圈的敌人一起砸伤、向外顶开，并在世界的地面上留下真正的碎石。扛石过力，施法者随后力竭一段时间。
 *
 * 三幕：
 *   起：把巨石举过头顶、脚下起尘（windup，提交前）。
 *   击：提交后用 `LivingActions.ballistic` 沿抛物线抛出巨石（看得见、能躲）；命中活体或落地即碎裂（shatter），
 *       对碎裂半径内的敌人各结算一记 `boulder` 并沿背离方向顶开，同时把落点地面翻成碎石（世界留痕）。
 *   收：无论砸中与否，施法者挂上 `world_combat:status/mustrecharge` 力竭并浮字；期间 mob_effect_tick 维持余尘。
 *
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 rooted 补上。
 */
namespace PokemonSkills {
    const rockwreckerScene = "world_combat:move_rockwrecker";
    const rockwreckerSpentEffect = "world_combat:rockwrecker_spent";
    const rockwreckerShatterText = "world_combat.move.rockwrecker.text.shatter";
    const rockwreckerMissText = "world_combat.move.rockwrecker.text.miss";
    const rockwreckerSpentText = "world_combat.move.rockwrecker.text.spent";

    /** 把落点周围的地面砸成碎石；石头、方块实体与液体不动，到期原方块回来。 */
    function rockwreckerRubble(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const cells: any[] = [], r = Math.ceil(radius);
        const px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 0; dy >= -3; dy--) {
                const y = Math.floor(py) + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                // 不能用沙砾：FallingBlock 会被宿主的 terrain 以 unsupported-terrain 拒绝，整批租赁作废。
                const surface = distance <= radius * 0.5 ? "minecraft:cobblestone" : "minecraft:tuff";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return; }
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
        id: "rockwrecker",
        name: "Rock Wrecker",
        description: "The user launches a huge boulder at the target to attack. The user can't move on the next turn.",
        uses: ["一发走抛物线的大石", "越过掩体砸在目标脚下", "把落点一圈砸开并留下碎石地"],
        kind: "enemy",
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
            return { radius: p("rockwrecker", "radius", pokemon), geometry: "area", style: "rock", color: 0x8C7B63, label: "岩石炮" };
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
            const world = action.world();
            const origin = action.origin();
            const point = action.targetPosition();
            const speed = p("rockwrecker", "speed", action);
            const radius = p("rockwrecker", "radius", action);
            const power = p("rockwrecker", "boulder", action);
            const shove = p("rockwrecker", "shove", action);
            const stone = p("rockwrecker", "collisionRadius", action);
            const rubble = Math.max(20, Math.round(p("rockwrecker", "rubbleTicks", action)));
            const base = Math.max(1, Math.round(p("rockwrecker", "exhaust", action)));
            const gravity = 0.05;
            const scale = radius / 1.9;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            let settled = false, landing: CombatPoint | null = null;

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockwreckerScene, 1, origin, { moment: "throw", scale: scale, intensity: intensity, radius: radius }, 30);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (landing === null) {
                    const miss = current.targetPosition();
                    WorldFeedback.emit(scope, rockwreckerScene, 1, miss, { moment: "miss", point: [miss.x(), miss.y(), miss.z()], scale: scale }, 20);
                    WorldFeedback.text(scope, miss.plus(WorldCombat.point(0, 1.0, 0)), rockwreckerMissText, [], 24);
                    rockwreckerSpent(current, base, 0, intensity);
                    done(current);
                    return;
                }
                const at = landing;
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2, above: 4 }), function (enemy, facts) {
                    if (!hurt(current, enemy, "rockwrecker", power, { damage: damageSpec("rockwrecker", "boulder") })) return;
                    hits++;
                    const outward = facts.position().minus(at);
                    if (outward.length() >= 0.05 && scope.valid(enemy)) scope.displace(enemy, outward.unit().scale(shove));
                    WorldFeedback.emit(scope, rockwreckerScene, 1, facts.position(),
                        { moment: "crush", target: String(enemy.ref()), scale: scale, intensity: intensity, count: Math.round(16 + power * 0.35) }, 26);
                });
                rockwreckerRubble(scope, at, radius, rubble);
                WorldFeedback.emit(scope, rockwreckerScene, 1, at,
                    { moment: "shatter", point: [at.x(), at.y(), at.z()], scale: scale, intensity: intensity,
                        radius: radius, count: Math.round(60 + power * 0.8), shove: shove, hits: hits }, 38);
                sound(current, "minecraft:block.stone.break");
                sound(current, "cobblemon:impact.rock");
                if (hits > 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), rockwreckerShatterText, [hits], 28);
                    sound(current, "cobblemon:move.rockthrow.target");
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), rockwreckerMissText, [], 24);
                }
                rockwreckerSpent(current, base, hits, intensity);
                done(current);
            }

            const launch = LivingActions.ballistic(origin, point, speed, gravity) || aim(action);
            const flight = action.projectile(origin, launch.scale(speed), gravity, stone, action.range() + 4, 140,
                function (current, hit) {
                    if (landing === null) landing = hit.position();
                    finish(current);
                },
                function (current) { finish(current); },
                JSON.stringify({ block: "minecraft:stone", scale: Math.max(1.0, radius * 0.7), spin: true }));
            WorldFeedback.emit(world, rockwreckerScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity, radius: radius,
                    direction: [point.minus(origin).x(), point.minus(origin).y(), point.minus(origin).z()] }, 140);
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
