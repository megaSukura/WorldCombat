/**
 * 翅膀攻击 / wingattack 的出手方式。
 *
 * 核心念头：**大大展开双翼，用它一整片拍出去**——翅膀张多宽，扇面就有多宽；站在扇面里的对手各挨一记，
 *   并被沿身体两侧推开：目标在中线左右哪边，就推向哪边，把正前方让出来。它是飞系里最基础、最便宜的一记：
 *   站定、只出一拍，宽度就是它的身份。
 *
 * 两幕（提交前只播预告）：
 *   展（spread，提交前）：双翼在身侧张开、羽毛与气拢成将拍未拍的扇，只播预告。
 *   扫（sweep → shove / miss）：提交后左右两片翼锋各扫过扇面的一半、同一刻结算；扇面内最近的至多 `targets` 个
 *       非友方各挨一记 `bash` 接触伤害，并被推离中线；推不动时如实保留原地，不重写它的运动。一个都没扫到只落几根羽毛。
 *
 * 选取 `kind: "aim"`：自由前向扇扫，方向或世界点都能张开、空挥可用；命中权限仍由命中层判断。
 *
 * 与同族分开：双翼是俯冲上扬的两拍、施法者自身在动；啄是单点快啄；空气利刃是远程特殊扇面。翅膀攻击是
 *   站定的、一拍的接触横扫，玩家凭「张开的翅膀有多宽、扇面就多宽」认出它。
 *
 * 配置 `wide`（宽扫式）由公式改宽度/人数/推开/威力、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const wingattackScene = "world_combat:move_wingattack";
    const wingattackMissText = "world_combat.move.wingattack.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function wingattackHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 半片扇面顶点（side<0 左半、side>0 右半）：origin 为扇心，从中心线向该侧张开 half 度、长 reach；
     *  左右两片合起来就是判定的整个扇区，表现直接读这组顶点。 */
    function wingattackHalf(origin: CombatPoint, heading: CombatPoint, reach: number, span: number, side: number): CombatPoint[] {
        const base = Math.atan2(heading.x(), heading.z()), half = span * Math.PI / 360, steps = 6;
        const vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= steps; i++) {
            const t = side < 0 ? i / steps - 1 : i / steps;
            const angle = base + t * half;
            vertices.push(origin.plus(WorldCombat.point(Math.sin(angle) * reach, 0, Math.cos(angle) * reach)));
        }
        return vertices;
    }

    /** 目标相对中线的侧向推力：偏向中线哪边就推向哪边；正落在中线上按原轻推规则沿正面推，不随机换边。 */
    function wingattackSidePush(delta: CombatPoint, heading: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        const forward = flat.x() * heading.x() + flat.z() * heading.z();
        const lateral = WorldCombat.point(flat.x() - forward * heading.x(), 0, flat.z() - forward * heading.z());
        return lateral.length() > 0.05 ? lateral.unit() : heading;
    }

    function wingattackPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "wingattack",
        cooldownParameter: "recharge",
        name: "Wing Attack",
        description: "大大展开双翼，左右各一片翼锋横扫身前的扇面：扇面内最近的非友方各挨一记接触伤害，并被推向中线左右各自那一侧，把正前方让出来。可朝方向或空地空挥。宽扫式更宽、扫更多人、推得更开但单体更轻；收翼式单发更重、只扫一人。",
        uses: ["一次展翅扫开身前一小片对手", "把贴身的人推开、给自己让出落点", "便宜、稳定、可以反复扇的飞系接触一记"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.8,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 13,
        style: "wing",
        defaults: { wide: false, ai: { maxChase: 6, crowd: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("wingattack", "reach", pokemon), geometry: "cone", style: "wing", color: 0xE8EEF2,
                label: config && config.wide === true ? "宽扫翅膀攻击" : "收翼翅膀攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["wingattack"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const wide = !!(config && config.wide);
            return {
                prepare: Math.round(p("wingattack", "tempo", context)),
                recover: Math.round(p("wingattack", "aftercast", context)) + (wide ? 1 : 0),
                cooldown: Math.round(p("wingattack", "recharge", context)),
                active: 0,
                range: p("wingattack", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:wingattack:" + action.id(), wingattackScene, 1, action.origin(), JSON.stringify({
                moment: "spread", wide: config && config.wide === true ? 1 : 0, scale: scale,
                span: p("wingattack", "span", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const heading = wingattackHeading(aim(action));
            const power = p("wingattack", "bash", action);
            const reach = Math.max(1.5, p("wingattack", "reach", action));
            const span = Math.max(30, p("wingattack", "span", action));
            const push = Math.max(0, p("wingattack", "push", action));
            const limit = Math.max(1, Math.round(p("wingattack", "targets", action)));
            const chaff = Math.max(4, Math.round(p("wingattack", "chaff", action)));
            const wide = !!(config && config.wide);
            const scale = Math.max(0.6, Math.min(2, reach / 3.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 45));
            const leftPath = wingattackPath(wingattackHalf(origin, heading, reach, span, -1));
            const rightPath = wingattackPath(wingattackHalf(origin, heading, reach, span, 1));
            const victims: { victim: CombatActor; facts: CombatObservation }[] = [];
            let hits = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, span, { below: 2, above: 2.5 }),
                function (victim: CombatActor, facts: CombatObservation) {
                    if (victims.length >= limit) return;
                    if (facts.position().minus(origin).length() < 0.001) return;
                    victims.push({ victim: victim, facts: facts });
                });

            sound(action, "cobblemon:move.aerialace.actor_1");
            // 左右各一片翼锋：两片合起来就是服务端判定的同一组扇面顶点，画面与范围一致。
            WorldFeedback.emit(world, wingattackScene, 1, origin,
                { moment: "sweep", path: leftPath, side: "left", chaff: chaff, targets: Math.max(1, victims.length), span: span,
                    scale: scale, intensity: intensity, wide: wide ? 1 : 0 }, 22, "wingattack:sweep:left");
            WorldFeedback.emit(world, wingattackScene, 1, origin,
                { moment: "sweep", path: rightPath, side: "right", chaff: chaff, targets: Math.max(1, victims.length), span: span,
                    scale: scale, intensity: intensity, wide: wide ? 1 : 0 }, 22, "wingattack:sweep:right");

            for (const entry of victims) {
                if (!hurt(action, entry.victim, "wingattack", power,
                    { damage: damageSpec("wingattack", "bash"), contact: true, knockback: false })) continue;
                hits++;
                if (!world.valid(entry.victim)) continue;
                const body = world.observe(entry.victim);
                if (body === null) continue;
                // 推向该目标相对中线所偏的那一侧；推不动就保留原地，不重写它的运动，也不冒充推成功。
                const away = wingattackSidePush(body.position().minus(origin), heading);
                const moved = push > 0 ? world.displace(entry.victim, away.scale(push)) : 0;
                WorldFeedback.emit(world, wingattackScene, 1, body.position(),
                    { moment: "shove", target: String(entry.victim.ref()), chaff: chaff, push: Math.round(moved * 100) / 100,
                        direction: [away.x(), away.y(), away.z()], scale: scale, intensity: intensity }, 18);
            }

            if (hits > 0) {
                sound(action, "cobblemon:impact.flying");
            } else {
                WorldFeedback.emit(world, wingattackScene, 1, origin.plus(heading.scale(reach * 0.4)),
                    { moment: "miss", chaff: Math.round(chaff * 0.5), scale: scale }, 18);
                const body = world.observe(action.actor());
                if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), wingattackMissText, [], 20);
            }
            done(action);
        }
    });
}
