/**
 * 岩崩 / rockslide 的出手方式。
 *
 * 核心念头：把身前地面上的岩石一块块沿弧线甩向选定的那片地，让石头雨砸在站在那里的敌人身上。
 * 它是一招覆盖：块数决定能罩住多大一片、谁会挨到，每块本身不重，最先砸实的那块决定畏缩的拳头。
 *
 * 三幕：
 *   起（windup，提交前）：低头、在脚边卷起一圈石屑的预告。
 *   击（throw → flight → impact）：提交后逐块抛岩石，每块沿抛物线飞行（看得见、能躲），落在选定的那片地
 *       里自己的一小块上；落地时那一小圈里的敌人各挨一记（同一目标一次施放最多两记），第一次挨砸掷畏缩。
 *   收（rubble）：全部落定后，落点中央被砸出一片碎石地面，留一会儿后自己恢复。
 *
 * 配置 `scatter`（散布式）由 resolve 改时序、由公式改块数与单块威力：开启＝广而轻，关闭＝窄而重。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const rockslideScene = "world_combat:move_rockslide";
    const rockslideFlinchEffect = "world_combat:rockslide_flinch";
    const rockslideFlinchText = "world_combat.move.rockslide.text.flinch";
    const rockslideHitText = "world_combat.move.rockslide.text.hit";
    const rockslideMissText = "world_combat.move.rockslide.text.miss";

    function rockslideFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, rockslideFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 把落点周围的地面砸成碎石；石头、方块实体与液体不动，到期原方块回来。 */
    function rockslideRubble(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        var cells: any[] = [], r = Math.ceil(radius);
        var px = point.x(), py = point.y(), pz = point.z();
        for (var dx = -r; dx <= r; dx++) for (var dz = -r; dz <= r; dz++) {
            var distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            var x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (var dy = 0; dy >= -2; dy--) {
                var y = Math.floor(py) + dy;
                var block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                var id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                // 不能用沙砾：FallingBlock 会被宿主的 terrain 以 unsupported-terrain 拒绝，整批租赁作废。
                var surface = distance <= radius * 0.5 ? "minecraft:cobblestone" : "minecraft:tuff";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return; }
    }

    define({
        id: "rockslide",
        name: "Rock Slide",
        description: "把身前地面上的岩石一块块沿弧线甩向选定的一片地：落点周围的敌人挨砸，同一目标最多吃两记，被砸实的可能畏缩；散布式罩得更开，集中式每块更重。",
        uses: ["覆盖一片地面", "同时压住几个挤在一起的敌人", "把小范围的敌人砸懵", "在落点留下碎石地"],
        kind: "point",
        range: 9,
        maxRange: 14,
        prepare: 12,
        active: 34,
        recover: 8,
        cooldown: 40,
        style: "rock",
        defaults: { scatter: false, ai: { maxChase: 12, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("rockslide", "spread", pokemon), geometry: "area", style: "rock", label: config && config.scatter === true ? "散布岩崩" : "集中岩崩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["rockslide"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var scatter = !!(config && config.scatter);
            return {
                prepare: p("rockslide", "prepare", context) + (scatter ? 2 : 0),
                recover: p("rockslide", "recover", context),
                cooldown: p("rockslide", "cooldown", context) + (scatter ? 6 : -2),
                active: skills["rockslide"].active,
                range: p("rockslide", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("rockslide:windup", rockslideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scatter: config && config.scatter === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const centre = action.targetPosition();
            const count = Math.max(1, Math.round(p("rockslide", "boulders", action)));
            const spread = p("rockslide", "spread", action);
            const rockRadius = p("rockslide", "rockRadius", action);
            const speed = p("rockslide", "throwSpeed", action);
            const power = p("rockslide", "rockfall", action);
            const chance = p("rockslide", "flinchChance", action);
            const flinchTicks = Math.round(p("rockslide", "flinchTicks", action));
            const hitCap = Math.max(1, Math.round(p("rockslide", "hitCap", action)));
            const interval = Math.max(1, Math.round(p("rockslide", "interval", action)));
            const rubbleTicks = Math.max(20, Math.round(p("rockslide", "rubbleTicks", action)));
            const gravity = 0.045;
            const flightRange = Math.max(6, centre.minus(origin).length() + 5);
            const scale = spread / 2.6;
            let thrown = 0, pending = 0, settled = false, strikes = 0;
            const hits: { [ref: string]: number } = {};
            const flinched: { [ref: string]: boolean } = {};

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, rockslideScene, 1, origin, { moment: "throw", spread: spread, count: count }, 24);

            /** 每块岩石落地时，把它那一小圈里的敌人各结算一次（同一目标有上限），并把落地处翻成碎石。 */
            function landed(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                rockslideRubble(scope, point, rockRadius, rubbleTicks);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, rockRadius, { below: 1, above: 4 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if ((hits[ref] || 0) >= hitCap) return;
                    if (!hurt(current, enemy, "rockslide", power, { damage: damageSpec("rockslide", "rockfall") })) return;
                    hits[ref] = (hits[ref] || 0) + 1; strikes++;
                    WorldFeedback.emit(scope, rockslideScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: rockRadius / 1.05, intensity: Math.max(0.5, Math.min(2, power / 50)),
                            count: Math.round(10 + power * 0.3) }, 22);
                    if (!flinched[ref] && scope.random() < chance && rockslideFlinch(scope, enemy, flinchTicks)) {
                        flinched[ref] = true;
                        WorldFeedback.emit(scope, rockslideScene, 1, facts.position(), { moment: "flinch", target: ref }, 24);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.1, 0)), rockslideFlinchText, [], 26);
                    }
                });
            }

            function throwOne(current: CombatAction, index: number): void {
                if (index >= count) return;
                const scope = current.world();
                const angle = scope.random() * Math.PI * 2, distance = Math.sqrt(scope.random()) * spread;
                const target = centre.plus(WorldCombat.point(Math.cos(angle) * distance, 0, Math.sin(angle) * distance));
                const direction = LivingActions.ballistic(origin, target, speed, gravity) || aim(current);
                pending++;
                const flight = current.projectile(origin, direction.scale(speed), gravity, rockRadius * 0.7, flightRange, 120,
                    function (inner, hit) { landed(inner, hit.position()); },
                    function (inner) {
                        pending--;
                        if (thrown >= count && pending <= 0) {
                            rockslideSettle(inner);
                            finish(inner);
                        }
                    },
                    JSON.stringify({ block: "minecraft:stone", scale: Math.max(0.6, rockRadius * 1.5), spin: true }));
                thrown++;
                WorldFeedback.emit(scope, rockslideScene, 1, origin,
                    { moment: "launch", projectile: flight, direction: [direction.x(), direction.y(), direction.z()], rate: Math.round(24 + speed * 30) }, 100);
                sound(current, "minecraft:block.stone.break");
                if (thrown >= count) return;
                current.after(interval, function (next) { throwOne(next, index + 1); });
            }

            /** 最后一记落定后，说出砸中了几个人。 */
            function rockslideSettle(current: CombatAction): void {
                const scope = current.world();
                if (strikes === 0) {
                    WorldFeedback.emit(scope, rockslideScene, 1, centre, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.0, 0)), rockslideMissText, [], 22);
                } else {
                    WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.0, 0)), rockslideHitText, [strikes], 26);
                }
            }

            throwOne(action, 0);
        }
    });

}
