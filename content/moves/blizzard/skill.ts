/**
 * 暴风雪 / blizzard 的出手方式。
 *
 * 核心念头：指定一块地方召唤一片驻留的风雪，一阵一阵地扑打整片范围——圈里的敌人每阵被冻伤一次、被风
 *   往外推，并有概率被冻住；风雪落下即把地面盖上一层雪。范围就在画面上，走出去就安全。
 *
 * 三幕：
 *   起（windup，提交前）：云层在落点上空聚拢、寒风先至的预告。
 *   扑（storm → rake ×rakes → impact）：提交后在落点成立风暴，按 rakeInterval 扑打 rakes 阵；每阵把
 *       范围内所有敌人各结算一次 gust 伤害（对同一目标的后续阵次逐次衰减）、按 push 往外推、按
 *       freezeChance 掷冰冻。
 *   积（snow → settle）：提交时即在地面铺下雪层（租借，linger），风雪停后在原地保留 snowTicks 刻，到期原方块回来。
 *
 * 天气（对应原生雪天必中）：下雨或雷暴时范围更大、每阵更重、冰冻概率更高；晴天收小变轻，能不能打到由
 *   站位决定，而不是掷命中。配置 howl（呼啸式）：范围更大、阵数更多、推得更远，但每阵更轻、起手与冷却更久。
 */
namespace PokemonSkills {
    const blizzardScene = "world_combat:move_blizzard";
    const blizzardHitText = "world_combat.move.blizzard.text.hit";
    const blizzardMissText = "world_combat.move.blizzard.text.miss";

    /** 在风暴范围内给地面铺一层雪（租借，linger，到期原方块回来）。 */
    function blizzardSnow(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [];
        const limit = Math.max(8, Math.round(cap));
        const r = Math.ceil(radius);
        const baseX = Math.floor(centre.x()), baseY = Math.floor(centre.y()), baseZ = Math.floor(centre.z());
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
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
                if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                    cells.push({ x: x, y: y, z: z, block: "minecraft:snow_block" });
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        id: "blizzard",
        cooldownParameter: "recharge",
        name: "Blizzard",
        description: "在一块地方召唤驻留的风雪，一阵阵扑打整片范围：圈里的敌人每阵挨一次冻伤、被风往外推，并有概率被冻住而无法行动；同一目标在风暴里待得越久，每阵伤害越低。风雪刮过之处地面被雪覆盖。下雨天更猛。",
        uses: ["封锁一块场地，逼敌人离开或硬吃", "一次覆盖挤在一起的一队敌人", "在雨天把范围和冰冻概率都推高"],
        kind: "point",
        range: 12,
        maxRange: 16,
        prepare: 16,
        active: 60,
        recover: 12,
        cooldown: 70,
        style: "storm",
        defaults: { howl: false, ai: { maxChase: 14, cluster: true, clusterRadius: 4 } },
        fields: [flag("howl", "呼啸式")],
        indicator: function (config, pokemon) {
            return { radius: p("blizzard", "radius", pokemon), geometry: "area", style: "storm", color: 0xBFE9FF,
                label: config && config.howl === true ? "暴风雪·呼啸" : "暴风雪·集中" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["blizzard"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const rakes = Math.max(1, Math.round(p("blizzard", "rakes", context)));
            const interval = Math.max(4, Math.round(p("blizzard", "rakeInterval", context)));
            return {
                prepare: Math.round(p("blizzard", "tempo", context)),
                recover: Math.round(p("blizzard", "aftercast", context)),
                cooldown: Math.round(p("blizzard", "recharge", context)),
                active: rakes * interval + 12,
                range: p("blizzard", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("blizzard:gather", blizzardScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "gather", howl: config && config.howl === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const centre = action.targetPosition();
            const env = WorldEnvironment.read(world, centre);
            const storm = !!env && typeof env.rain === "number" && env.rain > 0.2;
            const gust = p("blizzard", "gust", action);
            const rakes = Math.max(1, Math.round(p("blizzard", "rakes", action)));
            const interval = Math.max(4, Math.round(p("blizzard", "rakeInterval", action)));
            const radius = Math.max(1.5, p("blizzard", "radius", action));
            const push = p("blizzard", "push", action);
            const freezeChance = Math.max(0, Math.min(1, p("blizzard", "freezeChance", action)));
            const snowTicks = Math.max(40, Math.round(p("blizzard", "snowTicks", action)));
            const snowCells = Math.max(8, Math.round(p("blizzard", "snowCells", action)));
            const scale = radius / 4.2;
            const intensity = Math.max(0.6, Math.min(2.4, gust * rakes / 90));
            const hit: { [ref: string]: number } = {};
            let settled = false, unique = 0;
            const rate = Math.round(60 + gust * 4 + rakes * 6);
            const impactCount = Math.round(14 + gust * 0.8);
            // 积雪在提交后立刻铺下（租借，linger）：动作结束时租约不会随动作被收回。
            const placed = blizzardSnow(world, centre, radius, snowTicks, snowCells);

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, blizzardScene, 1, centre,
                    { moment: "settle", radius: radius, scale: scale, cells: placed, storm: storm ? 1 : 0 }, 30);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.4, 0)),
                    unique > 0 ? blizzardHitText : blizzardMissText, unique > 0 ? [unique] : [], 28);
                sound(current, "minecraft:entity.breeze.wind_burst");
                done(current);
            }

            function rake(current: CombatAction, index: number): void {
                if (index >= rakes) { settle(current); return; }
                const scope = current.world();
                const region = WorldGeometry.ring(centre, 0, radius, { below: 2.5, above: 4 });
                WorldGeometry.selectEnemies(scope, region, function (victim, facts) {
                    const ref = String(victim.ref());
                    const ordinal = hit[ref] || 0;
                    const falloff = Math.max(0.5, Math.pow(0.85, ordinal));
                    if (!hurt(current, victim, "blizzard", gust * falloff,
                        { damage: damageSpec("blizzard", "gust"), status: "frozen", chance: freezeChance, flags: { wind: true } })) return;
                    if (!ordinal) unique++;
                    hit[ref] = ordinal + 1;
                    const away = facts.position().minus(centre);
                    const heading = away.length() < 0.05 ? WorldCombat.point(0, 0, 0) : away.unit();
                    if (scope.valid(victim)) scope.displace(victim, heading.scale(push).plus(WorldCombat.point(0, 0.12, 0)));
                    WorldFeedback.emit(scope, blizzardScene, 1, facts.position(),
                        { moment: "impact", target: ref, intensity: intensity, scale: scale, rake: index + 1, ordinal: ordinal + 1,
                            impactCount: impactCount }, 24);
                });
                WorldFeedback.keep(scope, "blizzard:storm:" + String(actor.ref()), blizzardScene, 1, centre,
                    { moment: "storm", radius: radius, scale: scale, intensity: intensity, progress: (index + 1) / rakes,
                        step: index + 1, rakes: rakes, interval: interval, stormTicks: rakes * interval + 12,
                        storm: storm ? 1 : 0, rate: rate }, interval + 8);
                current.after(interval, function (next) { rake(next, index + 1); });
            }

            sound(action, "minecraft:entity.breeze.whirl");
            WorldFeedback.emit(world, blizzardScene, 1, centre,
                { moment: "gather", radius: radius, scale: scale, intensity: intensity, rakes: rakes, interval: interval,
                    storm: storm ? 1 : 0, rate: rate }, 30);
            rake(action, 0);
        }
    });
}
