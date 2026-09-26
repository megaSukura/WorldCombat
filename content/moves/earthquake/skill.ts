/**
 * 地震 / earthquake 的出手方式。
 *
 * 核心念头：把全身的重量一次砸进地里，脚下整块地面当场隆起、沿几条裂缝崩开——站在那块地上的人被一起
 * 向上抛起并向外推开，空中的目标不沾地所以安全。它比同族的重踏更重、更广、更瞬时：重踏是一圈爬到
 * 脚边的地裂，地震是整片地一次掀起来。
 *
 * 三幕（余震式多一幕）：
 *   起（windup，提交前）：施法者沉身，脚边尘土被震得跳起、地面浮现将被掀开的圈。
 *   掀（rupture → hit）：提交后地面整块掀起；圈内每个站在地上的敌人各挨一次 `tremor`，被向上抛起
 *       `launch`、沿离中心的方向推开 `shove`。空中的目标只看到掀起、吃不到伤害。
 *   痕（rent）：掀完后地面扬起放射状裂纹，停留一会儿自然散去——只由表现层承载，不换地面方块。
 *   余震（aftershock，仅余震式）：主震后 `aftershockDelay` 刻再按 `fissureRadius × 0.85` 掀一次半威力的余震，
 *       主震没踩在地上的敌人若此刻已落地会再挨一下；同一人一次施放最多主震或余震挨一次。
 *
 * 配置 `aftershock`（余震式）由 resolve 改时序、由公式改威力；开启＝主震更轻但补一次余震、起手与冷却更长。
 */
namespace PokemonSkills {
    const earthquakeScene = "world_combat:move_earthquake";
    const earthquakeHitText = "world_combat.move.earthquake.text.hit";
    const earthquakeMissText = "world_combat.move.earthquake.text.miss";

    define({
        requiresGround: true,
        id: "earthquake",
        name: "Earthquake",
        description: "把重量砸进大地，脚下整片地面同时掀起：只命中站在地上的敌人，被掀中的人向上抛起并被向外推开；掀完地面扬起放射状裂纹后散去。余震式主震更轻，但过一会儿再掀一次。",
        uses: ["一次掀到身周一圈站在地上的敌人", "打断贴身的围攻、把人掀离地面", "跳过空中的目标，专打站桩的对手", "在掀起后留下裂纹残痕，标出刚刚震过的地面"],
        kind: "self",
        range: 4.6,
        maxRange: 7.4,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "quake",
        defaults: { aftershock: false, ai: { maxChase: 8, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("earthquake", "fissureRadius", pokemon), geometry: "area", style: "quake",
                color: 0x9A6B3A, label: config && config.aftershock === true ? "余震式" : "单震式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["earthquake"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const aftershock = !!(config && config.aftershock);
            return {
                prepare: Math.round(p("earthquake", "prepare", context) + (aftershock ? 4 : 0)),
                recover: Math.round(p("earthquake", "recover", context)),
                cooldown: Math.round(p("earthquake", "cooldown", context) + (aftershock ? 10 : 0)),
                active: skills["earthquake"].active,
                range: p("earthquake", "fissureRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            const aftershock = config && config.aftershock === true;
            const area = p("earthquake", "fissureRadius", action);
            action.present("earthquake:stomp", earthquakeScene, 1, action.origin(),
                JSON.stringify({ moment: "stomp", area: area,
                    aftershock: aftershock, aftershockArea: aftershock ? area * 0.85 : 0,
                    aftershockMarks: aftershock ? Math.round(12 + area * 6) : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.8, p("earthquake", "fissureRadius", action));
            const aftershockRadius = radius * 0.85;
            const power = p("earthquake", "tremor", action);
            const launch = p("earthquake", "launch", action);
            const shove = p("earthquake", "shove", action);
            const rentTicks = Math.max(100, Math.round(p("earthquake", "rentTicks", action)));
            const cells = Math.max(16, Math.round(p("earthquake", "rentCells", action)));
            const cap = Math.max(1, Math.round(p("earthquake", "maxTargets", action)));
            const aftershock = !!(config && config.aftershock);
            const delay = Math.max(5, Math.round(p("earthquake", "aftershockDelay", action)));
            const scale = radius / 4.6;
            const struck: { [ref: string]: boolean } = {};
            let hits = 0, settled = false;

            /**
             * 一次掀地，`reach` 为这一次的真实波及半径：圈内每个还站在地上的敌人各挨一记，
             * 被向上抛起并向外推开。抛起/推开都走原生受击位移入口，抗性、权限、骑乘与事件取消由它处理；
             * `struck` 只在这记伤害真正结算成功后登记，主震没踩在地上的敌人留给余震再抓。
             */
            function rupture(current: CombatAction, amount: number, reach: number): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, reach, { below: 2.5, above: 2.5 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === String(current.actor().ref()) || hits >= cap) return;
                    if (!facts.grounded() || struck[ref]) return;
                    if (!hurt(current, enemy, "earthquake", amount, { damage: damageSpec("earthquake", "tremor") })) return;
                    struck[ref] = true;
                    hits++;
                    const away = facts.position().minus(centre);
                    if (scope.valid(enemy)) {
                        if (away.length() > 0.2)
                            scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                        scope.hitImpulse(enemy, WorldCombat.point(0, launch, 0));
                    }
                    WorldFeedback.emit(scope, earthquakeScene, 1, facts.position(),
                        { moment: "hit", target: ref, scale: scale, intensity: Math.max(0.5, Math.min(2.2, amount / 95)), count: Math.round(12 + amount * 0.28) }, 24);
                });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, earthquakeScene, 1, centre,
                    { moment: "rent", radius: radius, cells: cells, linger: rentTicks, ruptured: hits,
                        flow: Math.round(36 + cells * 1.6) }, rentTicks);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)),
                    hits > 0 ? earthquakeHitText : earthquakeMissText, hits > 0 ? [hits] : [], 26);
                done(current);
            }

            sound(action, "minecraft:item.mace.smash_ground_heavy");
            WorldFeedback.emit(world, earthquakeScene, 1, centre,
                { moment: "rupture", radius: radius, scale: scale, ruptured: 0,
                    intensity: Math.max(0.6, Math.min(2.4, power / 95)), cells: cells,
                    marks: Math.round(14 + power * 0.3), flow: Math.round(60 + radius * 26) }, 28);
            sound(action, "cobblemon:impact.ground");
            rupture(action, power, radius);

            if (!aftershock) { finish(action); return; }
            action.after(delay, function (next: CombatAction) {
                WorldFeedback.emit(next.world(), earthquakeScene, 1, centre,
                    { moment: "aftershock", radius: aftershockRadius, scale: scale, cells: Math.round(cells * 0.5),
                        marks: Math.round(8 + power * 0.15), flow: Math.round(40 + aftershockRadius * 18) }, 24);
                sound(next, "cobblemon:impact.ground");
                rupture(next, power * 0.5, aftershockRadius);
                finish(next);
            });
        }
    });
}
