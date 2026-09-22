/**
 * 精神之牙 / psychicfangs 的出手方式。
 *
 * 核心念头：用意念把身体送出去，一口咬住；这一口会把目标那层屏障咬碎并吞下去，碎得越多咬得越狠。
 * 三幕：
 *   起（windup，提交前）：口中与身周转起精神力，牙影先在身旁成形。
 *   扑咬（execute → lunge → bite）：提交后沿瞄准方向扑出一段，在身前一条窄走廊里咬合；走廊内敌人各挨一记
 *       接触咬击，命中处爆出精神火花。
 *   吞壁（break）：咬合点半径内的反射壁、光墙与极光幕一起被咬碎；每碎一层，这一口就更重。
 *
 * 与同族分开：劈瓦是更近、更快、更便宜的刀劈；怒牛是整段位移的多目标冲撞；上菜是带增益的优雅一击。
 * 精神之牙是全族射程最远、单口最重、且把碎壁当饭吃的一记。
 */
namespace PokemonSkills {
    const psychicfangsScene = "world_combat:move_psychicfangs";
    const psychicfangsBreakText = "world_combat.move.psychicfangs.text.break";
    const psychicfangsMissText = "world_combat.move.psychicfangs.text.miss";

    function psychicfangsShatter(world: CombatWorld, centre: CombatPoint, radius: number): number {
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
    function psychicfangsLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function psychicfangsPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "psychicfangs",
        name: "精神之牙",
        description: "用意念把身体送出去，一口咬住：咬伤目标，咬碎咬合点周围的反射壁、光墙与极光幕，每碎一层这一口就更重。",
        uses: ["从稍远处扑咬一个目标", "把屏障咬碎并吞成额外力道", "在对手刚张幕时一口吃掉它"],
        kind: "enemy",
        range: 3.2,
        maxRange: 5.0,
        prepare: 9,
        active: 20,
        recover: 8,
        cooldown: 30,
        style: "bite",
        defaults: { devour: false, ai: { maxChase: 10, eatBarrier: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("psychicfangs", "lunge", pokemon) : 3.2, geometry: "line", style: "bite",
                color: 0xE06AC8, label: config && config.devour ? "噬壁式" : "穿刺式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["psychicfangs"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("psychicfangs", "tempo", context))),
                recover: Math.max(3, Math.round(p("psychicfangs", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("psychicfangs", "recharge", context))),
                range: p("psychicfangs", "lunge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychicfangs:windup", psychicfangsScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", devour: config && config.devour ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const reach = p("psychicfangs", "lunge", action);
            const half = p("psychicfangs", "fangWidth", action);
            const base = p("psychicfangs", "bite", action);
            const bonus = p("psychicfangs", "devour", action);
            const wardBreak = p("psychicfangs", "wardBreak", action);

            // 意念把身体送出去：最多扑到咬合边缘，避免冲进目标身体里。
            const self = world.observe(actor);
            if (self !== null) {
                const victim = action.target();
                const victimBody = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                const delta = victimBody !== null ? victimBody.position().minus(self.position()) : direction.scale(reach);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const step = Math.min(reach * 0.85, Math.max(0, flat - half - 0.4));
                if (step > 0.05) world.displace(actor, direction.scale(step));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();
            WorldFeedback.emit(world, psychicfangsScene, 1, origin,
                { moment: "lunge", direction: [direction.x(), direction.y(), direction.z()], scale: half / 0.5 }, 16);

            const vertices = psychicfangsLane(origin, direction, reach, half);
            const lane = WorldGeometry.lane(origin, direction, reach, half, { below: 1.4, above: 2.2 });
            let strike = origin.plus(direction.scale(reach)), hits = 0, wards = 0, total = 0;
            WorldGeometry.selectEnemies(world, lane, function (victim, facts) {
                if (hits === 0) strike = facts.position();
                hits++;
                const broken = psychicfangsShatter(world, facts.position(), wardBreak);
                wards += broken;
                const power = base * (1 + bonus * Math.min(3, broken));
                total += power;
                const landed = hurt(action, victim, "psychicfangs", power, { damage: damageSpec("psychicfangs", "bite"), contact: true, bite: true });
                if (landed) WorldFeedback.emit(world, psychicfangsScene, 1, facts.position(),
                    { moment: "bite", target: String(victim.ref()), power: Math.round(power), wards: broken, scale: half / 0.5 }, 24);
            });
            if (hits === 0) wards += psychicfangsShatter(world, strike, wardBreak);

            WorldFeedback.emit(world, psychicfangsScene, 1, strike,
                { moment: "bite", path: psychicfangsPath(vertices), power: Math.round(total / Math.max(1, hits)), hits: hits,
                    wards: wards, scale: half / 0.5, direction: [direction.x(), direction.y(), direction.z()] }, 24);
            WorldFeedback.emit(world, psychicfangsScene, 1, strike,
                { moment: "break", wards: wards, scale: wardBreak / 8 }, 26);
            sound(action, "cobblemon:move.superfang.target");
            if (wards > 0) {
                sound(action, "cobblemon:impact.psychic");
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.2, 0)), psychicfangsBreakText, [wards], 30);
            }
            if (hits === 0)
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.0, 0)), psychicfangsMissText, [], 24);
            done(action);
        }
    });
}
