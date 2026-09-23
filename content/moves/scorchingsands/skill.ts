/**
 * 热沙大地 / scorchingsands 的出手方式。
 *
 * 核心念头：弯腰铲起一把被地热烤烫的沙，朝一点扬出去——沙幕沿弧线撒向落点，落地时整片炸开，
 *   把圈里的人一起烫伤、可能点着；热沙就落在地表铺成一片，留一段时间。
 *
 * 三幕：
 *   起（gather，提交前）：脚边沙粒被热力吸起、地表微微发烫的预告，只播画面。
 *   扬（fling，提交后）：沙幕按抛物线撒向落点；站在沙地上的施法者能铲到更多沙。
 *   埋（burst → hit / smolder）：落点整片炸开——圈内每个敌人各结算一次 grit 伤害（湿身目标 ×1.15）并按概率灼伤；
 *       地表被烤成一层结实的沙壳（`world.terrain` 租借 `minecraft:sandstone`，linger 活过招式）；闷烧式再留一片持续烫人的热沙直到 coatTicks 到点。
 *
 * 与同族分开：热水是水洼、热风是一片推人的扇面、炼狱是一根必灼的火柱；只有热沙大地会把沙本身留在地上。
 * 配置 hearth 由 resolve 改时序、由公式改威力与留存，提交后才触碰世界。
 */
namespace PokemonSkills {
    const scorchingScene = "world_combat:move_scorchingsands";
    const scorchingField = "world_combat:field/scorchingsands";
    const scorchingBurnText = "world_combat.move.scorchingsands.text.burn";
    const scorchingHitText = "world_combat.move.scorchingsands.text.hit";

    /** 脚下有沙或砂岩时铲得到更多沙：沙量、画面与扬尘都更足。 */
    function scorchingGround(world: CombatWorld, point: CombatPoint): boolean {
        const base = WorldCombat.point(point.x(), Math.floor(point.y()), point.z());
        for (let dy = 0; dy >= -2; dy--) {
            const block = world.block(base.plus(WorldCombat.point(0, dy, 0)));
            if (block === null) return false;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return id === "minecraft:sand" || id === "minecraft:red_sand" || id === "minecraft:sandstone"
                || id === "minecraft:red_sandstone" || block.tagged("c:sand") || block.tagged("c:sandstone");
        }
        return false;
    }

    /** 闷烧式留下的热沙：踏入被烫一次，站着不走按间隔反复挨烫。 */
    WorldEffects.fieldRule(scorchingField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, scorchingScene, 1, body.position(),
                { moment: "smolder", target: String(actor.ref()), scale: field.radius / 2.6 }, 20);
            if (world.random() < (Number(field.data.chance) || 0) && CombatStatus.inflict(world, actor, "burn"))
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), scorchingBurnText, [], 24);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + (Number(field.data.interval) || 12);
            const body = world.observe(actor);
            if (body === null) return;
            if (!hurt(world, actor, "scorchingsands", Number(field.data.power) || 1, { damage: damageSpec("scorchingsands", "hearth") })) return;
            WorldFeedback.emit(world, scorchingScene, 1, body.position(),
                { moment: "smolder", target: ref, seethe: Math.round(Number(field.data.power) || 0), scale: field.radius / 2.6 }, 18);
        }
    });

    /** 在落点周围把地表烤成一层沙壳（租借 `minecraft:sandstone`，linger，到期原方块回来）。
     *  宿主拒绝把方块放进有活物站着的格子，先记下附近活物的包围范围、跳过这些格子，沙壳就会在目标周围铺开而不是整片落空。 */
    function scorchSand(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [];
        const limit = Math.max(6, Math.round(cap));
        const r = Math.ceil(Math.min(4.5, radius));
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const bounds: number[][] = [];
        const nearby = world.query(point, Math.max(1, Math.min(8, radius + 2)), false);
        for (let i = 0; i < nearby.length; i++) {
            const body = world.observe(nearby[i]);
            if (body === null) continue;
            const at = body.position(), halfW = body.width() / 2, halfH = body.height() / 2;
            bounds.push([at.x() - halfW, at.y() - halfH, at.z() - halfW, at.x() + halfW, at.y() + halfH, at.z() + halfW]);
        }
        function occupied(x: number, y: number, z: number): boolean {
            for (let i = 0; i < bounds.length; i++) {
                const b = bounds[i];
                if (x + 1 > b[0] && x < b[3] && y + 1 > b[1] && y < b[4] && z + 1 > b[2] && z < b[5]) return true;
            }
            return false;
        }
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 2; dy >= -3; dy--) {
                const y = baseY + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                const above = world.block(WorldCombat.point(x, y + 1, z));
                const over = above === null ? "" : String(above.id());
                if ((over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air") && !occupied(x, y, z))
                    cells.push({ x: x, y: y, z: z, block: "minecraft:sandstone" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "scorchingsands",
        cooldownParameter: "recharge",
        name: "Scorching Sands",
        description: "弯腰铲起一把被地热烤烫的沙、朝一点扬出去：沙幕沿弧线撒向落点，落地整片炸开，圈里的人一起挨烫、可能被点着，落点的地表被烤成一层沙壳。站在沙地上能铲到更多沙，热沙粘在湿身目标身上更狠。",
        uses: ["朝一点扬一把热沙一次烫到一圈人", "把地表盖上一层沙封住一片地", "在沙地上铲更多沙、铺得更广", "对湿身的目标多算一份伤害"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "scorching",
        defaults: { hearth: false, ai: { maxChase: 13, preferClusters: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("scorchingsands", "spread", pokemon), geometry: "area", style: "scorching",
                color: 0xD9A85C, label: config && config.hearth === true ? "闷烧热沙" : "赤沙热沙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["scorchingsands"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("scorchingsands", "flingTicks", context)),
                recover: Math.round(p("scorchingsands", "settleTicks", context)),
                cooldown: Math.round(p("scorchingsands", "recharge", context)),
                active: skills["scorchingsands"].active,
                range: p("scorchingsands", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("scorchingsands:gather", scorchingScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", hearth: config && config.hearth === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const hearth = !!(config && config.hearth);
            const point = action.targetPosition();
            const body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            const sandy = scorchingGround(world, origin);
            const power = p("scorchingsands", "grit", action) * (sandy ? 1.08 : 1);
            const speed = Math.max(0.5, p("scorchingsands", "flingSpeed", action));
            const radius = Math.max(1.2, p("scorchingsands", "spread", action));
            const chance = Math.max(0.05, Math.min(0.6, p("scorchingsands", "burnChance", action)));
            const cells = Math.max(6, Math.round(p("scorchingsands", "sandCells", action) * (sandy ? 1.4 : 1)));
            const coat = Math.max(40, Math.round(p("scorchingsands", "coatTicks", action)));
            const embers = Math.max(8, Math.round(p("scorchingsands", "embers", action)));
            const hPower = Math.max(1, p("scorchingsands", "hearthPower", action));
            const hInterval = Math.max(6, Math.round(p("scorchingsands", "hearthInterval", action)));
            const hChance = Math.max(0.02, Math.min(0.4, p("scorchingsands", "hearthChance", action)));
            const distance = origin.minus(point).length();
            const scale = radius / 2.6;
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            let settled = false, landed = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function land(current: CombatAction, at: CombatPoint): void {
                if (landed) return;
                landed = true;
                const scope = current.world();
                const placed = scorchSand(scope, at, radius, coat, cells);
                sound(current, "minecraft:block.sand.break");
                WorldFeedback.emit(scope, scorchingScene, 1, at,
                    { moment: "burst", radius: radius, scale: scale, cells: placed, embers: embers, intensity: intensity }, 30);
                const hitRefs: { [ref: string]: boolean } = {};
                let total = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 3, above: 3 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (hitRefs[ref]) return;
                    hitRefs[ref] = true;
                    const already = CombatStatus.has(scope, enemy, "burn");
                    const dealt = facts.wet() ? power * 1.15 : power;
                    if (!hurt(current, enemy, "scorchingsands", dealt,
                        { damage: damageSpec("scorchingsands", "grit"), status: "burn", chance: chance })) return;
                    total++;
                    WorldFeedback.emit(scope, scorchingScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.round(6 + power * 0.2), scale: scale, intensity: intensity }, 22);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), scorchingBurnText, [], 26);
                });
                if (hearth) {
                    WorldEffects.field(scope, scorchingField, WorldCombat.point(at.x(), Math.floor(at.y()) + 0.05, at.z()), radius,
                        { power: hPower, interval: hInterval, chance: hChance, next: {} }, coat);
                    WorldFeedback.emit(scope, scorchingScene, 1, at,
                        { moment: "smolder", radius: radius, scale: scale, embers: embers, seethe: Math.round(hPower) }, coat);
                }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), scorchingHitText, [total], 26);
                finish(current);
            }

            sound(action, "cobblemon:move.sandattack.actor");
            const direction = LivingActions.ballistic(origin, point, speed, 0.05) || aim(action);
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/earth", glow: false, scale: Math.max(0.6, Math.min(1.3, 0.7 + scale * 0.2))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, direction: direction, range: distance + 4, radius: 0.4, gravity: 0.05, lifetime: 180,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) { land(current, hit.position()); }
            }, function (current: CombatAction) { if (!landed) land(current, point); else finish(current); });
            WorldFeedback.emit(world, scorchingScene, 1, origin,
                { moment: "fling", projectile: flight, direction: [direction.x(), direction.y(), direction.z()], scale: scale, embers: embers }, 90);
        }
    });
}
