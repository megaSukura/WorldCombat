/**
 * 贝壳刃 / razorshell 的出手方式。
 *
 * 核心念头：亮出壳缘，在身前划开一道宽弧——扇面里的每个对手都被切开，各自按几率被削掉一级防御；
 * 壳缘带水，被切开的还会被溅湿一段时间，为别的招留一段水湿窗口。
 *
 * 两幕：
 *   起（windup，提交前）：壳缘亮起一道水光，只播预告表现。
 *   扫（carve → shave）：提交后以施法者为心、朝身前 `arc` 度扇面扫过；扇面里每个非友方各挨一记 `carve`
 *       切斩，命中者按 `shaveChance` 掷削甲、被溅湿、沿弧向外顶开 `push` 格。命中处画出弧痕，有人被削甲时
 *       再补一层崩屑。扇面里没人则扫空（miss），只留一道划过的水风。
 *
 * 与同族分开：咬碎是单点研磨压塌护甲、撕裂爪是一道窄走廊的交叉撕抓、劈开是竖直重劈；
 * 只有贝壳刃扫出一个宽扇面，同时削多个目标的护甲并把它们溅湿。
 */
namespace PokemonSkills {
    const razorshellScene = "world_combat:move_razorshell";
    const razorshellSoaked = "world_combat:razorshell_soaked";
    const razorshellShaveText = "world_combat.move.razorshell.text.shave";
    const razorshellMissText = "world_combat.move.razorshell.text.miss";

    /** 身前扇面的顶点：origin 为心，朝 direction 张开 angle 度、半径 reach；判定与表现共用同一组顶点。 */
    function razorshellFan(origin: CombatPoint, direction: CombatPoint, reach: number, angle: number, samples: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const base = Math.atan2(heading.z(), heading.x()), half = angle * Math.PI / 360;
        const vertices: CombatPoint[] = [origin];
        for (let index = 0; index <= samples; index++) {
            const a = base - half + 2 * half * (index / samples);
            vertices.push(WorldCombat.point(origin.x() + Math.cos(a) * reach, origin.y(), origin.z() + Math.sin(a) * reach));
        }
        return vertices;
    }
    function razorshellPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "razorshell",
        cooldownParameter: "recharge",
        name: "Razor Shell",
        description: "亮出壳缘，在身前扫开一道宽弧：扇面里每个对手都挨一记切斩，各自按几率被削掉一级防御；壳缘带水，被切开的还会被溅湿一段时间。揽月式扫得更宽、削得更勤，凿刃式收成一条窄刃、单下更狠。",
        uses: ["在身前一记宽弧同时切多个目标", "一次削掉一排对手的防御", "把切中的目标溅湿，为水湿联动的招留窗口"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.6,
        prepare: 6,
        active: 26,
        recover: 7,
        cooldown: 22,
        style: "slash",
        defaults: { wide: false, ai: { maxChase: 6, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("razorshell", "reach", pokemon) : 2.3, geometry: "line", style: "water",
                color: 0x4AA6D8, label: config && config.wide === true ? "揽月式" : "凿刃式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["razorshell"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("razorshell", "tempo", context))),
                recover: Math.max(3, Math.round(p("razorshell", "aftercast", context))),
                cooldown: Math.max(14, Math.round(p("razorshell", "recharge", context))),
                active: skills["razorshell"].active,
                range: p("razorshell", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:razorshell:sheen", razorshellScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const direction = aim(action);
            const reach = p("razorshell", "reach", action);
            const angle = p("razorshell", "arc", action);
            const power = p("razorshell", "carve", action);
            const chance = p("razorshell", "shaveChance", action);
            const stages = Math.max(1, Math.round(p("razorshell", "shaveStages", action)));
            const soak = Math.max(20, Math.round(p("razorshell", "soakTicks", action)));
            const push = p("razorshell", "push", action);
            const cap = Math.max(1, Math.round(p("razorshell", "maxTargets", action)));
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const vertices = razorshellFan(origin, direction, reach, angle, 9);
            const region = WorldGeometry.polygon(vertices, { below: 1.1, above: 2.4 });
            const scale = Math.max(0.5, Math.min(2.2, angle / 110));
            const selfRef = String(self.ref());
            let hits = 0, shaved = 0;
            const strike = origin.plus(direction.scale(reach));

            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                if (hits >= cap || String(victim.ref()) === selfRef) return;
                const landed = hurt(action, victim, "razorshell", power,
                    { damage: damageSpec("razorshell", "carve"), contact: true, slice: true });
                if (!landed) return;
                hits++;
                const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                const out = away.length() < 0.05 ? direction : away.unit();
                if (world.valid(victim)) world.displace(victim, out.scale(push));
                // 壳缘带水：切中的目标被溅湿（共享身份 soaked，与水流尾/波动冲/水流裂破是同一件事）。
                if (!CombatStatus.has(world, victim, "soaked"))
                    CombatStatus.apply(world, victim, "soaked", razorshellSoaked, soak);
                if (world.random() >= chance) return;
                NativeEffects.boost(world, victim, "def", -stages);
                shaved++;
                WorldFeedback.emit(world, razorshellScene, 1, facts.position(),
                    { moment: "shave", target: String(victim.ref()), stages: stages, sparks: Math.round(10 + stages * 8), scale: scale }, 26);
            });

            WorldFeedback.emit(world, razorshellScene, 1, strike,
                { moment: "carve", path: razorshellPath(vertices), arc: Math.round(angle), carve: Math.round(power),
                    motes: Math.round(power), hits: hits, shaved: shaved,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale }, 26);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (hits > 0) sound(action, "cobblemon:impact.water");
            if (shaved > 0) WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 1.1, 0)), razorshellShaveText, [shaved], 28);
            if (hits === 0) {
                WorldFeedback.emit(world, razorshellScene, 1, strike, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 0.9, 0)), razorshellMissText, [], 20);
            }
            done(action);
        }
    });
}
