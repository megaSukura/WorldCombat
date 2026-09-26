/**
 * 大爆炸 / explosion 的出手方式。
 *
 * 核心念头：带着一根看得见的引信把自己压进选定的近地点，引信烧完才炸。它和自爆是同一件事的两个量级：
 *   更大、更慢、掀得更远、还留坑；区别在送达——大爆炸要先在引信下短步压进爆点，自爆则原地瞬间引爆。
 *
 * 与同族分开：自爆更小更快、原地一颗紧凑火球；大爆炸的引信长到对手有机会看着引信环熄灭、绕开爆点，
 *   换来最重的一击与最远的掀飞，以及一个会留一会儿的弹坑。
 *
 * 三幕：
 *   起（windup，提交前）：地面从脚下裂开、光从缝里漏出、尘絮向内收——只播预告，可被打断。
 *   引（fuse，提交后）：锁定玩家所选近地点（推进距离内、压到近地），三道引信环按剩余时间逐一熄灭、
 *       爆圈贴着真实半径跟随身体；身体受碰撞短步前进，抵达或撞墙就停住，仍等引信烧完。撞墙不提前爆、不补爆。
 *   爆（detonate → shock → hit → crater / miss）：引信归零时在实际停止点一次结清——圈内每个非友方各挨一次
 *       `blast`、被向外掀飞 `knock`、向上抛起 `lift`，地面按 `craterCells` 留下焦黑弹坑（租借，到期原方块回来）；
 *       一个人都没炸到也照样倒下——原生 `selfdestruct: "always"`。
 *
 * 反制：引信期间引信环可读，能绕开爆点；墙体挡住推进，爆心停在墙的这一侧；引信中被击倒则这一记作废、不会补爆。
 * 提交即结清 PP 与冷却；收招为 0，倒下即动作结束。
 */
namespace PokemonSkills {
    const explosionScene = "world_combat:move_explosion";
    const explosionHitText = "world_combat.move.explosion.text.hit";
    const explosionMissText = "world_combat.move.explosion.text.miss";
    const explosionFuseText = "world_combat.move.explosion.text.fuse";
    /** 引信环的发射率（熄灭时发 0）。三道环由外向内先后熄灭。 */
    const explosionFuseRate = 10;

    /** 弹坑形态：可炸的表层一律烧成黑石，水／岩浆／基岩不动。 */
    function explosionCharred(id: string): string {
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return "";
        if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") return "";
        return "minecraft:blackstone";
    }

    /** 从爆点向外把地表烧成一个弹坑；只动表层可换方块，租借 `linger`，到期原方块回来。 */
    function explosionCrater(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(6, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                const key = x + "," + y + "," + z;
                const charred = explosionCharred(id);
                if (charred !== "" && charred !== id && !seen[key]) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: charred }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { return JSON.parse(world.terrainResult(JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), ticks)).placed.length; }
        catch (error) { return 0; }
    }

    define({
        freeMovement: true,
        id: "explosion",
        cooldownParameter: "recharge",
        name: "Explosion",
        description: "点燃一根可见引信，朝所选近地点短步压进：引信烧完时在身体真实所在处炸开，圈内每个敌人各挨一次重击、被狠狠掀飞抛起，地面留下焦黑弹坑。撞墙就停在墙前、引信照烧；引信中被击倒则这一记作废，不补第二爆。即使一个人都没炸到，使用者也会倒下。蓄爆式更大更久、坑更久，瞬爆式更快。",
        uses: ["带着引信压进人堆，把一圈人炸成重伤", "把贴身的整圈对手远远掀飞", "用可读的引信逼对手离开落点", "在倒下前留下一个会留一会儿的弹坑"],
        kind: "aim",
        range: 4,
        maxRange: 6,
        prepare: 16,
        active: 0,
        recover: 0,
        cooldown: 90,
        style: "detonation",
        maximumTicks: 420,
        defaults: { charged: false, ai: { sacrifice: false, maxChase: 7, minFoes: 2, cornered: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("explosion", "blastRadius", pokemon), geometry: "area", style: "detonation",
                color: 0xF0A94E, label: config && config.charged === true ? "蓄爆式" : "瞬爆式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["explosion"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p("explosion", "tempo", context))),
                recover: 0,
                cooldown: Math.max(40, Math.round(p("explosion", "recharge", context))),
                active: skills["explosion"].active,
                range: p("explosion", "deliverRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("explosion:charge", explosionScene, 1, action.origin(), JSON.stringify({
                moment: "charge", charged: config && config.charged === true,
                radius: p("explosion", "blastRadius", action),
                full: body === null || body.maxHealth() <= 0 ? 1 : body.health() / body.maxHealth()
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(explosionScene);
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { movementScenes.finish(action, done); return; }

            const radius = Math.max(3.4, p("explosion", "blastRadius", action));
            const power = p("explosion", "blast", action);
            const knock = p("explosion", "knock", action);
            const lift = p("explosion", "lift", action);
            const debris = Math.max(16, Math.round(p("explosion", "debris", action)));
            const craterTicks = Math.max(40, Math.round(p("explosion", "craterTicks", action)));
            const craterCells = Math.max(10, Math.round(p("explosion", "craterCells", action)));
            const cap = Math.max(1, Math.round(p("explosion", "maxTargets", action)));
            const fuse = Math.max(8, Math.round(p("explosion", "fuse", action)));
            const pace = Math.max(0.12, p("explosion", "deliverSpeed", action));
            const reach = Math.max(2.5, p("explosion", "deliverRange", action));
            const scale = radius / 5.6;

            // 锁定所选近地点：目标实体取其脚下地面，方向点直接用；水平压到推进距离内，再落到近地。
            const raw = action.targetPosition(), target = action.target();
            let rawFoot = raw;
            if (target !== null) {
                const targetBody = world.observe(target);
                if (targetBody !== null) rawFoot = WorldCombat.point(raw.x(), targetBody.position().y() - targetBody.height() * 0.5, raw.z());
            }
            const startFeet = body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0));
            let flat = WorldCombat.point(rawFoot.x() - startFeet.x(), 0, rawFoot.z() - startFeet.z());
            if (flat.length() > reach) flat = flat.unit().scale(reach);
            const destination = WorldGeometry.ground(world, startFeet.plus(flat), 4);

            let elapsed = 0, settled = false, held = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            /** 引信归零：在身体真实所在处一次结清爆炸与必倒代价；只会发生一次。 */
            function detonate(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const live = scope.observe(self);
                if (live === null || live.health() <= 0) { finish(current); return; }
                movementScenes.stop(current, "fuse");
                const centre = live.position();
                let hits = 0;

                sound(current, "minecraft:entity.generic.explode");
                WorldFeedback.emit(scope, explosionScene, 1, centre,
                    { moment: "detonate", radius: radius, debris: debris, scale: scale,
                        intensity: Math.max(0.7, Math.min(2.8, power / 250)) }, 36);

                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: radius * 0.85, above: radius * 0.85 }),
                    function (enemy, facts) {
                        if (hits >= cap) return;
                        if (!hurt(current, enemy, "explosion", power, { damage: damageSpec("explosion", "blast"), area: true })) return;
                        hits++;
                        const away = facts.position().minus(centre);
                        if (scope.valid(enemy)) {
                            if (away.length() > 0.2) scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(knock));
                            if (lift > 0) scope.hitImpulse(enemy, WorldCombat.point(0, lift, 0));
                        }
                        WorldFeedback.emit(scope, explosionScene, 1, facts.position(),
                            { moment: "hit", target: String(enemy.ref()), scale: scale, debris: debris }, 26);
                    });

                WorldFeedback.emit(scope, explosionScene, 1, centre,
                    { moment: "shock", radius: radius, scale: scale, debris: debris }, 24);
                const placed = explosionCrater(scope, centre, radius, craterTicks, craterCells);
                WorldFeedback.emit(scope, explosionScene, 1, centre,
                    { moment: hits > 0 ? "crater" : "miss", radius: radius, cells: placed, debris: debris, scale: scale, hits: hits }, 34);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.3, 0)),
                    hits > 0 ? explosionHitText : explosionMissText, hits > 0 ? [hits] : [], 30);

                // 原生 selfdestruct: "always"——有没有炸到，使用者都用完即陷入濒死。放在最后，倒下即结束。
                const last = scope.observe(self);
                if (last !== null && last.health() > 0) scope.health(self, -last.health(), "world_combat:explosion_cost");
                finish(current);
            }

            function tick(current: CombatAction): void {
                const scope = current.world();
                const live = scope.observe(self);
                // 引信中被击倒：这一记作废，不移动、不引爆、不补第二爆。
                if (live === null || live.health() <= 0) { finish(current); return; }
                const remaining = fuse - elapsed;
                if (remaining <= 0) { detonate(current); return; }
                const liveFeet = live.position().minus(WorldCombat.point(0, live.height() * 0.5, 0));

                // 三道引信环由外向内熄灭；爆圈（半径=真实爆心）整段跟随身体，归零时才在 detonate 里锁死。
                const outer = remaining > fuse * 2 / 3 ? explosionFuseRate : 0;
                const middle = remaining > fuse / 3 ? explosionFuseRate : 0;
                const pulse = explosionFuseRate + Math.round((1 - remaining / fuse) * explosionFuseRate);
                movementScenes.show(current, "fuse", liveFeet, {
                    moment: "fuse", radius: radius, scale: scale, pulse: pulse,
                    fuse3Radius: radius * 0.72, fuse3: outer,
                    fuse2Radius: radius * 0.48, fuse2: middle,
                    fuse1Radius: radius * 0.24, fuse1: explosionFuseRate
                });

                // 短步压向爆点：抵达或被挡住就停住，引信照烧，爆心停在真实位置。
                if (!held) {
                    const toward = WorldCombat.point(destination.x() - liveFeet.x(), 0, destination.z() - liveFeet.z());
                    if (toward.length() > 0.15) {
                        const step = Math.min(pace, toward.length());
                        const moved = scope.displace(self, toward.unit().scale(step));
                        if (!(moved > step * 0.35)) held = true;
                    }
                }
                elapsed++;
                current.after(1, tick);
            }

            sound(action, "minecraft:entity.tnt.primed");
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), explosionFuseText, [], 24);
            tick(action);
        }
    });
}
