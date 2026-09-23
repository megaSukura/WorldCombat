/**
 * 撕裂爪 / crushclaw 的出手方式。
 *
 * 核心念头：踏前一步，双爪在身前划出一个交叉，一记把护甲撕开。它比碎岩重、比铁尾快，撕中时撕甲几率全族最高；
 * 而且它主动利用别人开出的缺口——目标已经带着破防身份时，这一撕掀得更深。
 *
 * 三幕：
 *   起（windup，提交前）：双爪交叉抬起，爪尖聚起冷光。
 *   击（slash → tear）：提交后朝目标踏前一小步，在身前一条矩形走廊里撕过；走廊内敌人各挨一记接触斩击，
 *       按撕甲几率降防并挂上撕开标记；命中处画出交叉的两道爪痕。
 *   收：走廊里没人就撕空（miss），只留一道划过的爪风。
 *
 * 与同族分开：碎岩是贴脸连点，铁尾是慢而重的下砸，暗影之骨是远程骨投；撕裂爪是踏前的一记交叉撕抓。
 * 共享身份 world_combat:status/guardbroken 由 startup.ts 声明；本招还消费它来加深撕口。
 */
namespace PokemonSkills {
    const crushclawScene = "world_combat:move_crushclaw";
    const crushclawMark = "world_combat:crushclaw_rent";
    const crushclawTearText = "world_combat.move.crushclaw.text.tear";
    const crushclawMissText = "world_combat.move.crushclaw.text.miss";

    /** 以 origin 为起点、朝 direction 长 reach、半宽 half 的矩形走廊四个角；判定与表现共用。 */
    function crushclawLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        var forward = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        var side = WorldCombat.point(-heading.z(), 0, heading.x());
        var end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function crushclawPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }
    /** 命中点上的两道交叉爪痕（X），返回两条线段的世界顶点。 */
    function crushclawCross(point: CombatPoint, direction: CombatPoint, half: number, v: number): CombatPoint[][] {
        var side = WorldCombat.point(-direction.z(), 0, direction.x());
        var up = WorldCombat.point(0, 1, 0);
        var h = half * 1.1;
        return [
            [point.plus(side.scale(-h)).plus(up.scale(-v)), point.plus(side.scale(h)).plus(up.scale(v))],
            [point.plus(side.scale(-h)).plus(up.scale(v)), point.plus(side.scale(h)).plus(up.scale(-v))]
        ];
    }

    define({
        freeMovement: true,
        id: "crushclaw",
        name: "Crush Claw",
        description: "踏前一步，双爪在身前划出交叉，把走廊里的对手撕开：撕中时最有可能让目标防御下降一级，目标已经带着破防身份时还会多降一级；比碎岩重、比铁尾快。",
        uses: ["踏前交叉撕甲", "对已经被砸开的目标掀得更深", "在中近距离一记换取防御下降"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.0,
        prepare: 6,
        active: 24,
        recover: 8,
        cooldown: 34,
        style: "slash",
        defaults: { ai: { maxChase: 8, ripOpen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("crushclaw", "lunge", pokemon), geometry: "line", style: "slash", color: 0xC05A5A, label: "撕裂爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["crushclaw"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("crushclaw", "prepare", context),
                recover: p("crushclaw", "recover", context),
                cooldown: p("crushclaw", "cooldown", context),
                range: Math.max(3.0, p("crushclaw", "lunge", context) + 0.6)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_crushclaw:windup", crushclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const lunge = p("crushclaw", "lunge", action);
            const reach = lunge;
            const half = p("crushclaw", "width", action);
            const power = p("crushclaw", "slash", action);
            const chance = p("crushclaw", "tearChance", action);
            const stages = Math.max(1, Math.round(p("crushclaw", "tearStages", action)));
            const deepen = Math.max(0, Math.round(p("crushclaw", "deepen", action)));
            const tearTicks = Math.max(40, Math.round(p("crushclaw", "tearTicks", action)));
            const notes = Math.max(10, Math.round(power * 1.1));

            // 踏前一步：朝目标方向推进一小段，最多停在判定的边缘，避免冲过头。
            const self = world.observe(actor);
            if (self !== null && lunge > 0.05) {
                const victim = action.target();
                const victimBody = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                const delta = victimBody !== null ? victimBody.position().minus(self.position()) : direction.scale(lunge);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const step = Math.min(lunge, Math.max(0, flat - half - 0.4));
                if (step > 0.05) world.displace(actor, direction.scale(step));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();

            const vertices = crushclawLane(origin, direction, reach, half);
            const region = WorldGeometry.polygon(vertices, { below: 1.6, above: 3 });
            let strike: CombatPoint = origin.plus(direction.scale(reach)), hits = 0, torn = 0;
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                const landed = hurt(action, victim, "crushclaw", power, { damage: damageSpec("crushclaw", "slash"), contact: true, slice: true });
                if (!landed) return;
                if (hits === 0) strike = facts.position();
                hits++;
                if (world.random() >= chance) return;
                const amount = stages + (CombatStatus.has(world, victim, "guardbroken") ? deepen : 0);
                NativeEffects.boost(world, victim, "def", -amount);
                if (MobEffects.apply(world, victim, crushclawMark, tearTicks, 0) === null) return;
                torn++;
                WorldFeedback.emit(world, crushclawScene, 1, facts.position(),
                    { moment: "tear", target: String(victim.ref()), stages: amount, scale: 1 }, 26);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), crushclawTearText, [amount], 30);
            });

            const point = strike;
            WorldFeedback.emit(world, crushclawScene, 1, point,
                { moment: "slash", path: crushclawPath(vertices), notes: notes, hits: hits, torn: torn,
                    scale: half / 0.55, direction: [direction.x(), direction.y(), direction.z()] }, 26);
            const cross = crushclawCross(point, direction, half, 0.75);
            WorldFeedback.emit(world, crushclawScene, 1, point,
                { moment: "cross", path: [[cross[0][0].x(), cross[0][0].y(), cross[0][0].z()], [cross[0][1].x(), cross[0][1].y(), cross[0][1].z()]],
                    scale: half / 0.55 }, 22);
            WorldFeedback.emit(world, crushclawScene, 1, point,
                { moment: "cross", path: [[cross[1][0].x(), cross[1][0].y(), cross[1][0].z()], [cross[1][1].x(), cross[1][1].y(), cross[1][1].z()]],
                    scale: half / 0.55 }, 22);
            sound(action, "minecraft:entity.player.attack.sweep");
            sound(action, "cobblemon:move.dragonclaw.target");
            if (hits === 0)
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), crushclawMissText, [], 24);
            done(action);
        }
    });
}
