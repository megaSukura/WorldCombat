/**
 * 大声咆哮 / snarl —— 注册与动作。
 *
 * 核心念头：站定朝身前**一声接一声地怒斥**，一道锥形声压按拍推出去。第一声喝住的人特攻被骂下去，
 *   后面每一声继续削血；每一声之间留出缝，对手可以走进或走出锥外，所以这是一段**能被走位打断的连续过程**，
 *   而不是一次结算。恶属性的声压不看视线，但只罩住身前那一锥。
 *
 * 幕：
 *   起（windup，提交前）：吸气、口边聚起暗色音符（`action.present`，可被打断、不花 PP）。
 *   斥（bark，提交后按 `pulses` 次）：每个脉冲以施法者为顶点、朝瞄准方向张开 `arc` 度、推出 `reach` 格，
 *     `WorldGeometry.sector` 选出锥内所有非友方，各结算一声 `bark` 伤害；第一个命中的脉冲给每人挂上
 *     `world_combat:status/snarled`（本单元效果 snarl_scolded）并下降特攻 `spaDrop` 级。
 *   收：最后一声之后收招。一声都没罩到人时补一个 fizzle 表现。
 *
 * 与同族分开：虫鸣是一道连续声波（近强远弱、概率碾防），战吼是纯削弱锥；大声咆哮是**唯一按拍连喝、
 *   允许走出锥外躲后几声**的声压。连斥式多而轻、断喝式少而重，由 resolve 与公式共同决定。
 */
namespace PokemonSkills {
    const snarlScene = "world_combat:move_snarl";
    const snarlScolded = "world_combat:snarl_scolded";
    const snarlHitText = "world_combat.move.snarl.text.hit";
    const snarlMissText = "world_combat.move.snarl.text.miss";

    /** 以施法者为顶点、朝方向张开 arc 度的锥形地面顶点；判定（sector）与表现（polygon）读同一份形状。 */
    function snarlCone(origin: CombatPoint, heading: CombatPoint, reach: number, arc: number): number[][] {
        const base = Math.atan2(heading.z(), heading.x());
        const half = (arc * Math.PI / 180) / 2, steps = 8;
        const vertices: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * (i / steps);
            vertices.push([origin.x() + Math.cos(angle) * reach, origin.y(), origin.z() + Math.sin(angle) * reach]);
        }
        return vertices;
    }

    /** 把瞄准方向压到水平面；声压锥按地面朝向推出去。 */
    function snarlHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: "snarl",
        name: "Snarl",
        description: "朝身前推出一道锥形怒吼，锥内每个敌人各挨一声伤害，被第一声喝住的人特攻下降。连斥式会一声接一声地骂，对手可以走出锥外躲开后面几声；断喝式只有一声但更重。",
        uses: ["把扎堆的敌人一次骂软，压低对面的特攻输出", "用连续几声逼对手走出声压锥、打乱站位", "在远处先手削掉法系威胁"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 6,
        active: 2,
        recover: 7,
        cooldown: 82,
        style: "snarl",
        defaults: { rant: false, ai: { maxChase: 11, cluster: 1, skipScolded: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["snarl"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const pulses = Math.max(1, Math.min(4, Math.round(p("snarl", "pulses", context))));
            return {
                prepare: Math.round(p("snarl", "tempo", context)),
                recover: Math.round(p("snarl", "recover", context)),
                cooldown: Math.round(p("snarl", "recharge", context)),
                active: Math.max(2, pulses * Math.max(2, Math.round(p("snarl", "gap", context)))),
                range: p("snarl", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("snarl:gather:" + action.id(), snarlScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", rant: config && config.rant === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["snarl"], detail: { values: config } };
            return { radius: p("snarl", "reach", context), geometry: "cone", style: "snarl", color: 0x8A6BC8,
                label: config && config.rant === true ? "大声咆哮·连斥" : "大声咆哮" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = snarlHeading(aim(action));
            const power = p("snarl", "bark", action);
            const pulses = Math.max(1, Math.min(4, Math.round(p("snarl", "pulses", action))));
            const gap = Math.max(2, Math.round(p("snarl", "gap", action)));
            const drop = Math.max(1, Math.min(2, Math.round(p("snarl", "spaDrop", action))));
            const hush = Math.max(60, Math.round(p("snarl", "hushTicks", action)));
            const notes = Math.max(10, Math.round(p("snarl", "notes", action)));
            const reach = Math.max(2.5, p("snarl", "reach", action));
            const arc = Math.max(30, p("snarl", "arc", action));
            const scale = Math.max(0.5, Math.min(2.2, reach / 4));
            let index = 0, landed = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function bark(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(current.actor());
                const origin = self === null ? current.origin() : self.position();
                const path = snarlCone(origin, heading, reach, arc);
                const region = WorldGeometry.sector(origin, heading, reach, arc, { below: 2, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (String(enemy.ref()) === String(actor.ref())) return;
                    const dealt = hurt(current, enemy, "snarl", power, { damage: damageSpec("snarl", "bark"), sound: true });
                    if (!dealt) return;
                    hits++;
                    WorldFeedback.emit(scope, snarlScene, 1, facts.position(),
                        { moment: "hush", target: String(enemy.ref()), notes: notes, drop: drop, pulse: index + 1,
                            intensity: Math.max(0.6, Math.min(2, power / 30)) }, 24);
                    if (!landed && scope.valid(enemy)) {
                        MobEffects.apply(scope, enemy, snarlScolded, hush, 0);
                        NativeEffects.boost(scope, enemy, "spa", -drop);
                        const at = scope.observe(enemy);
                        if (at !== null)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), snarlHitText, [drop], 26);
                    }
                });
                if (hits > 0) landed = true;
                WorldFeedback.emit(scope, snarlScene, 1, origin,
                    { moment: "bark", path: path, reach: reach, arc: arc, halfArc: arc / 2, notes: notes,
                        pulse: index + 1, hits: hits, scale: scale, direction: [heading.x(), heading.y(), heading.z()] }, 26);
                sound(current, index === 0 ? "minecraft:entity.wolf.growl" : "minecraft:entity.wolf.ambient");
                index++;
                if (index >= pulses) {
                    if (!landed) {
                        WorldFeedback.emit(scope, snarlScene, 1, origin, { moment: "fizzle", scale: scale }, 16);
                        WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), snarlMissText, [], 24);
                    }
                    finish(current);
                    return;
                }
                current.after(gap, bark);
            }

            bark(action);
        }
    });

    // 被斥期间，目标头顶持续飘起暗色音符与下坠的符号。
    WorldCombat.on("world_combat:move_snarl/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== snarlScolded) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "snarl:" + String(actor.ref()), snarlScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 24);
    });
}
