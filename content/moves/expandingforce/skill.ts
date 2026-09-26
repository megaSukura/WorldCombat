/**
 * 广域战力 / expandingforce —— 注册与动作。
 *
 * 一幕蓄力（提交前 `windup` 按这一次真正的分支播在真正的位置），一幕发力（提交后在所选地面结算一次局部
 * 精神冲击，并在落点铺开精神场地）。若施法者此刻已站在一片自己铺的精神场地上，这一次改为「引爆」：吸收
 * 脚下这一片场地，以自身为原点炸开，命中范围内所有敌人（威力 ×1.5），并在自己脚下重新铺一片场地。
 *
 * 「站在自己的场地上」以实际事实判断，单元内共用同一函数（action 与 AI 都调用）：
 *   取施法者真实碰撞箱底（`boundsMin`，大型身体的中心偏高也不影响），要求落点水平距离在该场地半径内、
 *   与场地同层（`EXPANDINGFORCE_LAYER` 内）、且从场地中心到脚下有可见视线。只吸收被实际识别的这一片场地，
 *   不会循环吞掉楼上、墙后或重叠的其它场地。
 *
 * kind 为 point：选一块地面/空地，实体只是它的建议落点；方块遮挡与落点检查沿现有规则，不强制锁敌。
 */
namespace PokemonSkills {
    /** 同层判定：脚底与场地平面的最大高度差；比一层楼小，能容忍台阶，不会跨层吸收。 */
    export const EXPANDINGFORCE_LAYER = 1.5;

    /** 施法者真实脚底（碰撞箱底面的水平中心），不取偏高的身体中心。 */
    export function expandingforceFoot(body: CombatObservation): CombatPoint {
        var min = body.boundsMin(), max = body.boundsMax();
        return WorldCombat.point((min.x() + max.x()) / 2, min.y(), (min.z() + max.z()) / 2);
    }

    /** 脚下这一片被实际识别的精神场地：同层、水平在半径内、从场心可见；否则 null。 */
    export function expandingforceFieldAt(world: CombatWorld, foot: CombatPoint): WorldEffects.Area | null {
        var areas = WorldEffects.areas(world, EXPANDINGFORCE_IDENTITY);
        for (var i = 0; i < areas.length; i++) {
            var area = areas[i];
            var dx = area.position[0] - foot.x(), dz = area.position[2] - foot.z();
            if (Math.sqrt(dx * dx + dz * dz) > area.radius)
                continue;
            if (Math.abs(foot.y() - area.position[1]) > EXPANDINGFORCE_LAYER)
                continue;
            if (!world.clear(WorldCombat.point(area.position[0], area.position[1], area.position[2]), foot))
                continue;
            return area;
        }
        return null;
    }

    /** 这一次真正的分支与它的真实点/半径：强化在自身脚下用引爆半径，普通在贴地落点用场地半径。 */
    function expandingforceBranch(action: CombatAction): { empowered: boolean; point: CombatPoint; radius: number; area: WorldEffects.Area | null } {
        var sense = action.sense(), body = sense.observe(action.actor());
        if (body && body.grounded()) {
            var foot = expandingforceFoot(body), area = expandingforceFieldAt(sense, foot);
            if (area)
                return { empowered: true, point: foot, radius: p("expandingforce", "burst", action), area: area };
        }
        return { empowered: false, point: WorldGeometry.ground(sense, action.targetPosition()), radius: p("expandingforce", "fieldRadius", action), area: null };
    }

    /** 落点范围内的非友方各挨一次冲击；逐个按范围、遮挡（视线）与敌我规则结算，没有数量早退截断。 */
    function expandingforceHit(action: CombatAction, world: CombatWorld, point: CombatPoint, radius: number, power: number): number {
        var hits = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 2, above: 3 }), function (enemy: CombatActor, facts: CombatObservation) {
            if (!world.clear(point, facts.position()))
                return;
            if (hurt(action, enemy, "expandingforce", power))
                hits++;
        });
        return hits;
    }

    function expandingforcePoint(point: CombatPoint): number[] {
        return [point.x(), point.y(), point.z()];
    }

    function expandingforceStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor();
        var body = world.observe(actor);
        var plan = expandingforceBranch(action);
        var origin = plan.empowered && body ? expandingforceFoot(body) : action.origin();
        var radius = p("expandingforce", "fieldRadius", action), ticks = Math.round(p("expandingforce", "fieldTicks", action));
        var power = p("expandingforce", "power", action);
        sound(action, "cobblemon:move.psychic.actor");
        if (plan.empowered && plan.area) {
            power = power * p("expandingforce", "empower", action);
            // 只吸收被实际识别的这一片场地。
            world.operation(plan.area.id, "world_combat:dispel", "{}");
            var burst = p("expandingforce", "burst", action);
            expandingforceHit(action, world, origin, burst, power);
            world.sound("minecraft:block.beacon.activate", origin, 16, "{}");
            WorldFeedback.emit(world, EXPANDINGFORCE_SCENE, 1, origin,
                { moment: "detonate", intensity: 2, scale: burst / 3.2, bursts: 40, cover: burst, shock: burst * 0.08 }, 40);
            WorldEffects.field(world, EXPANDINGFORCE_FIELD + "/expandingforce", origin, radius, { owner: String(actor.ref()) }, ticks);
        } else {
            var point = plan.point;
            expandingforceHit(action, world, point, radius, power);
            WorldFeedback.emit(world, EXPANDINGFORCE_SCENE, 1, point,
                { moment: "wave", point: expandingforcePoint(point), intensity: 1.4, scale: radius / 3.0, bursts: 16, cover: radius, radius: radius }, 34);
            WorldEffects.field(world, EXPANDINGFORCE_FIELD + "/expandingforce", point, radius, { owner: String(actor.ref()) }, ticks);
        }
        done(action);
    }

    define({ id: "expandingforce", name: "广域战力",
        description: "把精神力量压进所选地面，在落点结算一次局部冲击并留下拖慢落地敌人的精神场地；站在自己铺的场地上再放时，改为吸收脚下的场地、以自身为原点炸开，命中周围所有敌人且威力提高，并在脚下重新铺场。",
        uses: ["范围压制", "场地经营"], kind: "point", range: 16, prepare: 10, active: 0, recover: 10, cooldown: 50, style: "psy",
        defaults: {}, fields: [],
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("expandingforce", "fieldRadius", pokemon) : 3.0, geometry: "area", style: "psy", label: "广域战力" };
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var plan = expandingforceBranch(action);
            action.present("world_combat:expandingforce:" + action.id(), EXPANDINGFORCE_SCENE, 1, plan.point,
                JSON.stringify({ moment: "windup", point: expandingforcePoint(plan.point), radius: plan.radius,
                    empowered: plan.empowered ? 1 : 0, scale: plan.radius / (plan.empowered ? 3.2 : 3.0) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            expandingforceStrike(action, done);
        }
    });
}
