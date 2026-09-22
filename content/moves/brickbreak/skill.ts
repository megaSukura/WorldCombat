/**
 * 劈瓦 / brickbreak 的出手方式。
 *
 * 核心念头：一步踏进，一记手刀自上而下劈落；刀锋落在哪，那一片的屏障就被震碎。
 * 三幕：
 *   起（windup，提交前）：抬臂蓄势，刀锋聚起暖光。
 *   劈（execute → chop）：提交后沿瞄准方向踏进一小步，在身前一条走廊里劈下；走廊内敌人各挨一记接触斩击，
 *       命中处爆出刀锋火花。
 *   碎（break）：刀锋落点半径内的反射壁、光墙与极光幕一起震碎——不要求先打中身体，走廊里没人时同样震碎。
 *
 * 与同族分开：精神之牙是更远、更慢、会把碎壁当饭吃的咬击；怒牛是整段位移的冲撞；上菜是带增益的优雅一击。
 * 劈瓦是全族最快、最便宜、最先碎壁的一记。
 */
namespace PokemonSkills {
    const brickbreakScene = "world_combat:move_brickbreak";
    const brickbreakCrackText = "world_combat.move.brickbreak.text.crack";
    const brickbreakMissText = "world_combat.move.brickbreak.text.miss";

    /**
     * 震碎 centre 周围 radius 内的屏障：反射壁、光墙、极光幕是三种共享身份，一并移除；
     * 极光幕还挂在一片场地上，把邻近的极光场地也掀掉，否则 5 刻后又会把人罩回来。
     * 屏障以施法者为锚补给一圈队友，施法者一定在被护者的屏障半径内，因此这一圈查询能连锚一起掀。
     */
    function brickbreakShatter(world: CombatWorld, centre: CombatPoint, radius: number): number {
        let broken = 0;
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let z = 0; z < zones.length; z++) {
            const area = zones[z];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (at.minus(centre).length() > radius + area.radius) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) broken++;
        }
        const actors: CombatActor[] = world.query(centre, radius, false).slice();
        actors.push(world.source());
        const seen: { [ref: string]: boolean } = {};
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor)) continue;
            const ref = String(actor.ref());
            if (seen[ref]) continue;
            seen[ref] = true;
            broken += CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
        }
        return broken;
    }
    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的走廊四个角；判定与表现共用。 */
    function brickbreakLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function brickbreakPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "brickbreak",
        name: "劈瓦",
        description: "一步踏进，一记手刀自上而下劈落：劈伤目标，并震碎刀锋落点周围一整片的反射壁、光墙与极光幕。是全族最快、最便宜的一记。",
        uses: ["贴身一记快劈", "在屏障张开的一瞬间把它整片震碎", "最便宜的破壁起手"],
        kind: "enemy",
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

            // 踏进一小步，最多停在劈面边缘，避免冲过头。
            const self = world.observe(actor);
            if (self !== null && reach > 0.1) {
                const victim = action.target();
                const victimBody = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                const delta = victimBody !== null ? victimBody.position().minus(self.position()) : direction.scale(reach);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const step = Math.min(0.6, Math.max(0, flat - half - 0.35));
                if (step > 0.05) world.displace(actor, direction.scale(step));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            const vertices = brickbreakLane(origin, direction, reach, half);
            const lane = WorldGeometry.lane(origin, direction, reach, half, { below: 1.4, above: 2.4 });
            let strike = origin.plus(direction.scale(reach)), hits = 0, wards = 0;
            WorldGeometry.selectEnemies(world, lane, function (victim, facts) {
                if (hits === 0) strike = facts.position();
                hits++;
                wards += brickbreakShatter(world, facts.position(), wardBreak);
                hurt(action, victim, "brickbreak", power, { damage: damageSpec("brickbreak", "chop"), contact: true });
            });
            // 走廊里没人的时候，刀锋落点照样把屏障震碎。
            if (hits === 0) wards += brickbreakShatter(world, strike, wardBreak);

            WorldFeedback.emit(world, brickbreakScene, 1, strike,
                { moment: "chop", path: brickbreakPath(vertices), notes: notes, hits: hits, scale: half / 0.55,
                    direction: [direction.x(), direction.y(), direction.z()] }, 24);
            WorldFeedback.emit(world, brickbreakScene, 1, strike,
                { moment: "break", wards: wards, scale: wardBreak / 8, hits: hits }, 26);
            sound(action, "minecraft:entity.player.attack.strong");
            if (wards > 0) {
                sound(action, "minecraft:block.glass.break");
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.2, 0)), brickbreakCrackText, [wards], 30);
            }
            if (hits === 0)
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.0, 0)), brickbreakMissText, [], 24);
            done(action);
        }
    });
}
