/**
 * 气场轮的动作：把颊囊能量聚成一只轮子贴地滚出，命中后自身提速。
 *
 * 幕：蓄力（windup，轮子在脚边成形）→ 滚动（execute，沿玩家选定的落点方向逐刻推进）→ 命中（strike）→
 *     停轮提速（boost，轮子散成脚边速度纹）。
 * 选取为 motion：12 格内选一个落点（不必是敌人），可空滚换位；首碰即停（墙或第一个实体），墙止步。
 * 提速同原生的 100% 自身效果，无论是否命中都会发生；属性与颜色按施法者形态在出招时确定。
 * 转速由实际每刻位移驱动（`data.spin`），轮形按滚动方向（轴向 `data.direction`）竖起。
 */
namespace PokemonSkills {
    export function aurawheelHaste(current: CombatAction): void {
        const world = current.world(), pokemon = CobblemonCombat.pokemon(current.actor());
        const tint = aurawheelColorOf(pokemon), stages = Math.max(1, Math.round(p(aurawheelId, "haste", current)));
        NativeEffects.boost(world, current.actor(), "spe", stages);
        const caster = world.observe(current.actor()), point = caster ? caster.position() : current.origin();
        WorldFeedback.emit(world, aurawheelScene, 1, point, { moment: "boost", tint: tint }, 30);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "world_combat.move.aurawheel.text.haste", [stages], 36);
        world.sound("minecraft:block.beacon.power_select", point, 14, "{}");
    }

    export function aurawheelRoll(action: CombatAction, move: CombatPokemonMove, done: (current: CombatAction) => void): void {
        const actor = action.actor();
        const pokemon = CobblemonCombat.pokemon(actor);
        const tint = aurawheelColorOf(pokemon);
        const offset = action.targetPosition().minus(action.origin());
        const reach = p(aurawheelId, "distance", action);
        const step = p(aurawheelId, "speed", action);
        const radius = p(aurawheelId, "collisionRadius", action);
        const minimum = p(aurawheelId, "minimumMove", action);
        const power = p(aurawheelId, "power", action);
        const flat = WorldCombat.point(offset.x(), 0, offset.z());
        const direction = flat.length() < 0.05 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const length = Math.min(reach, offset.length());
        // 轮轴：水平面内垂直于滚动方向；表现按它把轮子竖起来（orient: direction）。
        const axle = WorldCombat.point(-direction.z(), 0, direction.x());
        const scale = Math.max(0.7, Math.min(2.0, radius / 0.45));
        const intensity = Math.max(0.6, Math.min(2.2, power / 110));
        const movementScenes = WorldFeedback.actionScenes(aurawheelScene);
        let travelled = 0, settled = false;

        function finish(current: CombatAction): void {
            if (settled) return;
            settled = true;
            aurawheelHaste(current);
            movementScenes.finish(current, done);
        }

        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const stepDistance = Math.min(step, Math.max(0, length - travelled));
            if (stepDistance <= 0.001) { finish(current); return; }
            const swept = sweepStep(current, direction.scale(stepDistance), radius), hit = swept.hit;
            if (hit.hitEntity()) {
                const target = hit.target(), point = hit.position();
                if (target && !scope.friendly(target)) impact(current, hit, aurawheelId, power);
                WorldFeedback.emit(scope, aurawheelScene, 1, point, { moment: "strike", tint: tint, scale: scale,
                    count: 20 + Math.round(power * 0.4) }, 28);
                scope.sound("minecraft:entity.ravager.attack", point, 13, "{}");
                movementScenes.stop(current, "roll");
                finish(current); return;
            }
            const moved = swept.moved;
            travelled += moved;
            // 实际位移驱动转速：每 tick 用真实位移更新同一实例的 spin（下一批粒子按新转速转）。
            const spin = Math.max(20, Math.min(90, 24 + moved * 40));
            movementScenes.show(current, "roll", origin, { moment: "roll", direction: [axle.x(), 0, axle.z()],
                spin: spin, scale: scale, intensity: intensity });
            if (hit.blocked() || moved < minimum || travelled >= length) { finish(current); return; }
            current.after(1, advance);
        }

        sound(action, "minecraft:entity.ravager.step");
        movementScenes.show(action, "roll", action.origin(), { moment: "roll", direction: [axle.x(), 0, axle.z()],
            spin: 30, scale: scale, intensity: intensity });
        advance(action);
    }

    define({
        freeMovement: true,
        id: aurawheelId,
        name: "Aura Wheel",
        description: "在 12 格内选一个落点，把颊囊里的能量滚成轮子贴地滚过去；首碰即停，撞到敌人则造成伤害，无论是否命中都会使自身速度提高一级。属性随样子在电与恶之间变化。",
        uses: ["朝一个方向贴地滚过去换位", "滚撞路径上的敌人", "出招后提速，趁势再接"],
        kind: "motion",
        range: 12,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 70,
        style: "roll",
        defaults: {},
        fields: [],
        windup: function (action, config, prepare) {
            const tint = aurawheelColorOf(CobblemonCombat.pokemon(action.actor()));
            action.present(aurawheelId + ":scene", aurawheelScene, 1, action.origin(), JSON.stringify({ moment: "spin", tint: tint }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            aurawheelRoll(action, move, done);
        },
        indicator: function () { return { radius: 0.5, geometry: "area", style: "roll", label: "Aura Wheel" }; }
    });

    WorldCombat.preview("world_combat:aurawheel", JSON.stringify({ motion: "horizontal" }));
}
