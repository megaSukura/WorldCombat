/**
 * 追打的动作：贴地扑向目标，命中时按目标是否背身决定威力。
 *
 * 幕：起手（windup，低身蓄势）→ 扑击（execute，沿目标方向逐刻推进）→ 命中（strike 或 catch）。
 * 目标在命中一刻正在远离时，伤害翻倍、画面换成更密的 catch 碎片并浮字。
 */
namespace PokemonSkills {
    export function pursuitPounce(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        const direction = aim(action), length = p(pursuitId, "distance", action);
        let travelled = 0;
        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const delta = direction.scale(Math.min(p(pursuitId, "speed", current), length - travelled));
            const hit = current.trace(origin, origin.plus(delta.scale(p(pursuitId, "traceAhead", current))),
                p(pursuitId, "collisionRadius", current));
            if (hit.hitEntity()) {
                const target = hit.target();
                let power = p(pursuitId, "power", current), doubled = false;
                if (target && pursuitRetreating(scope, current.actor(), target)) { power *= 2; doubled = true; }
                if (target && !scope.friendly(target)) impact(current, hit, pursuitId, power);
                const point = hit.position();
                WorldFeedback.emit(scope, pursuitScene, 1, point, { moment: doubled ? "catch" : "strike",
                    target: target ? String(target.ref()) : "", power: power, doubled: doubled ? 1 : 0,
                    count: 16 + Math.round(power * 0.4) }, 30);
                scope.sound("minecraft:entity.wind_charge.wind_burst", point, 12, "{}");
                if (target) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                    doubled ? "world_combat.move.pursuit.text.catch" : "world_combat.move.pursuit.text.hit", [], 30);
                done(current); return;
            }
            const moved = scope.displace(current.actor(), delta);
            travelled += moved;
            if (hit.blocked() || moved < p(pursuitId, "minimumMove", current) || travelled >= length) { done(current); return; }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: pursuitId,
        name: "Pursuit",
        description: "扑向正在拉开距离的目标；命中时若目标背身远离，威力翻倍。",
        uses: ["追击近战"],
        kind: "enemy",
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
