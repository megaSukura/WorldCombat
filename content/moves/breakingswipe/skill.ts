/**
 * 广域破坏 / breakingswipe 的出手方式。
 *
 * 核心念头：身子不动，甩起坚韧的尾巴沿地面扫过一道宽扇。扇里所有敌人一起被掀开、各降一级攻击，
 *   扫过的地方在地面留下一道浅浅的犁痕。它是本组唯一一次能同时压低多人的一记，单体最轻。
 *
 * 两幕（提交前只播预告）：
 *   起（coil，提交前）：重心压低、尾巴在身后摆开，只播一记预告。
 *   扫（sweep → hit，提交后）：以自身为心、朝目标方向撑起张角 `arc`、半径 `radius` 的扇形，扫过地面
 *       （表现用同一组顶点画出扇面）；扇里每个敌人各挨一记 `sweep` 接触伤害，沿离心方向被掀开 `push` 格，
 *       攻击下降 `stages` 级；同时在外缘犁出短时沟痕（租借地表，到期原方块回来）。
 *
 * 与同族分开：猛扑是向前把自己送出去重撞一个，热带踢是带火的挑踢，bittermalice 隔空放怨念；广域破坏是
 *   **原地扫一片**。降攻对所有战斗者同一条路（NativeEffects.boost）。
 *
 * 配置 `wide` 由公式改张角／半径／威力与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const breakingswipeScene = "world_combat:move_breakingswipe";
    const breakingswipeDropText = "world_combat.move.breakingswipe.text.drop";
    const breakingswipeMissText = "world_combat.move.breakingswipe.text.miss";

    function breakingswipeHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 0.01 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 扇面的一组世界顶点：心点 + 外弧采样，表现与判定读同一组点。 */
    function breakingswipeOutline(centre: CombatPoint, heading: CombatPoint, radius: number, arcDegrees: number, feetY: number): number[][] {
        const theta = Math.atan2(heading.z(), heading.x()), half = arcDegrees * Math.PI / 360, samples = 14;
        const path: number[][] = [[centre.x(), feetY, centre.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = theta - half + (i / samples) * 2 * half;
            path.push([centre.x() + Math.cos(angle) * radius, feetY, centre.z() + Math.sin(angle) * radius]);
        }
        return path;
    }

    /** 沿扇缘取样，把地表一层换成粗土犁痕（租借，到期原方块回来）。 */
    function breakingswipeFurrow(world: CombatWorld, centre: CombatPoint, heading: CombatPoint, radius: number, arcDegrees: number, ticks: number): number {
        const cells: any[] = [], theta = Math.atan2(heading.z(), heading.x()), half = arcDegrees * Math.PI / 360;
        const baseY = Math.floor(centre.y()) - 1, rings = [0.62, 1.0], samples = 9;
        for (let i = 0; i < samples; i++) {
            const angle = theta - half + (i / (samples - 1)) * 2 * half;
            const dx = Math.cos(angle), dz = Math.sin(angle);
            for (let r = 0; r < rings.length; r++) {
                const dist = radius * rings[r];
                const x = Math.floor(centre.x() + dx * dist), z = Math.floor(centre.z() + dz * dist);
                for (let dy = 2; dy >= -3; dy--) {
                    const ground = world.block(WorldCombat.point(x, baseY + dy, z));
                    if (ground === null) break;
                    const id = String(ground.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    if (id !== "minecraft:coarse_dirt") cells.push({ x: x, y: baseY + dy, z: z, block: "minecraft:coarse_dirt" });
                    break;
                }
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(60, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "breakingswipe",
        name: "Breaking Swipe",
        description: "身子不动，甩起坚韧的尾巴沿地面扫过一道宽扇：扇里每个敌人都各挨一记接触伤害、被掀开，并让它们的攻击下降 1 级；扫过的地面留下一道短时犁痕。广域式罩得更宽，聚扫式打得更重。",
        uses: ["一次压低围在身边的一群敌人", "把贴身的敌人一起掀开、拉开距离", "在窄地上用犁痕和掀开逼对手走位"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.8,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sweep",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 8, cluster: true } },
        fields: [flag("wide", "广域式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("breakingswipe", "radius", pokemon) : 3.0, geometry: "cone", style: "sweep", color: 0x8A6CFF,
                label: config && config.wide === true ? "广域破坏·广域式" : "广域破坏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["breakingswipe"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("breakingswipe", "tempo", context)),
                recover: Math.round(p("breakingswipe", "recover", context)),
                cooldown: Math.round(p("breakingswipe", "recharge", context)),
                active: 0,
                range: p("breakingswipe", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_breakingswipe:coil", breakingswipeScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const heading = breakingswipeHeading(aim(action));
            const radius = Math.max(2.0, p("breakingswipe", "radius", action));
            const arc = Math.max(80, p("breakingswipe", "arc", action));
            const power = p("breakingswipe", "sweep", action);
            const push = Math.max(0.1, p("breakingswipe", "push", action));
            const stages = Math.max(1, Math.round(p("breakingswipe", "stages", action)));
            const scales = Math.max(10, Math.round(p("breakingswipe", "scales", action)));
            const furrowTicks = Math.max(60, Math.round(p("breakingswipe", "furrow", action)));
            const cap = Math.max(1, Math.round(p("breakingswipe", "maxTargets", action)));
            const wide = !!(config && config.wide === true);
            const scale = Math.max(0.6, Math.min(2.2, radius / 3.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 58));
            const feetY = centre.y() - body.height() / 2;
            const path = breakingswipeOutline(centre, heading, radius, arc, feetY);
            const region = WorldGeometry.sector(centre, heading, radius, arc, { below: 2, above: 2.5 });
            let hits = 0;

            sound(action, "cobblemon:move.dragonclaw.actor");
            const cells = breakingswipeFurrow(world, centre, heading, radius, arc, furrowTicks);
            WorldFeedback.emit(world, breakingswipeScene, 1, centre,
                { moment: "sweep", direction: [heading.x(), heading.y(), heading.z()], radius: radius, arc: arc, scale: scale,
                    scales: scales, path: path, cells: cells, wide: wide ? 1 : 0, intensity: intensity }, 40);
            world.sound("minecraft:entity.player.attack.sweep", centre, 18, "{}");
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (hits >= cap || String(enemy.ref()) === String(actor.ref())) return;
                if (!hurt(action, enemy, "breakingswipe", power, { damage: damageSpec("breakingswipe", "sweep"), contact: true })) return;
                hits++;
                const away = facts.position().minus(centre);
                if (world.valid(enemy) && Math.abs(away.x()) + Math.abs(away.z()) > 0.2)
                    world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push));
                if (world.valid(enemy)) NativeEffects.boost(world, enemy, "atk", -stages);
                if (world.valid(enemy))
                    WorldFeedback.emit(world, breakingswipeScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), scales: scales, stages: stages, scale: scale, intensity: intensity }, 30);
            });
            if (hits === 0)
                WorldFeedback.emit(world, breakingswipeScene, 1, centre.plus(WorldCombat.point(0, 0.9, 0)),
                    { moment: "miss", scales: scales, scale: scale, intensity: intensity }, 24);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)),
                hits > 0 ? breakingswipeDropText : breakingswipeMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
