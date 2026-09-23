/**
 * 致命针刺的动作：一记短促的突刺，命中后若目标倒下，施法者攻击暴涨。
 *
 * 幕：突刺（windup + execute，沿目标方向短距推进）→ 命中（sting）→ 击倒（rise，可选的第三幕）。
 * rise 只在这一次命中直接放倒目标时发生：提升公共能力等级、播放上升光环并浮字。
 */
namespace PokemonSkills {
    export function fellstingerRise(current: CombatAction, target: CombatActor): void {
        const world = current.world(), rise = Math.round(p(fellstingerId, "rise", current));
        NativeEffects.boost(world, current.actor(), "atk", rise);
        const caster = world.observe(current.actor()), point = caster ? caster.position() : current.origin();
        WorldFeedback.emit(world, fellstingerScene, 1, point, { moment: "rise", rise: rise, count: 18 + rise * 8 }, 34);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "world_combat.move.fellstinger.text.rise", [rise], 40);
        world.sound("minecraft:entity.ravager.roar", point, 14, "{}");
    }

    export function fellstingerLunge(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        const direction = aim(action), length = p(fellstingerId, "distance", action);
        let travelled = 0;
        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const delta = direction.scale(Math.min(p(fellstingerId, "speed", current), length - travelled));
            const swept = sweepStep(current, delta, p(fellstingerId, "collisionRadius", current)), hit = swept.hit;
            if (hit.hitEntity()) {
                const target = hit.target(), power = p(fellstingerId, "power", current);
                const landed = target && !scope.friendly(target) ? impact(current, hit, fellstingerId, power) : false;
                const point = hit.position();
                WorldFeedback.emit(scope, fellstingerScene, 1, point, { moment: "sting",
                    target: target ? String(target.ref()) : "", count: 14 + Math.round(power * 0.4) }, 26);
                scope.sound("minecraft:item.trident.hit", point, 12, "{}");
                if (landed && target && fellstingerDefeated(scope, target)) fellstingerRise(current, target);
                done(current); return;
            }
            const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
            travelled += moved;
            if (hit.blocked() || moved < p(fellstingerId, "minimumMove", current) || travelled >= length) { done(current); return; }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: fellstingerId,
        name: "Fell Stinger",
        description: "一记短促的突刺；若以此招击倒目标，自身攻击大幅提高。",
        uses: ["残血收尾"],
        kind: "enemy",
        range: 4,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 45,
        style: "stab",
        defaults: {},
        fields: [],
        windup: function (action, config, prepare) {
            action.present(fellstingerId + ":thrust", fellstingerScene, 1, action.origin(), JSON.stringify({ moment: "thrust" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            sound(action, "minecraft:item.trident.throw");
            fellstingerLunge(action, move, done);
        },
        indicator: function () { return { radius: 0.35, geometry: "area", style: "stab", label: "Fell Stinger" }; }
    });
}
