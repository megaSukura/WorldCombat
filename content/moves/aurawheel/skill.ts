/**
 * 气场轮的动作：把颊囊能量聚成一只轮子贴地滚出，命中后自身提速。
 *
 * 幕：蓄力（windup，轮子在脚边成形）→ 滚动（execute，沿目标方向逐刻推进）→ 命中（strike）→ 提速（boost）。
 * 提速同原生的 100% 自身效果，无论是否命中都会发生；属性与颜色按施法者形态在出招时确定。
 */
namespace PokemonSkills {
    export function aurawheelHaste(current: CombatAction): void {
        const world = current.world(), pokemon = CobblemonCombat.pokemon(current.actor());
        const color = aurawheelColorOf(pokemon), stages = Math.max(1, Math.round(p(aurawheelId, "haste", current)));
        NativeEffects.boost(world, current.actor(), "spe", stages);
        const caster = world.observe(current.actor()), point = caster ? caster.position() : current.origin();
        WorldFeedback.emit(world, aurawheelScene, 1, point, { moment: "boost", tint: color, stages: stages }, 30);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "world_combat.move.aurawheel.text.haste", [stages], 36);
        world.sound("minecraft:block.beacon.power_select", point, 14, "{}");
    }

    export function aurawheelRoll(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        const direction = aim(action), length = p(aurawheelId, "distance", action);
        const pokemon = CobblemonCombat.pokemon(action.actor());
        const color = aurawheelColorOf(pokemon);
        let travelled = 0;
        function finish(current: CombatAction): void {
            aurawheelHaste(current);
            done(current);
        }
        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const delta = direction.scale(Math.min(p(aurawheelId, "speed", current), length - travelled));
            const swept = sweepStep(current, delta, p(aurawheelId, "collisionRadius", current)), hit = swept.hit;
            if (hit.hitEntity()) {
                const target = hit.target(), power = p(aurawheelId, "power", current);
                if (target && !scope.friendly(target)) impact(current, hit, aurawheelId, power);
                const point = hit.position();
                WorldFeedback.emit(scope, aurawheelScene, 1, point, { moment: "strike", tint: color,
                    target: target ? String(target.ref()) : "", count: 20 + Math.round(power * 0.4) }, 28);
                scope.sound("minecraft:entity.ravager.attack", point, 13, "{}");
                finish(current); return;
            }
            const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
            travelled += moved;
            if (hit.blocked() || moved < p(aurawheelId, "minimumMove", current) || travelled >= length) { finish(current); return; }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: aurawheelId,
        name: "Aura Wheel",
        description: "把颊囊里的能量滚成轮子贴地撞向目标；使用后自身速度提高，属性随样子在电与恶之间变化。",
        uses: ["翻滚重击"],
        kind: "enemy",
        range: 9,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 70,
        style: "roll",
        defaults: {},
        fields: [],
        windup: function (action, config, prepare) {
            const color = aurawheelColorOf(CobblemonCombat.pokemon(action.actor()));
            action.present(aurawheelId + ":scene", aurawheelScene, 1, action.origin(), JSON.stringify({ moment: "spin", tint: color }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const color = aurawheelColorOf(CobblemonCombat.pokemon(action.actor()));
            action.present(aurawheelId + ":scene", aurawheelScene, 1, action.origin(), JSON.stringify({ moment: "roll", tint: color }));
            sound(action, "minecraft:entity.ravager.step");
            aurawheelRoll(action, move, done);
        },
        indicator: function () { return { radius: 0.5, geometry: "area", style: "roll", label: "Aura Wheel" }; }
    });
}
