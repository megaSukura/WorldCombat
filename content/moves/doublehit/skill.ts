/**
 * 二连击 / doublehit —— 出手方式。
 *
 * 核心念头：一记**左右回扫**。尾巴先向一侧横扫，把身前的对手扫开、并把身位往那一侧带；再顺势反向回扫拍回。
 *   两扫方向相反，所以被扫到的人先被推到一边、又被推回，想站稳就得挪步。它照顾身前一整片（尾巴扫出的弧），
 *   而不是扎一个点。
 *
 * 幕：
 *   起（raise，提交前）：转身把尾巴甩起来、地面上扬起一圈预备的尘土（`action.present`，可打断、不花 PP）。
 *   一（sweep1，提交后）：第一扫。身前扇形内最多 `maxTargets` 个非友方各挨一记 `swing` 接触伤害，沿扫动方向
 *       被推开 `push` 格。
 *   二（sweep2）：`gap` 之后第二扫。回扫式把目标往反方向推回；直扫式同向一路推出去。第一扫命中过的人在这扫
 *       被标记为"回扫回头"，浮字提示。走出弧面的人躲开。
 *   收（settle）：收尾的余尘。
 *
 * 与同族分开：水流尾是一片向前压的弧形水墙、湿身、沿背离方向推走；铁尾锁定一点重砸；只有二连击是**原地
 *   左-右两扫**，把人沿弧线来回推，不带任何属性；反制方式是卡在两扫之间的空当、或绕到扫不到的背面。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：尾巴扫动的左右方向；方向接近竖直时退化为世界 X 轴。 */
    function doublehitSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: doublehitId,
        cooldownParameter: "recharge",
        name: "Double Hit",
        description: "原地甩尾，向身前左右各扫一次：第一扫把目标沿弧线扫开，第二扫顺势回拍，把人推来推去。回扫式罩得更宽、推力更大、能同时照顾多个目标；直扫式两扫同向、更窄更集中、每扫更重。",
        uses: ["原地甩尾，向左右各扫一次", "把身前一小片敌人沿弧线来回推", "用宽弧的势把贴身的对手扫开"],
        kind: "enemy",
        range: 3.4,
        maxRange: 4.8,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "sweep",
        defaults: { arc: true, ai: { maxChase: 9, crowd: true, leaveStation: true } },
        fields: [flag("arc", "回扫")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[doublehitId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("doublehit", "tempo", context)),
                recover: Math.round(p("doublehit", "settle", context)),
                cooldown: Math.round(p("doublehit", "recharge", context)),
                active: 0,
                range: p("doublehit", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const dust = Math.max(6, Math.round(p("doublehit", "dust", action)));
            action.present("doublehit:raise:" + action.id(), doublehitScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, dust: dust, arc: config && config.arc === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[doublehitId], detail: { values: config } };
            return {
                radius: p("doublehit", "reach", context), geometry: "cone", style: "sweep", color: 0xD8C9A6,
                label: config && config.arc === true ? "二连击·回扫" : "二连击·直扫"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const arc = !!(config && config.arc === true);
            const power = p("doublehit", "swing", action);
            const gap = Math.max(2, Math.round(p("doublehit", "gap", action)));
            const reach = Math.max(2, action.range());
            const span = p("doublehit", "span", action);
            const push = p("doublehit", "push", action);
            const dust = Math.max(8, Math.round(p("doublehit", "dust", action)));
            const cap = Math.max(1, Math.round(p("doublehit", "maxTargets", action)));
            const band = { below: 1.1, above: 2.4 };
            const struck: { [ref: string]: boolean } = {};
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function sweep(current: CombatAction, index: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) {
                    if (index === 1) { finish(current); return; }
                    current.after(2, function (next: CombatAction) { sweep(next, 1); });
                    return;
                }
                const origin = self.position();
                const direction = aim(current);
                const side = doublehitSide(direction);
                const heading = [direction.x(), direction.y(), direction.z()];
                WorldFeedback.emit(scope, doublehitScene, 1, origin,
                    { moment: index === 0 ? "sweep1" : "sweep2", index: index + 1, reach: reach, span: span, dust: dust,
                        arc: arc ? 1 : 0, direction: heading, side: [side.x(), side.z()] }, 22);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, span, band), function (victim, facts) {
                    if (hits >= cap) return;
                    if (!hurt(current, victim, doublehitId, power, { damage: damageSpec(doublehitId, "swing"), contact: true })) return;
                    hits++;
                    const ref = String(victim.ref());
                    const returned = index === 1 && struck[ref] === true;
                    if (index === 0) struck[ref] = true;
                    const at = scope.observe(victim);
                    const point = at === null ? facts.position() : at.position();
                    if (scope.valid(victim)) {
                        const shove = arc ? side.scale(index === 0 ? push : -push) : direction.scale(push);
                        scope.displace(victim, shove);
                    }
                    WorldFeedback.emit(scope, doublehitScene, 1, point,
                        { moment: index === 0 ? "hit1" : "hit2", target: ref, dust: dust, index: index + 1, arc: arc ? 1 : 0,
                            intensity: Math.max(0.5, Math.min(2, power / 50)) }, 22);
                    scope.sound("cobblemon:impact.normal", point, 14, "{}");
                    if (returned)
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), doublehitTurnText, [], 20);
                });
                if (index === 0) {
                    if (hits === 0) WorldFeedback.emit(scope, doublehitScene, 1, origin,
                        { moment: "miss1", direction: heading, reach: reach, span: span, dust: dust }, 18);
                    current.after(gap, function (next: CombatAction) { sweep(next, 1); });
                    return;
                }
                WorldFeedback.emit(scope, doublehitScene, 1, origin.plus(direction.scale(reach * 0.5)),
                    { moment: "settle", reach: reach, span: span, dust: dust }, 18);
                finish(current);
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            sweep(action, 0);
        }
    });
}
