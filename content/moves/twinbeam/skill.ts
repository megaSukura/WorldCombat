/**
 * 双光束 / twinbeam —— 出手方式。
 *
 * 核心念头：一记**双目并射**。两只眼睛各射出一道灵光，两道光从两个眼位收拢、在目标身上汇成一点。第一道先把
 *   目标"点亮"，第二道顺着这点共鸣射入，第一道命中则第二道更强。它是四招里唯一远程、特殊、不接触的一招。
 *
 * 幕：
 *   起（raise，提交前）：双眼聚光、两点光在眼前凝成将射未射的亮点（`action.present`，可打断、不花 PP）。
 *   一（beam，提交后）：第一道。左眼射出一道光，沿瞄准线打到目标落点；命中结算一记 `ray` 特殊伤害，
 *       落点炸开光点。目标不在射程内或已离场就只留一道空光。
 *   二（beam）：`gap` 之后第二道。共鸣式下第二道顺着第一道的亮点射入，第一道命中则吃到 `resonance` 加成；
 *       并射式下两道几乎同时、各自独立结算、没有加成。
 *   收（settle）：目光收拢的余辉。
 *
 * 与同族分开：双针是两根细针沿同一条线先后射出、毒击是近身重刺、双翼是俯冲两拍；双光束是**两只眼睛发出的
 *   两道光收拢到一点**，画面里两条发光的线与两只手/两根针完全不同的读法，射程也最远。
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
        description: "The user shoots mystical beams from its eyes to inflict damage. The target is hit twice in a row.",
        uses: ["两只眼睛各射一道光，收拢到同一个目标", "先点亮再共鸣，第二道打得更深", "远距离点名，不接触"],
        kind: "enemy",
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
            let landedFirst = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function fire(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { fire(next, 1); });
                    return;
                }
                const direction = aim(current);
                const side = twinbeamSide(direction);
                const eyes = self.position().plus(WorldCombat.point(0, eyeHeight - self.height() / 2, 0));
                const from = eyes.plus(side.scale(index === 0 ? eyeSpan / 2 : -eyeSpan / 2));
                const target = current.target();
                const point = current.targetPosition();
                const distance = point.minus(self.position()).length();
                const visible = target !== null && scope.valid(target) && !scope.friendly(target);
                const heading = [direction.x(), direction.y(), direction.z()];
                WorldFeedback.emit(scope, twinbeamScene, 1, from,
                    { moment: "beam", path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]], side: index === 0 ? 1 : -1,
                        eyeSpan: eyeSpan, beamRadius: beamRadius, motes: motes, reach: reach, direction: heading, index: index + 1 }, 20);
                if (!visible || distance > reach + 0.5) {
                    WorldFeedback.emit(scope, twinbeamScene, 1, point, { moment: "miss", side: index === 0 ? 1 : -1, motes: motes }, 16);
                    if (index === 0) current.after(gap, function (next: CombatAction) { fire(next, 1); });
                    else finish(current);
                    return;
                }
                const mult = index === 1 && landedFirst ? 1 + bonus : 1;
                if (hurt(current, target, twinbeamId, power * mult, { damage: damageSpec(twinbeamId, "ray") })) {
                    if (index === 0) landedFirst = true;
                    WorldFeedback.emit(scope, twinbeamScene, 1, point,
                        { moment: "spark", target: String(target.ref()), motes: motes, beamRadius: beamRadius, index: index + 1,
                            intensity: Math.max(0.5, Math.min(2, (power * mult) / 55)) }, 20);
                    scope.sound("cobblemon:impact.psychic", point, 14, "{}");
                    if (index === 1 && bonus > 0 && landedFirst) {
                        WorldFeedback.emit(scope, twinbeamScene, 1, point,
                            { moment: "resonance", target: String(target.ref()), motes: motes, beamRadius: beamRadius }, 24);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), twinbeamResonanceText, [Math.round(bonus * 100)], 24);
                    }
                } else {
                    WorldFeedback.emit(scope, twinbeamScene, 1, point, { moment: "miss", side: index === 0 ? 1 : -1, motes: motes }, 16);
                }
                if (index === 0) current.after(gap, function (next: CombatAction) { fire(next, 1); });
                else finish(current);
            }

            sound(action, "cobblemon:move.psychic.actor");
            fire(action, 0);
        }
    });
}
