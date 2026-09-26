/**
 * 狂舞挥打 / brutalswing 的出手方式。
 *
 * 核心念头：**原地横扫一整圈**——压身收臂后整个人横转一整圈，圈带扫过的每个敌人都各挨一记、被沿离心
 *   方向甩开；转完就站稳，不减速。这一记卖的是「被围住时一次把一圈人扫开」的覆盖。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：沉身收臂，身周暗色气旋向里收拢、地面浮出半径圈，只播预告。
 *   扫（sweep → hit）：提交后从起始朝向横转 `lap` 刻；每刻重读身边当前的敌人，按「上一角到当前角」真正扫过的
 *       扇带判定——站在这一小段刃路里、还没被扫过的敌人各挨一次 `sweep`（真墙挡刃，后来跨进刃路的也算），
 *       按各自体重的 `jolt` 被甩开。画面只画此刻那道刃弧和很短一段过去轨迹，不从起始一格格长成满饼。
 *   收（settle）：转满一整圈后地面荡出一圈尘环淡去；没扫到人就只留扑空的尘。
 *
 * 与同族分开：臂锤/冰锤是原地过顶单体重砸、疾速转轮是贴地旋转冲进；狂舞挥打是唯一原地转整圈、
 *   一圈内每个敌人都各挨一次、且不给自己减速的招式。
 *
 * 配置 `wide` 由公式改半径／威力／扫飞／时序，由本文件决定弧扫的取样与收招表现。
 */
namespace PokemonSkills {
    const brutalswingScene = "world_combat:move_brutalswing";
    const brutalswingText = "world_combat.move.brutalswing.text.swept";
    const brutalswingMissText = "world_combat.move.brutalswing.text.miss";

    define({
        id: "brutalswing",
        cooldownParameter: "recharge",
        name: "Brutal Swing",
        description: "沉身收臂后原地横转一整圈：身边半径内的每个敌人各挨一记物理伤害，并被沿离心方向甩开；转完就站稳，不给自己减速。广抡式伸得更开、甩得更狠，代价是单发更轻、转身更慢。",
        uses: ["被围住时原地扫开一圈", "打断贴身围攻、把近身的人甩开", "不减速的近身覆盖：转一圈就收"],
        kind: "self",
        range: 3.0,
        maxRange: 5.0,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 24,
        maximumTicks: 200,
        style: "whirl",
        defaults: { wide: false, ai: { maxChase: 8, minFoes: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("brutalswing", "reach", pokemon) : 3.0, geometry: "area", style: "whirl",
                color: 0x6B4A8C, label: config && config.wide === true ? "广抡式" : "紧抡式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["brutalswing"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("brutalswing", "tempo", context)),
                recover: Math.round(p("brutalswing", "aftercast", context)),
                cooldown: Math.round(p("brutalswing", "recharge", context)),
                active: 0,
                range: p("brutalswing", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("brutalswing:gather", brutalswingScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", wide: config && config.wide === true ? 1 : 0,
                    radius: p("brutalswing", "reach", action), power: Math.round(p("brutalswing", "sweep", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(brutalswingScene);
            const world = action.world();
            const self = world.observe(action.actor());
            if (self === null) { done(action); return; }
            const centre = self.position();
            const heading = aim(action);
            const base = Math.atan2(heading.x(), heading.z());
            const radius = Math.max(2.2, p("brutalswing", "reach", action));
            const power = p("brutalswing", "sweep", action);
            const lap = Math.max(4, Math.round(p("brutalswing", "lap", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 3.0));
            const intensity = Math.max(0.5, Math.min(2.0, power / 60));
            const full = Math.PI * 2;
            const selfRef = String(action.actor().ref());
            const struck: { [ref: string]: boolean } = Object.create(null);
            const trail = Math.min(full / 12, full * 2 / lap);
            let step = 0, hits = 0;

            function normal(angle: number): number { return ((angle % full) + full) % full; }

            /** 此刻真正在扫的那段刃弧：上一角到当前角，加很短一段过去轨迹；不从 0 累积成满饼。 */
            function arcPath(from: number, to: number): number[][] {
                const start = Math.max(0, from), span = Math.max(0.001, to - start);
                const points: number[][] = [[centre.x(), centre.y() + 0.1, centre.z()]];
                const segments = Math.max(1, Math.ceil(span / (full / 24)));
                for (let i = 0; i <= segments; i++) {
                    const a = base + start + span * i / segments;
                    points.push([centre.x() + Math.sin(a) * radius, centre.y() + 0.1, centre.z() + Math.cos(a) * radius]);
                }
                return points;
            }

            function finish(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, brutalswingScene, 1, centre,
                    { moment: "settle", radius: radius, scale: scale, intensity: intensity, swept: hits,
                        count: Math.round(8 + power * 0.2) }, 26);
                WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)),
                    hits > 0 ? brutalswingText : brutalswingMissText, hits > 0 ? [hits] : [], 26);
                scenes.finish(current, done);
            }

            /** 这一小段扇带里、当前还在半径内的敌人：只挡真墙，身体不遮刃；后来跨进刃路的也会被读到。 */
            function swept(current: CombatAction, previous: number, angle: number): void {
                const scope = current.world();
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, radius, { below: 2.0, above: 2.5 }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (ref === selfRef || struck[ref]) return;
                        const delta = facts.position().minus(centre);
                        const bearing = normal(Math.atan2(delta.x(), delta.z()) - base);
                        if (bearing <= previous - 1e-6 || bearing > angle + 1e-6) return;
                        const wall = scope.clipBlocks(centre, facts.position());
                        if (wall !== null && wall.blocked() && wall.position().minus(centre).length() + 0.05 < delta.length()) return;
                        struck[ref] = true;
                        if (!hurt(current, enemy, "brutalswing", power,
                            { damage: damageSpec("brutalswing", "sweep"), contact: true, slice: true })) return;
                        hits++;
                        const jolt = Math.max(0, p("brutalswing", "jolt", withTarget(factContext(current), enemy)));
                        WorldFeedback.emit(scope, brutalswingScene, 1, facts.position(),
                            { moment: "hit", target: ref, scale: scale, intensity: intensity, count: Math.round(8 + power * 0.2) }, 18);
                        if (scope.valid(enemy) && jolt > 0) {
                            const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                            if (away.length() > 0.15) scope.displace(enemy, away.unit().scale(jolt));
                        }
                    });
            }

            /** 每刻按当前敌人重读这一段刃路；扫满 `lap` 刻后收招。 */
            function advance(current: CombatAction): void {
                const angle = full * (step + 1) / lap;
                const previous = full * step / lap;
                swept(current, previous, angle);
                scenes.show(current, "sweep", centre,
                    { moment: "sweep", path: arcPath(Math.max(0, angle - trail), angle), progress: Math.min(1, (step + 1) / lap),
                        direction: [Math.sin(base), 0, Math.cos(base)], radius: radius, scale: scale, intensity: intensity });
                step++;
                if (step >= lap) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            sound(action, "minecraft:entity.player.attack.sweep");
            advance(action);
        }
    });
}
