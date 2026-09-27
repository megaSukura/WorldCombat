/**
 * 翅膀攻击 / wingattack 的出手方式。
 *
 * 核心念头：**大大展开双翼，用它一整片拍出去**——翅膀张多宽，扇面就有多宽；站在扇面里的对手各挨一记，
 *   并被沿身体两侧推开：目标在中线左右哪边，就推向哪边，把正前方让出来。它是飞系里最基础、最便宜的一记：
 *   站定、只出一拍，宽度就是它的身份。
 *
 * 两幕（提交前只播预告）：
 *   展（spread，提交前）：双翼在身体两侧张开、羽毛与气拢成将拍未拍的扇，只播预告；左右翼位置随本次瞄准转向。
 *   扫（sweep，提交后）：左右两片翼锋从身体中心沿各自半扇由内向外短短扫过；每一刻都按当刻真实子弧（原点与
 *       外弧两端的三角楔）用 `WorldGeometry.bodyPolygon` 判定，与画面共用同一组端点。扇面内按到施法者的距离
 *       由近到远选至多 `targets` 个**真实身体可达**的非友方，各挨一记 `bash` 接触伤害，并用 `hitDisplace` 推离中线；
 *       推不动时如实保留原地。命中击杀也照发接触回执。一个都没扫到只落几根羽毛。
 *
 * 选取 `kind: "aim"`：自由前向扇扫，方向或世界点都能张开、空挥可用；命中权限仍由命中层判断。
 *
 * 与同族分开：双翼是俯冲上扬的两拍、施法者自身在动；啄是单点快啄；空气利刃是远程特殊扇面。翅膀攻击是
 *   站定的、一拍的接触横扫，玩家凭「张开的翅膀有多宽、扇面就多宽」认出它。钢翼用两侧翼缘、中央留安全空隙；
 *   翅膀攻击是正面整扇，中央不留空隙。
 *
 * 配置 `wide`（宽扫式）由公式改人数/推开/威力、由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const wingattackScene = "world_combat:move_wingattack";
    const wingattackMissText = "world_combat.move.wingattack.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function wingattackHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 目标相对中线的侧向推力：偏向中线哪边就推向哪边；正落在中线上按原轻推规则沿正面推，不随机换边。 */
    function wingattackSidePush(delta: CombatPoint, heading: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        const forward = flat.x() * heading.x() + flat.z() * heading.z();
        const lateral = WorldCombat.point(flat.x() - forward * heading.x(), 0, flat.z() - forward * heading.z());
        return lateral.length() > 0.05 ? lateral.unit() : heading;
    }

    function wingattackVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: "wingattack",
        cooldownParameter: "recharge",
        name: "Wing Attack",
        description: "大大展开双翼，左右两片翼锋从身体中心向前短短扫过身前整扇：扇面内按距离由近到远至多 `targets` 个非友方各挨一记接触伤害，并被推向中线左右各自那一侧，把正前方让出来。可朝方向或空地空挥。宽扫式能扫更多人、推得更开但单体更轻；收翼式单发更重、只扫一人。",
        uses: ["一次展翅扫开身前一小片对手", "把贴身的人推向两侧、给自己让出落点", "便宜、稳定、可以反复扇的飞系接触一记"],
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
            // 左右翼位置随本次瞄准转向：把原来的世界轴偏移（左/右 0.35、前 0.35、高 0.75）随 heading 旋转。
            const frame = WorldGeometry.basis(action.direction(), WorldCombat.point(0, 0, 1));
            function wingOffset(side: number): number[] {
                const lateral = frame.right.scale(0.35 * side), front = frame.forward.scale(0.35);
                return [lateral.x() + front.x(), 0.75, lateral.z() + front.z()];
            }
            action.present("world_combat:wingattack:" + action.id(), wingattackScene, 1, action.origin(), JSON.stringify({
                moment: "spread", wide: config && config.wide === true ? 1 : 0, scale: scale,
                span: p("wingattack", "span", action),
                leftOffset: wingOffset(-1), rightOffset: wingOffset(1) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const heading = wingattackHeading(aim(action));
            const power = p("wingattack", "bash", action);
            const reach = Math.max(1.5, p("wingattack", "reach", action));
            const span = Math.max(30, Math.min(340, p("wingattack", "span", action)));
            const push = Math.max(0, p("wingattack", "push", action));
            const limit = Math.max(1, Math.round(p("wingattack", "targets", action)));
            const chaff = Math.max(4, Math.round(p("wingattack", "chaff", action)));
            const wide = !!(config && config.wide);
            const scale = Math.max(0.6, Math.min(2, reach / 3.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 45));
            const height = Math.max(0.6, body.height());
            // 正面翼面的接触厚度跟真实身体高度：站得高拍得高。
            const band = { below: Math.max(0.5, height * 0.5), above: Math.max(0.8, height * 0.5 + 0.4) };
            const lowY = origin.y() - band.below, highY = origin.y() + band.above;
            const half = span * Math.PI / 360;
            const base = Math.atan2(heading.x(), heading.z());
            const steps = 3;
            const struck: { [ref: string]: boolean } = {};
            const chosen: { [ref: string]: boolean } = {};
            let hits = 0;
            const scenes = WorldFeedback.actionScenes(wingattackScene);

            // 先按距离与可达身体在整个扇面里选最近至多 `targets` 个非友方；扫到谁就兑现谁，人数上限按距离截断。
            (function chooseTargets() {
                const candidates: { victim: CombatActor; distance: number }[] = [];
                WorldGeometry.selectBodies(world, WorldGeometry.bodySector(origin, heading, reach, span, band),
                    function (victim, facts) {
                        if (String(victim.ref()) === String(actor.ref()) || world.friendly(victim)) return;
                        if (WorldGeometry.blockHit(world, origin, world.closestPoint(victim, origin))) return;
                        candidates.push({ victim: victim, distance: facts.position().minus(origin).length() });
                    });
                candidates.sort(function (a, b) { return a.distance - b.distance; });
                for (let i = 0; i < candidates.length && i < limit; i++) chosen[String(candidates[i].victim.ref())] = true;
            })();

            function pointAt(angle: number, radius: number): CombatPoint {
                return WorldCombat.point(origin.x() + Math.sin(angle) * radius, origin.y(), origin.z() + Math.cos(angle) * radius);
            }

            /** 命中一个真实可达的身体：伤害成功后计数与推开；击杀也照发接触回执。 */
            function land(current: CombatAction, victim: CombatActor, facts: CombatObservation): void {
                const scope = current.world();
                const ref = String(victim.ref());
                if (hits >= limit || !chosen[ref] || ref === String(actor.ref()) || struck[ref] || scope.friendly(victim)) return;
                // 扇面逐身体可达：真实身体箱挡在前面就不是这一记能拍到的人。
                if (WorldGeometry.blockHit(scope, origin, scope.closestPoint(victim, origin))) return;
                const at = facts.position();
                if (!hurt(current, victim, "wingattack", power,
                    { damage: damageSpec("wingattack", "bash"), contact: true, knockback: false })) return;
                struck[ref] = true; hits++;
                // 受击位移走 hitDisplace：保留原生抗击退、事件与敌我权限；推不动就保留原地。
                const away = wingattackSidePush(at.minus(origin), heading);
                const moved = push > 0 && scope.valid(victim) ? scope.hitDisplace(victim, away.scale(push)) : 0;
                // 命中回执用伤害前的真实接触点：目标被这一记击杀也照发，不再跳过。
                WorldFeedback.emit(scope, wingattackScene, 1, at,
                    { moment: "shove", target: ref, chaff: chaff, push: Math.round(moved * 100) / 100,
                        direction: [away.x(), away.y(), away.z()], scale: scale, intensity: intensity }, 18);
            }

            /** 按到施法者的距离由近到远排序，让最近的先被兑现、人数上限按距离截断。 */
            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                for (let side = -1 as number; side <= 1; side += 2) {
                    const a0 = base + side * half * (index / steps);
                    const a1 = base + side * half * ((index + 1) / steps);
                    const p0 = pointAt(a0, reach), p1 = pointAt(a1, reach);
                    const wedge = WorldGeometry.bodyPolygon([origin, p0, p1], lowY, highY);
                    // 只兑现先前选中的最近目标：扫到当前子弧时才结算，判定与画面共用这组子弧端点。
                    WorldGeometry.selectBodies(scope, wedge, function (victim, facts) { land(current, victim, facts); });
                    scenes.show(current, side < 0 ? "sweepL" : "sweepR", origin,
                        { moment: "sweep", path: [wingattackVertex(origin), wingattackVertex(p0), wingattackVertex(p1)],
                            side: side < 0 ? "left" : "right", chaff: chaff, targets: Math.max(1, hits), span: span,
                            scale: scale, intensity: intensity, wide: wide ? 1 : 0 });
                }
                if (index + 1 >= steps || current.world().observe(actor) === null) { finish(current); return; }
                current.after(1, function (next: CombatAction) { step(next, index + 1); });
            }

            function finish(current: CombatAction): void {
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, wingattackScene, 1, origin.plus(heading.scale(reach * 0.4)),
                        { moment: "miss", chaff: Math.round(chaff * 0.5), scale: scale }, 18);
                    const self = scope.observe(actor);
                    if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, self.height() + 0.1, 0)), wingattackMissText, [], 20);
                } else {
                    sound(current, "cobblemon:impact.flying");
                }
                scenes.finish(current, done);
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            step(action, 0);
        }
    });
}
