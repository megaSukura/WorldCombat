/**
 * 劈瓦 / brickbreak 的出手方式。
 *
 * 核心念头：一步踏进，一记手刀自上而下劈落；刀锋落在哪，那一片真实可达的屏障就被震碎。
 * 三幕：
 *   起（windup，提交前）：抬臂蓄势，刀锋聚起暖光。
 *   劈（execute → sweep/chop）：提交后沿瞄准方向踏进一小步，从**前踏后的实际身体**构建走廊；
 *       走廊内、且从身体到它有真实通视的敌人各挨一记接触斩击；命中处与落刀点爆出刀锋火花。
 *   碎（break）：落刀点半径内、从落刀点视线可达的反射壁、光墙、极光幕（含场地与身上的层）一起震碎；
 *       不要求先打中身体，走廊里没人时同样在刀锋落点震碎。
 *
 * 瞄准：`kind: "aim"` 接受任意阵营实体或世界点，可以空点拆防护区；普通方块不破坏。
 * 与同族分开：精神之牙只在第一处身体或屏障上闭合一次；怒牛是整段位移的冲撞；上菜是带增益的抛投。
 */
namespace PokemonSkills {
    const brickbreakScene = "world_combat:move_brickbreak";
    const brickbreakCrackText = "world_combat.move.brickbreak.text.crack";
    const brickbreakMissText = "world_combat.move.brickbreak.text.miss";

    /** road 四个角：判定与 sweep 表现共用同一组顶点。 */
    function brickbreakLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const heading = WorldGeometry.flatUnit(direction);
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function brickbreakPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }
    /** 落刀平面上的竖直短刀痕，自上而下、朝瞄准方向前倾，与真实劈面一致。 */
    function brickbreakCut(strike: CombatPoint, direction: CombatPoint, half: number): number[][] {
        const heading = WorldGeometry.flatUnit(direction);
        const lean = Math.max(0.12, Math.min(0.5, half * 0.5));
        const top = strike.plus(WorldCombat.point(0, 1.15, 0)).minus(heading.scale(lean));
        const middle = strike.plus(WorldCombat.point(0, 0.5, 0));
        const bottom = strike.plus(WorldCombat.point(0, -0.15, 0)).plus(heading.scale(lean));
        return [[top.x(), top.y(), top.z()], [middle.x(), middle.y(), middle.z()], [bottom.x(), bottom.y(), bottom.z()]];
    }
    /**
     * 震碎 from 周围 radius 内、且从 from 视线真实可达的屏障：反射壁、光墙、极光幕是共享身份，
     * 场地层用 categories.screen 场地，身上层用同一 tag 的效果。返回实际清除的层数与各自位置，
     * 表现只在这些位置上生成碎片。极光场地被掀掉后不会被重新罩回来。
     */
    function brickbreakShatter(world: CombatWorld, from: CombatPoint, radius: number): { count: number; points: CombatPoint[] } {
        let count = 0;
        const points: CombatPoint[] = [];
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let z = 0; z < zones.length; z++) {
            const area = zones[z];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (at.minus(from).length() > radius + area.radius) continue;
            if (!world.clear(from, at)) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) { count++; points.push(at); }
        }
        const actors: CombatActor[] = world.query(from, radius, false).slice();
        actors.push(world.source());
        const seen: { [ref: string]: boolean } = {};
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor)) continue;
            const ref = String(actor.ref());
            if (seen[ref]) continue;
            seen[ref] = true;
            const body = world.observe(actor);
            if (body === null || !world.clear(from, body.position())) continue;
            const removed = CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
            if (removed > 0) { count += removed; points.push(body.position()); }
        }
        return { count: count, points: points };
    }

    define({
        freeMovement: true,
        id: "brickbreak",
        cooldownParameter: "recharge",
        name: "劈瓦",
        description: "一步踏进，一记手刀自上而下劈落：劈伤走廊里通视的敌人，并震碎刀锋落点视线可达的反射壁、光墙与极光幕。空点也能拆掉防护区，普通方块不受影响。",
        uses: ["贴身一记快劈", "在屏障张开的一瞬间把它整片震碎", "看准屏障落点先手破壁"],
        kind: "aim",
        range: 3.0,
        maxRange: 4.6,
        prepare: 7,
        active: 18,
        recover: 6,
        cooldown: 26,
        style: "chop",
        defaults: { wide: false, ai: { maxChase: 8, break: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("brickbreak", "reach", pokemon) : 3, geometry: "line", style: "chop",
                color: 0xD98B4A, label: config && config.wide ? "裂瓦式" : "寸劲式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["brickbreak"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("brickbreak", "tempo", context))),
                recover: Math.max(2, Math.round(p("brickbreak", "aftercast", context))),
                cooldown: Math.max(10, Math.round(p("brickbreak", "recharge", context))),
                range: p("brickbreak", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_brickbreak:windup", brickbreakScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const reach = p("brickbreak", "reach", action);
            const half = p("brickbreak", "chopWidth", action);
            const power = p("brickbreak", "chop", action);
            const wardBreak = p("brickbreak", "wardBreak", action);
            const notes = Math.max(12, Math.round(power * 0.9));

            // 踏进一小步，最多停在落面边缘；走廊随后由真实前踏后的身体构建。
            const self = world.observe(actor);
            if (self !== null && reach > 0.1) {
                const delta = action.targetPosition().minus(self.position());
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const step = Math.min(0.6, Math.max(0, flat - half - 0.35));
                if (step > 0.05) world.displace(actor, direction.scale(step));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            const vertices = brickbreakLane(origin, direction, reach, half);
            const lane = WorldGeometry.lane(origin, direction, reach, half, { below: 1.4, above: 2.4 });
            let strike = origin.plus(direction.scale(reach)), hits = 0;
            WorldGeometry.selectEnemies(world, lane, function (victim, facts) {
                // 墙后的目标这一刀扫不到：只有从身体到它真实通视才会被劈中。
                if (!world.clear(origin, facts.position())) return;
                if (hits === 0) strike = facts.position();
                hits++;
                hurt(action, victim, "brickbreak", power, { damage: damageSpec("brickbreak", "chop"), contact: true });
            });
            // 落到刀锋落点才碎壁：空劈时落点就是走廊尽头，普通方块保持原样。
            const shatter = brickbreakShatter(world, strike, wardBreak);
            const wards = shatter.count;

            WorldFeedback.emit(world, brickbreakScene, 1, origin,
                { moment: "sweep", path: brickbreakPath(vertices), notes: notes, hits: hits, scale: half / 0.55,
                    direction: [direction.x(), direction.y(), direction.z()] }, 20);
            WorldFeedback.emit(world, brickbreakScene, 1, strike,
                { moment: "chop", path: brickbreakCut(strike, direction, half), notes: notes, hits: hits,
                    scale: half / 0.55, direction: [direction.x(), direction.y(), direction.z()] }, 22);
            for (let i = 0; i < shatter.points.length && i < 8; i++)
                WorldFeedback.emit(world, brickbreakScene, 1, shatter.points[i],
                    { moment: "break", wards: wards, shards: 10 + wards * 3, scale: wardBreak / 8 }, 24);
            sound(action, "minecraft:entity.player.attack.strong");
            if (wards > 0) {
                sound(action, "minecraft:block.glass.break");
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.2, 0)), brickbreakCrackText, [wards], 30);
            }
            if (hits === 0) {
                WorldFeedback.emit(world, brickbreakScene, 1, strike, { moment: "miss", scale: half / 0.55 }, 20);
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.0, 0)), brickbreakMissText, [], 24);
            }
            done(action);
        }
    });
}
