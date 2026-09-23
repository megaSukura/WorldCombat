/**
 * 翅膀攻击 / wingattack 的出手方式。
 *
 * 核心念头：**大大展开双翼，用它一整片拍出去**——翅膀张多宽，扇面就有多宽；站在扇面里的对手各挨一记，
 *   并被沿身体两侧推开。它是飞系里最基础、最便宜的一记：站定、只出一拍，宽度就是它的身份。
 *
 * 两幕（提交前只播预告）：
 *   展（spread，提交前）：双翼在身侧张开、羽毛与气拢成将拍未拍的扇，只播预告。
 *   扫（sweep → shove / miss）：提交后整片扇面在身前张开、同一刻结算；扇面内最近的至多 `targets` 个
 *       非友方各挨一记 `bash` 接触伤害，并沿背离施法者的方向被推开 `push` 格；一个都没扫到只落几根羽毛。
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

    /** 扇面顶点：origin 为扇心，向两侧各张 half 度、长 reach；判定与表现共用这一组顶点。 */
    function wingattackFan(origin: CombatPoint, heading: CombatPoint, reach: number, span: number): CombatPoint[] {
        const base = Math.atan2(heading.x(), heading.z()), half = span * Math.PI / 360, steps = 10;
        const vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= steps; i++) {
            const angle = base - half + 2 * half * i / steps;
            vertices.push(origin.plus(WorldCombat.point(Math.sin(angle) * reach, 0, Math.cos(angle) * reach)));
        }
        return vertices;
    }

    function wingattackPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: "wingattack",
        cooldownParameter: "recharge",
        name: "Wing Attack",
        description: "大大展开双翼，用一整片翅膀横扫身前的扇面：扇面内最近的至多几个非友方各挨一记接触伤害，并被沿身体两侧推开。宽扫式更宽、扫更多人、推得更开，单体更轻；收翼式单发更重、只扫一人。",
        uses: ["一次展翅扫开身前一小片对手", "把贴身的人推开、给自己让出落点", "最便宜、最稳的飞系接触一记，可以反复扇"],
        kind: "enemy",
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
            const vertices = wingattackFan(origin, heading, reach, span);

            sound(action, "cobblemon:move.aerialace.actor_1");
            WorldFeedback.emit(world, wingattackScene, 1, origin,
                { moment: "sweep", path: wingattackPath(vertices), chaff: chaff, targets: limit, span: span, push: push,
                    scale: scale, intensity: intensity, wide: wide ? 1 : 0 }, 22);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, span, { below: 2, above: 2.5 }),
                function (victim: CombatActor, facts: CombatObservation) {
                    if (hits >= limit) return;
                    if (facts.position().minus(origin).length() < 0.001) return;
                    if (!hurt(action, victim, "wingattack", power, { damage: damageSpec("wingattack", "bash"), contact: true, knockback: false })) return;
                    hits++;
                    if (!world.valid(victim)) return;
                    const body = world.observe(victim);
                    if (body === null) return;
                    const delta = body.position().minus(origin);
                    const outward = delta.length() < 0.01 ? heading : WorldCombat.point(delta.x(), 0, delta.z()).unit();
                    world.displace(victim, outward.scale(push));
                });

            if (hits > 0) {
                sound(action, "cobblemon:impact.flying");
                WorldFeedback.emit(world, wingattackScene, 1, origin.plus(heading.scale(reach * 0.5)),
                    { moment: "shove", chaff: chaff, targets: hits, push: push, scale: scale, intensity: intensity }, 18);
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
