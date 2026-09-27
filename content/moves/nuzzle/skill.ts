/**
 * 蹭蹭脸颊 / nuzzle —— 出手方式。
 *
 * 核心念头：得先贴到对手身上。施法者蹲下攒电、朝目标扑一截，够得着才把带电的脸颊蹭上去；
 *   蹭上只有极小的物理伤害，但一定把对手麻住。反过来说，没贴到就是彻底的空——它用「接近」代替命中率。
 *
 * 幕：
 *   起（windup，提交前）：蹲身、脸颊噼啪攒电的预告（`action.present`，可被打断、不花 PP）。
 *   扑（lunge）：提交后把总 `lunge` 格拆成几刻小步身体扫掠，朝锁定方向一段段贴近；第一次真实身体接触即结束移动。
 *   蹭（touch / whiff）：接触时按 `nudge` 结算一次物理伤害，伤害成功后才施加共享麻痹身份；够不着或撞墙只留一下扑空的电花。
 *
 * 与同族分开：电磁炮、十万伏特、电击都是发出去的电；只有蹭蹭脸颊是**接触**招——必须把身位送进去，
 *   反制方式因此变成「别让它靠近」，而不是走位躲弹。
 */
namespace PokemonSkills {
    const nuzzleScene = "world_combat:move_nuzzle";
    const nuzzleCheekScene = "world_combat:move_nuzzle_cheeks";
    const nuzzleHitText = "world_combat.move.nuzzle.text.hit";
    const nuzzleImmuneText = "world_combat.move.nuzzle.text.immune";
    const nuzzleResistText = "world_combat.move.nuzzle.text.resist";
    const nuzzleWhiffText = "world_combat.move.nuzzle.text.whiff";

    define({
        freeMovement: true,
        id: nuzzleId,
        cooldownParameter: "recharge",
        name: "Nuzzle",
        description: "得先贴到对手身上：蹭一下带电的脸颊，伤害极小，但命中就使对方麻痹——期间移动减半，每次出招还有四分之一概率落空。扑空就什么也不发生。猛扑式能扑得更远，代价是落地更慢、蹭的劲更小。电属性对麻痹免疫。",
        uses: ["贴身把对手必麻", "追上逃开的对手再蹭住", "先手控制一个难缠的目标"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.8,
        prepare: 7,
        active: 4,
        recover: 7,
        cooldown: 15,
        style: "spark",
        defaults: { pounce: false, ai: { maxChase: 9, seekUnparalysed: true, preferFast: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[nuzzleId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(nuzzleId, "tempo", context)),
                recover: Math.round(p(nuzzleId, "settle", context)),
                cooldown: Math.round(p(nuzzleId, "recharge", context)),
                active: 4,
                range: p(nuzzleId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(3, Math.round(p(nuzzleId, "arcs", action)));
            const touch = p(nuzzleId, "touchReach", action);
            // 脸颊由客户端按真实身体朝向逐帧摆放：转身时双颊跟着前方走，不用固定世界轴偏移。
            action.present("nuzzle:cheek:" + action.id(), nuzzleCheekScene, 1, action.origin(),
                JSON.stringify({ moment: "cheek", windup: prepare, arcs: arcs,
                    scale: Math.max(0.6, Math.min(1.8, touch / 0.85)),
                    pounce: config && config.pounce ? 1 : 0, start: action.sense().tick() }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[nuzzleId], detail: { values: config } };
            // 预览画的是身体起手后真正扫过的范围（前扑 + 接触半径），而不是只画锁定距离。
            return { radius: p(nuzzleId, "lunge", context) + p(nuzzleId, "touchReach", context), geometry: "area", style: "spark", color: 0xFFE96A,
                label: config && config.pounce === true ? "蹭蹭脸颊·猛扑" : "蹭蹭脸颊" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const selfStart = world.observe(self);
            const origin0 = selfStart === null ? action.origin() : selfStart.position();
            const totalLunge = p(nuzzleId, "lunge", action);
            const touch = p(nuzzleId, "touchReach", action);
            const power = p(nuzzleId, "nudge", action);
            const numbTicks = Math.max(20, Math.round(p(nuzzleId, "numbTicks", action)));
            const arcs = Math.max(3, Math.round(p(nuzzleId, "arcs", action)));
            const scale = Math.max(0.6, Math.min(1.8, touch / 0.85));
            const intensity = Math.max(0.6, Math.min(1.8, power / 22));
            // 总前扑不变，拆成 2..4 刻小步身体扫掠：真实身体接触结束移动，不用球形距离近似。
            const steps = 3;
            const heading = WorldGeometry.flatUnit(action.targetPosition().minus(origin0), action.direction());
            const movementScenes = WorldFeedback.actionScenes(nuzzleScene);
            let travelled = 0;
            let finished = false;

            sound(action, "cobblemon:move.thundershock.actor");

            function conclude(current: CombatAction, victim: CombatActor | null, contact: CombatPoint): void {
                if (finished) return;
                finished = true;
                const scope = current.world();
                if (victim !== null) {
                    // 真实蹭上：伤害成功后才尝试施加必麻；伤害被拒、施麻被拒与成功分别反馈。
                    const dealt = hurt(current, victim, nuzzleId, power, { damage: damageSpec(nuzzleId, "nudge"), contact: true });
                    const applied = dealt ? CombatStatus.inflict(scope, victim, "paralysis", numbTicks) : false;
                    WorldFeedback.emit(scope, nuzzleScene, 1, contact,
                        { moment: "touch", target: String(victim.ref()),
                            sparks: dealt ? Math.round(10 + power * 0.6) : 6,
                            numbing: applied ? Math.max(6, Math.round(6 + arcs)) : 0,
                            arcs: arcs, scale: scale, intensity: intensity, dealt: dealt ? 1 : 0, paralysis: applied ? 1 : 0 }, 24);
                    WorldFeedback.text(scope, contact.plus(WorldCombat.point(0, 1.0, 0)),
                        applied ? nuzzleHitText : dealt ? nuzzleImmuneText : nuzzleResistText, [], 24);
                    scope.sound("minecraft:entity.cat.purr", contact, 14, "{}");
                    if (applied) sound(current, "cobblemon:move.thundershock.target");
                } else {
                    const body = scope.observe(self);
                    const here = body === null ? origin0 : body.position();
                    WorldFeedback.emit(scope, nuzzleScene, 1, here.plus(WorldCombat.point(0, 0.2, 0)),
                        { moment: "whiff", arcs: arcs, scale: scale }, 16);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 0.9, 0)), nuzzleWhiffText, [], 18);
                }
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction, index: number): void {
                if (finished) return;
                if (index >= steps) { conclude(current, null, origin0); return; }
                const body = current.world().observe(self);
                if (body === null) { conclude(current, null, origin0); return; }
                const step = Math.min(totalLunge / steps, totalLunge - travelled);
                if (!(step > 0.001)) { conclude(current, null, body.position()); return; }
                const swept = sweepStep(current, heading.scale(step), touch);
                travelled += swept.moved;
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && String(victim.key()) !== String(self.key())) {
                        conclude(current, current.world().friendly(victim) ? null : victim, hit.position());
                        return;
                    }
                }
                if (hit.blocked() || swept.moved < step - 0.001) { conclude(current, null, body.position()); return; }
                movementScenes.show(current, "lunge", body.position(),
                    { moment: "lunge", arcs: arcs, scale: scale, intensity: intensity });
                current.after(1, function (next: CombatAction) { advance(next, index + 1); });
            }

            movementScenes.show(action, "lunge", origin0, { moment: "lunge", arcs: arcs, scale: scale, intensity: intensity });
            advance(action, 0);
        }
    });
}
