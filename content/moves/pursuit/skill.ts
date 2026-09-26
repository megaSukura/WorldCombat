/**
 * 追打的动作：贴地扑向目标，命中时按目标是否背身决定威力。
 *
 * 幕：起手（windup，低身蓄势，普通前扑短痕）→ 扑击（execute，沿提交时锁定的方向逐刻推进）→
 *     命中（strike 普通一扑／catch 追逃加成）→ 空扑（miss）。
 * 选取为 aim：可瞄方向/点、也可空扑；方向提交时锁定，撞墙或撞到第一个实体就停，不追踪转弯。
 * 目标在命中一刻正在背身远离时威力翻倍（pursuitRetreating）；只有这一下真的结算成功，才出现向后抓住的双痕。
 */
namespace PokemonSkills {
    /** 追逃加成命中时留在目标背后的双痕顶点：从接触点朝施法者方向拉出两道平行抓痕，连成一个 U。 */
    function pursuitGrabPath(scope: CombatWorld, actor: CombatActor, point: CombatPoint, scale: number): number[][] {
        const self = scope.observe(actor);
        let back = self ? self.position().minus(point) : WorldCombat.point(0, 0, 1);
        back = WorldCombat.point(back.x(), 0, back.z());
        if (back.length() < 0.05) back = WorldCombat.point(0, 0, 1);
        back = back.unit();
        const side = WorldCombat.point(-back.z(), 0, back.x());
        const length = 0.7 * scale, gap = 0.22 * scale, height = point.y() + 0.5 * scale;
        function vertex(sideways: number, along: number): number[] {
            return [point.x() + side.x() * sideways + back.x() * along, height, point.z() + side.z() * sideways + back.z() * along];
        }
        return [vertex(gap, 0), vertex(gap, length), vertex(-gap, length), vertex(-gap, 0)];
    }

    export function pursuitPounce(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        // 贴地扑：把瞄准方向压平到水平面，别让瞄准体型更矮的目标时把扑击带进地面。
        const aimed = aim(action);
        const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
        const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const length = p(pursuitId, "distance", action);
        let travelled = 0, struck = false;
        function finish(current: CombatAction, at: CombatPoint): void {
            if (!struck) {
                const scope = current.world();
                WorldFeedback.emit(scope, pursuitScene, 1, at, { moment: "miss" }, 18);
                scope.sound("minecraft:entity.player.attack.nodamage", at, 10, "{}");
            }
            done(current);
        }
        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const delta = direction.scale(Math.min(p(pursuitId, "speed", current), length - travelled));
            const swept = sweepStep(current, delta, p(pursuitId, "collisionRadius", current));
            const hit = swept.hit;
            if (hit.hitEntity()) {
                struck = true;
                const target = hit.target();
                const body = target ? scope.observe(target) : null;
                const scale = body ? Math.max(0.7, Math.min(2.0, (body.width() + body.height()) / 2.3)) : 1;
                let power = p(pursuitId, "power", current), doubled = false, landed = false;
                if (target && pursuitRetreating(scope, current.actor(), target)) { power *= 2; doubled = true; }
                if (target && !scope.friendly(target)) landed = impact(current, hit, pursuitId, power);
                const point = hit.position(), grabbed = doubled && landed;
                if (grabbed) {
                    WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: "catch", target: String(target!.ref()),
                        count: 16 + Math.round(power * 0.4),
                        path: pursuitGrabPath(scope, current.actor(), point, scale) }, 32);
                } else {
                    WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: "strike", target: target ? String(target.ref()) : "",
                        count: 16 + Math.round(power * 0.4), scale: scale }, 26);
                }
                scope.sound("minecraft:entity.wind_charge.wind_burst", point, 12, "{}");
                if (target) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                    grabbed ? "world_combat.move.pursuit.text.catch" : "world_combat.move.pursuit.text.hit", [], 30);
                finish(current, point); return;
            }
            const moved = swept.moved;
            travelled += moved;
            if (hit.blocked() || moved < p(pursuitId, "minimumMove", current) || travelled >= length) { finish(current, origin); return; }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: pursuitId,
        name: "Pursuit",
        description: "朝选定方向扑出；命中时若目标背身远离，威力翻倍。只对撞上的第一个敌人结算伤害，撞墙或撞到友方就停下。",
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
            action.present(pursuitId + ":lunge", pursuitScene, 1, action.origin(), JSON.stringify({ moment: "lunge" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            sound(action, "minecraft:entity.wind_charge.throw");
            pursuitPounce(action, move, done);
        },
        indicator: function () { return { radius: 0.4, geometry: "area", style: "dash", label: "Pursuit" }; }
    });
}
