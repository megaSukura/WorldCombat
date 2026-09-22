/**
 * 冲浪 / surf 的出手方式。
 *
 * 核心念头：踏浪而起，从脚下把一整圈水同时向外掀开——水是**体积**，所以地上与空中的目标一起被淹，
 *   被浪推着往外走的人被浇透；浪头扫过的地面明火也被一格一格沤灭。它是唯一的整圈水漫。
 *
 * 与同族分开：水流尾、波动冲的水墙只朝一个方向压；冲浪是 360 度同时从身下漫开，施法者自己就是水源。
 *
 * 三幕：
 *   起（windup，提交前）：脚下水面翻起、浪将被推开的一圈预告，只播表现。
 *   漫（surge → hit）：提交后浪头一圈圈向外推出；每推到一个环带，环内的非友方各挨一次 `surge`，
 *       被沿离中心方向推开 `shove` 格、浇上湿身（共享身份 world_combat:status/soaked），
 *       身上在烧的火与灼伤被浇熄。
 *   收（settle / miss）：浪推到 `waveRadius` 后拍散，按 `quench` 预算沤熄圈里的地面明火；
 *       一个人都没淹到就播空浪。
 *
 * 配置 `tide` 由 resolve 改时序、由公式改数值。提交即结清 PP 与冷却（共享节奏）。
 */
namespace PokemonSkills {
    const surfScene = "world_combat:move_surf";
    const surfSoakedEffect = "world_combat:surf_soaked";
    const surfHitText = "world_combat.move.surf.text.hit";
    const surfMissText = "world_combat.move.surf.text.miss";
    const surfDouseText = "world_combat.move.surf.text.douse";

    /** 在浪头圈里按预算沤熄明火：一列只认最上面那层非空气方块，是火就灭掉；火灭掉不会自己烧回来。 */
    function surfQuench(world: CombatWorld, centre: CombatPoint, radius: number, budget: number): number {
        const base = Math.floor(centre.y()), cx = Math.floor(centre.x()), cz = Math.floor(centre.z());
        const reach = Math.ceil(radius), limit = Math.max(1, Math.round(budget));
        let doused = 0;
        for (let dx = -reach; dx <= reach && doused < limit; dx++) for (let dz = -reach; dz <= reach && doused < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            for (let dy = 1; dy >= -2; dy--) {
                const point = WorldCombat.point(cx + dx + 0.5, base + dy + 0.5, cz + dz + 0.5), block = world.block(point);
                if (block === null) continue;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") break;
                if (world.breakBlock(point, false) !== "") break;
                WorldFeedback.emit(world, surfScene, 1, point, { moment: "douse", scale: 1 }, 22);
                doused++;
                break;
            }
        }
        return doused;
    }

    define({
        id: "surf",
        name: "Surf",
        description: "从脚下把一整圈水同时向外掀开：圈内的敌人各挨一记浪涌，被向外推开并被浇透；身上的火与灼伤被浇熄，地面明火也被浪沤灭。涨潮式更狠更高更远，平铺式更广更快。",
        uses: ["一次漫过身周一圈的敌人", "把贴身的围攻推开、浇湿", "浇熄对手身上的火与地面的野火", "在雨里或水里掀浪，水势更盛"],
        kind: "self",
        range: 4.6,
        maxRange: 7.6,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 44,
        style: "wave",
        defaults: { tide: false, ai: { maxChase: 8, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("surf", "waveRadius", pokemon), geometry: "area", style: "wave",
                color: 0x4F9FD4, label: config && config.tide === true ? "涨潮式" : "平铺式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["surf"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(6, Math.round(p("surf", "tempo", context))),
                recover: Math.max(4, Math.round(p("surf", "aftercast", context))),
                cooldown: Math.max(24, Math.round(p("surf", "recharge", context))),
                active: skills["surf"].active,
                range: p("surf", "waveRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("surf:crest", surfScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", tide: config && config.tide === true,
                    radius: p("surf", "waveRadius", action), crest: p("surf", "crest", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.4, p("surf", "waveRadius", action));
            const power = p("surf", "surge", action);
            const crest = Math.max(1.0, p("surf", "crest", action));
            const shove = p("surf", "shove", action);
            const soak = Math.max(40, Math.round(p("surf", "soakTicks", action)));
            const steps = Math.max(2, Math.round(p("surf", "sweepTicks", action)));
            const spray = Math.max(10, Math.round(p("surf", "spray", action)));
            const quench = Math.max(1, Math.round(p("surf", "quench", action)));
            const cap = Math.max(1, Math.round(p("surf", "maxTargets", action)));
            const scale = radius / 4.6;
            const struck: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, settled = false;

            sound(action, "minecraft:item.trident.riptide_2");

            /** 浪推完：收势、沤火、报数。 */
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const doused = surfQuench(scope, centre, radius, quench);
                WorldFeedback.emit(scope, surfScene, 1, centre,
                    { moment: hits > 0 ? "settle" : "miss", radius: radius, front: radius, crest: crest,
                        spray: spray, scale: scale, hits: hits, doused: doused }, 30);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)),
                    hits > 0 ? surfHitText : surfMissText, hits > 0 ? [hits] : [], 26);
                done(current);
            }

            /** 一环环向外推：每环扫到的非友方各挨一次。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const outer = radius * (step + 1) / steps, inner = Math.max(0, radius * step / steps - 0.4);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, inner, outer, { below: 2, above: crest }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === String(current.actor().ref()) || struck[ref] || hits >= cap) return;
                        struck[ref] = true;
                        if (!hurt(current, enemy, "surf", power, { damage: damageSpec("surf", "surge") })) return;
                        hits++;
                        const away = facts.position().minus(centre);
                        if (scope.valid(enemy)) {
                            if (away.length() > 0.2) scope.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                            CombatStatus.apply(scope, enemy, "soaked", surfSoakedEffect, soak, 0);
                            if (CombatStatus.has(scope, enemy, "burn")) {
                                CombatStatus.cure(scope, enemy, "burn");
                                scope.ignite(enemy, 0);
                                WorldFeedback.emit(scope, surfScene, 1, facts.position(), { moment: "douse", target: ref, scale: scale }, 22);
                                WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.0, 0)), surfDouseText, [], 22);
                            }
                        }
                        WorldFeedback.emit(scope, surfScene, 1, facts.position(),
                            { moment: "hit", target: ref, scale: scale, spray: spray, intensity: Math.max(0.5, Math.min(2.2, power / 95)) }, 24);
                    });
                WorldFeedback.keep(scope, "surf:front:" + String(current.actor().ref()), surfScene, 1, centre,
                    { moment: "surge", radius: radius, front: outer, crest: crest, spray: spray, scale: scale, progress: (step + 1) / steps }, 10);
                step++;
                if (step >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
