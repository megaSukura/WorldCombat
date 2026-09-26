/**
 * 热沙大地 / scorchingsands 的出手方式。
 *
 * 核心念头：弯腰铲起一把被地热烤烫的沙，朝一点扬出去——沙幕沿真实抛物线撒向落点，落地时整片炸开，
 *   把圈里的人一起烫伤、可能点着；闷烧式下，落点附近的**天然沙面**被烤热，留下一片连着格的热沙。
 *
 * 自由瞄准（kind: "aim"）：可点任意世界点或实体，墙挡扬沙；弹体只在真实碰点处理，到期不在原地补炸。
 *   闷烧不再把任意方块替成砂岩：只从真实落点附近的天然沙（sand／red_sand／`c:sand`）起步，沿同高差可达的
 *   暴露沙面有限扩散到 sandCells 与 spread 范围；石头孤岛、离地或水面覆盖的格不烫，非沙地只有初击。
 *
 * 三幕：
 *   起（gather，提交前）：脚边沙粒被热力吸起、地表微微发烫的预告，只播画面。
 *   扬（fling，提交后）：沙幕按真实抛物线撒向落点；站在沙地上的施法者能铲到更多沙。
 *   埋（burst → hit / smolder）：落点整片炸开——圈内每个敌人各结算一次 grit 伤害（湿身 ×1.15）并按概率灼伤；
 *       闷烧式再沿天然沙面留一片**逐格热沙**（`WorldEffects.field`，脚接触这些实际热格才烫），到 coatTicks 收完。
 *
 * 与同族分开：热水是水洼、热风是一片推人的扇面、炼狱是一根必灼的火柱；只有热沙大地会沿天然沙面留下热区。
 * 配置 hearth 由 resolve 改时序、由公式改威力与留存，提交后才触碰世界。
 */
namespace PokemonSkills {
    const scorchingScene = "world_combat:move_scorchingsands";
    const scorchingField = "world_combat:field/scorchingsands";
    const scorchingBurnText = "world_combat.move.scorchingsands.text.burn";
    const scorchingHitText = "world_combat.move.scorchingsands.text.hit";

    /** 天然沙：普通沙、赤沙或通用 `c:sand` 标签。 */
    function scorchingSand(block: CombatBlock | null): boolean {
        if (block === null) return false;
        const id = String(block.id());
        return id === "minecraft:sand" || id === "minecraft:red_sand" || block.tagged("c:sand");
    }

    /** 脚下有沙或砂岩时铲得到更多沙：沙量、画面与扬尘都更足。 */
    function scorchingGround(world: CombatWorld, point: CombatPoint): boolean {
        const base = WorldCombat.point(point.x(), Math.floor(point.y()), point.z());
        for (let dy = 0; dy >= -2; dy--) {
            const block = world.block(base.plus(WorldCombat.point(0, dy, 0)));
            if (block === null) return false;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return scorchingSand(block) || id === "minecraft:sandstone" || id === "minecraft:red_sandstone" || block.tagged("c:sandstone");
        }
        return false;
    }

    /** 该列最上面一块实心方块；水面／岩浆／基岩不算地面。返回其高度与是否天然沙。 */
    function scorchingSurface(world: CombatWorld, x: number, z: number, centerY: number, drop: number): { y: number; sand: boolean } | null {
        const top = Math.floor(centerY) + 2;
        for (let y = top; y >= top - Math.max(1, Math.floor(drop)); y--) {
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return { y: y, sand: scorchingSand(block) };
        }
        return null;
    }

    /** 从真实落点附近的天然沙起步，沿同高差可达的暴露沙面有限扩散；返回热格 [x,y,z]（y 是沙块本身）。 */
    function scorchingCells(world: CombatWorld, landing: CombatPoint, radius: number, cap: number): number[][] {
        const baseX = Math.floor(landing.x()), baseZ = Math.floor(landing.z()), baseY = Math.floor(landing.y());
        let startX = 0, startZ = 0, startY = 0, found = false, best = 1e9;
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
            const surface = scorchingSurface(world, baseX + dx, baseZ + dz, baseY, 4);
            if (surface === null || !surface.sand) continue;
            const d = dx * dx + dz * dz;
            if (d < best) { best = d; startX = baseX + dx; startZ = baseZ + dz; startY = surface.y; found = true; }
        }
        if (!found) return [];
        const cells: number[][] = [], seen: { [key: string]: boolean } = {};
        function visit(x: number, z: number, fromY: number): void {
            if (cells.length >= cap) return;
            const key = x + "," + z;
            if (seen[key]) return;
            seen[key] = true;
            const surface = scorchingSurface(world, x, z, fromY, 4);
            if (surface === null || !surface.sand) return;
            if (Math.abs(surface.y - fromY) > 1 || Math.abs(surface.y - startY) > 1) return;
            const hx = x + 0.5 - landing.x(), hz = z + 0.5 - landing.z();
            const reach = radius + 0.75;
            if (hx * hx + hz * hz > reach * reach) return;
            cells.push([x, surface.y, z]);
            visit(x + 1, z, surface.y);
            visit(x - 1, z, surface.y);
            visit(x, z + 1, surface.y);
            visit(x, z - 1, surface.y);
        }
        visit(startX, startZ, startY);
        return cells;
    }

    /** 该热格此刻仍然有效：还是天然沙，且没有被真实水盖住。 */
    function scorchingHot(world: CombatWorld, cell: number[]): boolean {
        if (!scorchingSand(world.block(WorldCombat.point(cell[0], cell[1], cell[2])))) return false;
        const above = world.block(WorldCombat.point(cell[0], cell[1] + 1, cell[2]));
        return above === null || String(above.id()) !== "minecraft:water";
    }

    /** 只有脚真正踩在这些热沙格上才被烫：跳过、站在石头孤岛或离地都躲得开。 */
    function scorchingContact(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const cells = field.data.cells || [];
        const at = body.position(), feet = at.y() - body.height() / 2;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (Math.abs(at.x() - (cell[0] + 0.5)) > 0.7) continue;
            if (Math.abs(at.z() - (cell[2] + 0.5)) > 0.7) continue;
            if (Math.abs(feet - (cell[1] + 1)) > 0.6) continue;
            if (scorchingHot(world, cell)) return true;
        }
        return false;
    }

    /** 闷烧式留下的逐格热沙：踏上一次判一次灼伤，站着不走按间隔反复挨烫。 */
    WorldEffects.fieldRule(scorchingField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            if (!scorchingContact(world, actor, field)) return;
            const body = world.observe(actor);
            if (body === null) return;
            const ref = String(actor.ref());
            WorldFeedback.emit(world, scorchingScene, 1, body.position(),
                { moment: "smolder", target: ref, scale: 1 }, 20);
            const burned = field.data.burned || (field.data.burned = {});
            if (burned[ref]) return;
            burned[ref] = true;
            if (world.random() < (Number(field.data.chance) || 0) && CombatStatus.inflict(world, actor, "burn"))
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), scorchingBurnText, [], 24);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            if (!scorchingContact(world, actor, field)) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + (Number(field.data.interval) || 12);
            const body = world.observe(actor);
            if (body === null) return;
            if (!hurt(world, actor, "scorchingsands", Number(field.data.power) || 1, { damage: damageSpec("scorchingsands", "hearth") })) return;
            WorldFeedback.emit(world, scorchingScene, 1, body.position(),
                { moment: "smolder", target: ref, seethe: Math.round(Number(field.data.power) || 0), scale: 1 }, 18);
        }
    });

    /** 合并两组热格，去掉重复。 */
    function scorchingMerge(first: number[][], second: number[][]): number[][] {
        const result: number[][] = [], seen: { [key: string]: boolean } = {};
        const all = first.concat(second);
        for (let i = 0; i < all.length; i++) {
            const key = all[i][0] + "," + all[i][1] + "," + all[i][2];
            if (seen[key]) continue;
            seen[key] = true;
            result.push(all[i]);
        }
        return result;
    }

    /** 只在真实落点炸开；沙幕到程没有接触就不再补炸。 */
    define({
        id: "scorchingsands",
        cooldownParameter: "recharge",
        name: "Scorching Sands",
        description: "弯腰铲起一把被地热烤烫的沙、朝一点自由扬出去：沙幕沿真实抛物线撒向落点，落地整片炸开，圈里的人一起挨烫、可能被点着；闷烧式下，落点附近的天然沙面被逐格烤热，只有脚踩上那些热沙格的人才会被烫。站在沙地上能铲到更多沙，热沙粘在湿身目标身上更狠；非沙地只有初击、不留热区。",
        uses: ["朝一点扬一把热沙一次烫到一圈人", "沿着天然沙面预烤一片连通热区", "在沙地上铲更多沙、铺得更广", "对湿身的目标多算一份伤害"],
        kind: "aim",
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

            function land(current: CombatAction, contact: CombatPoint): void {
                if (landed) return;
                landed = true;
                const scope = current.world();
                const surface = scorchingSurface(scope, Math.floor(contact.x()), Math.floor(contact.z()), Math.floor(contact.y()), 4);
                const centre = surface !== null
                    ? WorldCombat.point(Math.floor(contact.x()) + 0.5, surface.y + 1, Math.floor(contact.z()) + 0.5)
                    : contact;
                sound(current, "minecraft:block.sand.break");
                WorldFeedback.emit(scope, scorchingScene, 1, centre,
                    { moment: "burst", radius: radius, scale: scale, embers: embers, intensity: intensity }, 30);
                const hitRefs: { [ref: string]: boolean } = {};
                let total = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 3 }), function (enemy, facts) {
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
                    const hot = scorchingCells(scope, centre, radius, cells);
                    if (hot.length > 0) {
                        const owner = String(scope.source().ref());
                        const mine = WorldEffects.areas(scope, scorchingField, centre, radius + 1);
                        let fieldId = 0, merged = hot, existingRadius = radius + 1;
                        for (let i = 0; i < mine.length; i++) {
                            if (mine[i].source !== owner) continue;
                            fieldId = mine[i].id;
                            existingRadius = Math.max(existingRadius, mine[i].radius);
                            const previous = mine[i].data && mine[i].data.cells;
                            if (previous) merged = scorchingMerge(previous, hot);
                            break;
                        }
                        if (merged.length > cells) merged = merged.slice(0, cells);
                        if (fieldId > 0) WorldEffects.update(scope, fieldId, { radius: existingRadius, ticks: coat,
                            data: { power: hPower, interval: hInterval, chance: hChance, cells: merged } });
                        else fieldId = WorldEffects.field(scope, scorchingField, centre, existingRadius,
                            { power: hPower, interval: hInterval, chance: hChance, cells: merged, next: {}, burned: {} }, coat);
                        for (let i = 0; i < merged.length; i++) {
                            const cell = merged[i], at = WorldCombat.point(cell[0] + 0.5, cell[1] + 1, cell[2] + 0.5);
                            WorldFeedback.onEffect(scope, fieldId, "scorch:" + cell[0] + "," + cell[1] + "," + cell[2],
                                scorchingScene, 1, at, { moment: "smolder", heat: Math.round(hPower), scale: 1 });
                        }
                    }
                }
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.0, 0)), scorchingHitText, [total], 26);
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
            }, function (current: CombatAction) {
                // 到程没有真实接触：不跳回准点补炸、不留热区，只结束。
                finish(current);
            });
            WorldFeedback.emit(world, scorchingScene, 1, origin,
                { moment: "fling", projectile: flight, direction: [direction.x(), direction.y(), direction.z()], scale: scale, embers: embers }, 90);
        }
    });
}
