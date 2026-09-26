/**
 * 双光束 / twinbeam —— 出手方式。
 *
 * 核心念头：一记**双目并射**。两只眼睛各射出一道灵光，从各自的真实眼位朝同一个瞄点射出——两条射线在所选
 *   距离收拢于一点，再各自沿原直线穿过交点、飞完自己的射程。每道光只结算它碰到的**第一个**接触；两道光若
 *   确实打到同一个目标，那一点才会共鸣，第二道才吃到加成。
 *
 * 幕：
 *   起（raise，提交前）：双眼聚光、两点光在眼前凝成将射未射的亮点（`action.present`，可打断、不花 PP）。
 *   一（beam，提交后）：左眼射出一道。`action.trace` 从真实左眼位朝瞄点方向打到本招射程，取第一接触；
 *       第一接触是非友方活体就结算一记 `ray` 特殊伤害，是墙或友方就停在接触点、只留光路。
 *   二（beam）：`gap` 之后第二道从右眼位发射。共鸣式下，只有当第一道也打中**同一个目标**时，第二道才吃到
 *       `resonance` 加成；并射式两道几乎同时、各自独立、没有加成。
 *   收（settle）：目光收拢的余辉。
 *
 * 选取：`kind: "aim"`——自由点选交汇距离，实体输入取其身体中心作为瞄点；障碍会分别遮住对应那一道眼线，
 *   空放也照常射出两道。目标离场时只是那一道射空，动作仍走完两眼。
 *
 * 与同族分开：双针是两根细针沿同一条线先后射出、毒击是近身重刺、双翼是掠飞两拍；双光束是**两只眼睛发出的
 *   两道光从各自的眼位收拢到同一点**，画面里两条发光的线与两只手/两根针完全不同，射程也最远。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：两个眼位的左右方向；方向接近竖直时退化为世界 X 轴。 */
    function twinbeamSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: twinbeamId,
        cooldownParameter: "recharge",
        name: "Twin Beam",
        description: "从两只眼睛各射出一道灵光，两道光从各自的真实眼位朝同一个瞄点射出、在所选距离收拢于一点。每道光只打它碰到的第一个接触；两道光确实打到同一个目标时那一点才共鸣，第二道才更强。共鸣式出手更慢但后劲更足；并射式两道几乎同时射出、出手快，但没有共鸣加成。",
        uses: ["两只眼睛各射一道光，收拢到同一点", "两道光打中同一目标才触发共鸣", "远距离点名，不接触"],
        kind: "aim",
        range: 12,
        maxRange: 16,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 25,
        style: "twinbeam",
        defaults: { resonance: true, ai: { maxChase: 15, finishLow: false, leaveStation: true } },
        fields: [flag("resonance", "共鸣")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[twinbeamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("twinbeam", "tempo", context)),
                recover: Math.round(p("twinbeam", "settle", context)),
                cooldown: Math.round(p("twinbeam", "recharge", context)),
                active: 0,
                range: p("twinbeam", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(8, Math.round(p("twinbeam", "motes", action)));
            const eyeHeight = p("twinbeam", "eyeHeight", action);
            const eyeSpan = p("twinbeam", "eyeSpan", action);
            action.present("twinbeam:raise:" + action.id(), twinbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, eyes: 2, motes: motes, eyeHeight: eyeHeight, eyeSpan: eyeSpan,
                    resonance: config && config.resonance === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[twinbeamId], detail: { values: config } };
            return {
                radius: p("twinbeam", "reach", context), geometry: "line", style: "twinbeam", color: 0xE8A6E6,
                label: config && config.resonance === true ? "双光束·共鸣" : "双光束·并射"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const resonance = !!(config && config.resonance === true);
            const power = p("twinbeam", "ray", action);
            const gap = Math.max(1, Math.round(p("twinbeam", "gap", action)));
            const reach = Math.max(6, action.range());
            const eyeSpan = p("twinbeam", "eyeSpan", action);
            const eyeHeight = p("twinbeam", "eyeHeight", action);
            const bonus = p("twinbeam", "resonance", action);
            const beamRadius = p("twinbeam", "beamRadius", action);
            const motes = Math.max(10, Math.round(p("twinbeam", "motes", action)));
            let firstRef: string | null = null, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function fire(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { fire(next, 1); });
                    return;
                }
                const facing = aim(current);
                const side = twinbeamSide(facing);
                const eyes = self.position().plus(WorldCombat.point(0, eyeHeight - self.height() / 2, 0));
                const from = eyes.plus(side.scale(index === 0 ? eyeSpan / 2 : -eyeSpan / 2));
                const aimPoint = current.targetPosition();
                const delta = aimPoint.minus(from);
                const ray = delta.length() < 0.01 ? (facing.length() < 0.01 ? WorldCombat.point(0, 0, 1) : facing) : delta.unit();
                const to = from.plus(ray.scale(reach));
                const heading = [ray.x(), ray.y(), ray.z()];
                // 权威判定：这一道从真实眼位打出的第一条接触（含友方身体与实墙）。
                const contact = current.trace(from, to, beamRadius, true);
                const at = contact.position();
                const lander = contact.hitEntity() ? contact.target() : null;
                const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !scope.friendly(lander) ? lander : null;
                const line = [[from.x(), from.y(), from.z()], [at.x(), at.y(), at.z()]];
                WorldFeedback.emit(scope, twinbeamScene, 1, from,
                    { moment: "beam", path: line, side: index === 0 ? 1 : -1, eyeSpan: eyeSpan, beamRadius: beamRadius,
                        motes: motes, reach: reach, direction: heading, index: index + 1 }, 20);
                if (victim !== null && scope.valid(victim)) {
                    const same = index === 1 && firstRef !== null && String(victim.ref()) === firstRef;
                    const mult = same ? 1 + bonus : 1;
                    if (impact(current, contact, twinbeamId, power * mult, { damage: damageSpec(twinbeamId, "ray") })) {
                        if (index === 0) firstRef = String(victim.ref());
                        WorldFeedback.emit(scope, twinbeamScene, 1, at,
                            { moment: "spark", target: String(victim.ref()), motes: motes, beamRadius: beamRadius, index: index + 1,
                                intensity: Math.max(0.5, Math.min(2, (power * mult) / 55)) }, 20);
                        scope.sound("cobblemon:impact.psychic", at, 14, "{}");
                        if (same && bonus > 0) {
                            WorldFeedback.emit(scope, twinbeamScene, 1, at,
                                { moment: "resonance", target: String(victim.ref()), motes: motes, beamRadius: beamRadius }, 24);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), twinbeamResonanceText, [Math.round(bonus * 100)], 24);
                        }
                    } else {
                        WorldFeedback.emit(scope, twinbeamScene, 1, at, { moment: "miss", side: index === 0 ? 1 : -1, motes: motes, blocked: 0 }, 16);
                    }
                } else {
                    WorldFeedback.emit(scope, twinbeamScene, 1, at,
                        { moment: "miss", side: index === 0 ? 1 : -1, motes: motes, blocked: contact.blocked() ? 1 : 0 }, 16);
                }
                if (index === 0) current.after(gap, function (next: CombatAction) { fire(next, 1); });
                else finish(current);
            }

            sound(action, "cobblemon:move.psychic.actor");
            fire(action, 0);
        }
    });
}
