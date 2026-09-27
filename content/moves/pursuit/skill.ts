/**
 * 追打的动作：贴地扑向目标，命中时按目标是否正在拉开距离决定威力。
 *
 * 幕：起手（windup，低身蓄势，尘与速度线）→ 扑击（execute，沿提交时锁定的方向逐刻推进，每刻发真实子段）→
 *     命中（strike 普通一扑／catch 追逃加成＋接触爪痕）→ 阻挡（blocked 碰到身体但没造成伤害）→ 空扑（miss）。
 * 选取为 aim：可瞄方向/点、也可空扑；方向提交时锁定，撞墙或撞到第一个实体就停，不追踪转弯。
 * 目标在命中一刻相对施法者朝远离方向移动时威力翻倍（pursuitRetreating）；只有这一下真的结算成功，
 * 才出现追击强调；碰到友方或被原生拒绝时只报阻挡，不冒充命中。
 */
namespace PokemonSkills {
    export function pursuitPounce(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        // 贴地扑：把瞄准方向压平到水平面，别让瞄准体型更矮的目标时把扑击带进地面。
        const aimed = aim(action);
        const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
        const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const length = p(pursuitId, "distance", action);
        const scenes = WorldFeedback.actionScenes(pursuitScene);
        let travelled = 0, struck = false;

        /** 收束本动作的表现：扑击子段随动作结束；起手 lunge 也在这里立即停发，不延续到后摇。 */
        function stopPhases(current: CombatAction): void {
            scenes.stop(current);
            current.present(pursuitId + ":lunge", pursuitScene, 1, current.origin(),
                JSON.stringify({ moment: "lunge", lifecycle: { reason: "settled", tick: current.sense().tick() } }));
        }

        function finish(current: CombatAction, at: CombatPoint): void {
            stopPhases(current);
            if (!struck) {
                const scope = current.world();
                WorldFeedback.emit(scope, pursuitScene, 1, at, { moment: "miss" }, 18);
                scope.sound("minecraft:entity.player.attack.nodamage", at, 10, "{}");
            }
            done(current);
        }

        function advance(current: CombatAction): void {
            const scope = current.world();
            const body = scope.observe(current.actor());
            const from = body ? body.position() : current.origin();
            const delta = direction.scale(Math.min(p(pursuitId, "speed", current), length - travelled));
            const swept = sweepStep(current, delta, p(pursuitId, "collisionRadius", current));
            const after = scope.observe(current.actor());
            const to = after ? after.position() : from;
            const hit = swept.hit;
            if (hit.hitEntity()) {
                const target = hit.target();
                const targetBody = target ? scope.observe(target) : null;
                const scale = targetBody ? Math.max(0.7, Math.min(2.0, (targetBody.width() + targetBody.height()) / 2.3)) : 1;
                let power = p(pursuitId, "power", current), doubled = false, landed = false;
                if (target && pursuitRetreating(scope, current.actor(), target)) { power *= 2; doubled = true; }
                if (target && !scope.friendly(target)) landed = impact(current, hit, pursuitId, power);
                const point = hit.position();
                if (landed) {
                    struck = true;
                    const count = 16 + Math.round(power * 0.4);
                    if (doubled) {
                        WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: "catch", target: String(target!.ref()),
                            count: count, scale: scale }, 32);
                        // 真实接触爪痕：固定数量的刮痕按实际冲刺方向摆在接触点，不绕到背后、不暗示抓取。
                        WorldFeedback.emit(scope, pursuitMarkScene, 1, point, { moment: "marks",
                            at: [point.x(), point.y(), point.z()], direction: [direction.x(), 0, direction.z()],
                            count: Math.max(2, Math.round(2 + power * 0.02)), scale: scale, start: scope.tick() }, 20);
                    } else {
                        WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: "strike", target: String(target!.ref()),
                            count: count, scale: scale }, 26);
                    }
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                        doubled ? "world_combat.move.pursuit.text.catch" : "world_combat.move.pursuit.text.hit", [], 30);
                    scope.sound("minecraft:entity.wind_charge.wind_burst", point, 12, "{}");
                } else {
                    // 友方或原生拒绝：真的碰到了身体，但这一扑没有造成伤害，只收束，不冒充命中。
                    WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: "blocked", scale: scale }, 20);
                    scope.sound("minecraft:entity.player.attack.nodamage", point, 10, "{}");
                }
                finish(current, point); return;
            }
            const moved = swept.moved;
            travelled += moved;
            // 逐刻发当前真实冲刺子段：判定与表现共用身体真实的先后端点。
            if (to.minus(from).length() > 0.02) {
                scenes.show(current, "dash", from, { moment: "dash",
                    path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                    direction: [direction.x(), 0, direction.z()] });
            }
            if (hit.blocked() || moved < p(pursuitId, "minimumMove", current) || travelled >= length) { finish(current, to); return; }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: pursuitId,
        name: "Pursuit",
        description: "朝选定方向扑出；命中时若目标正朝远离你的方向移动，威力翻倍。只对撞上的第一个敌人结算伤害，撞墙或撞到友方就停下。",
        uses: ["追击近战"],
        kind: "aim",
        range: 6,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 40,
        style: "dash",
        defaults: {},
        fields: [],
        windup: function (action, config, prepare) {
            action.present(pursuitId + ":lunge", pursuitScene, 1, action.origin(), JSON.stringify({ moment: "lunge", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            sound(action, "minecraft:entity.wind_charge.throw");
            pursuitPounce(action, move, done);
        },
        indicator: function () { return { radius: 0.4, geometry: "area", style: "dash", label: "Pursuit" }; }
    });
}
