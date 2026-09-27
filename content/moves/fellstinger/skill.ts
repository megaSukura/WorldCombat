/**
 * 致命针刺的动作：一记贴地短突刺，命中后若这一击真的放倒目标，施法者攻击按实际提交的级数上涨。
 *
 * 幕：起手（windup，身前聚光）→ 突刺（execute，沿水平瞄准方向推进，针是有两端点的真实前伸线）→
 *     命中（sting，仅伤害回执成立才播）／落空（retract，收针）→ 击倒（rise，仅确认本次死亡后）。
 *
 * 几何：突刺方向取水平分量（WorldGeometry.flatUnit），扑矮体不会把针扎进地面；针的两端点是当刻身体中心与
 *   身前 traceAhead 处，随真实移动逐刻更新，静止不发假尾迹。
 * 击倒确认：命中前抓住目标的原生实体，命中后读 `isAlive()`——真的因这一击倒下才提升，目标被卸载/离场不算，
 *   避免把任意消失当成击杀。提升读共享 NativeEffects.boost 的实际回执：到顶或免疫时不再谎报级数。
 */
namespace PokemonSkills {
    const fellstingerRiseText = "world_combat.move.fellstinger.text.rise";

    /** 贴地前伸方向：取瞄准的水平分量，竖直/零输入时回退动作方向。 */
    function fellstingerAim(action: CombatAction): CombatPoint {
        return WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction());
    }

    /** 命中前抓住的原生实体；本次真被这一击打死才返回 true（卸载/离场时仍存活，不算）。 */
    export function fellstingerDefeated(native: any): boolean {
        if (native === null || native === undefined || typeof native.isAlive !== "function") return false;
        try { return !native.isAlive(); } catch (error) { return false; }
    }

    /** 击倒后的攻击提升：回到实际提交的增量，到顶/免疫时不发假强化。 */
    export function fellstingerRise(world: CombatWorld, actor: CombatActor, requested: number): void {
        const delta = NativeEffects.boost(world, actor, "atk", requested);
        if (delta === 0) return;
        const caster = world.observe(actor);
        if (caster === null) return;
        const point = caster.position();
        WorldFeedback.emit(world, fellstingerScene, 1, point, { moment: "rise", rise: delta, count: 18 + Math.abs(delta) * 8 }, 34);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), fellstingerRiseText, [Math.abs(delta)], 40);
        world.sound("minecraft:entity.ravager.roar", point, 14, "{}");
    }

    function fellstingerSting(world: CombatWorld, point: CombatPoint, power: number): void {
        WorldFeedback.emit(world, fellstingerScene, 1, point, { moment: "sting", count: 14 + Math.round(power * 0.4) }, 26);
    }

    /** 落空/被拒：收针，不播成功刺入。 */
    function fellstingerRetract(world: CombatWorld, point: CombatPoint, scale: number): void {
        WorldFeedback.emit(world, fellstingerScene, 1, point, { moment: "retract", scale: scale }, 18);
    }

    /** 当刻真实针：两端点为身体中心与身前 traceAhead 处；随实际移动逐刻更新。 */
    function fellstingerNeedle(scenes: WorldFeedback.ActionScenes, current: CombatAction, direction: CombatPoint, scale: number): void {
        const scope = current.world(), body = scope.observe(current.actor());
        const from = body === null ? current.origin() : body.position();
        const tip = from.plus(direction.scale(p(fellstingerId, "traceAhead", current)));
        scenes.show(current, "thrust", from, {
            moment: "thrust", target: String(current.actor().ref()),
            path: [String(current.actor().ref()), [tip.x(), tip.y(), tip.z()]], scale: scale
        });
    }

    export function fellstingerLunge(action: CombatAction, move: CombatPokemonMove, scenes: WorldFeedback.ActionScenes, done: (current: CombatAction) => void): void {
        const direction = fellstingerAim(action), length = p(fellstingerId, "distance", action);
        const radius = p(fellstingerId, "collisionRadius", action);
        const body = action.world().observe(action.actor());
        const scale = body === null ? 1 : Math.max(0.5, Math.min(1.6, (body.width() + body.height()) / 2.3));
        let travelled = 0;
        function advance(current: CombatAction): void {
            const scope = current.world(), origin = current.origin();
            const delta = direction.scale(Math.min(p(fellstingerId, "speed", current), length - travelled));
            const swept = sweepStep(current, delta, radius), hit = swept.hit;
            if (hit.hitEntity()) {
                const target = hit.target(), power = p(fellstingerId, "power", current);
                const native = target !== null && scope.valid(target) ? scope.nativeEntity(target) : null;
                const landed = target && !scope.friendly(target) ? impact(current, hit, fellstingerId, power) : false;
                const point = hit.position();
                if (landed && target) {
                    fellstingerSting(scope, point, power);
                    scope.sound("minecraft:item.trident.hit", point, 12, "{}");
                    if (fellstingerDefeated(native)) fellstingerRise(scope, current.actor(), Math.round(p(fellstingerId, "rise", current)));
                } else {
                    fellstingerRetract(scope, point, scale);
                }
                scenes.finish(current, done);
                return;
            }
            const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
            travelled += moved;
            if (hit.blocked() || moved < p(fellstingerId, "minimumMove", current) || travelled >= length) {
                fellstingerRetract(scope, hit.position(), scale);
                scenes.finish(current, done);
                return;
            }
            fellstingerNeedle(scenes, current, direction, scale);
            current.after(1, advance);
        }
        fellstingerNeedle(scenes, action, direction, scale);
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
            action.present(fellstingerId + ":windup", fellstingerScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(fellstingerScene);
            sound(action, "minecraft:item.trident.throw");
            fellstingerLunge(action, move, scenes, done);
        },
        indicator: function () { return { radius: 0.35, geometry: "area", style: "stab", label: "Fell Stinger" }; }
    });
}
