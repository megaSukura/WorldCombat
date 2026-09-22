/**
 * 广域战力 / expandingforce —— 注册与动作。
 *
 * 一幕蓄力（提交前 `windup` 在身前收拢精神环），一幕落下（提交后在目标脚下结算一次精神冲击，
 * 并在落点铺开精神场地）。若施法者此刻已站在一片精神场地上，这一次改为「引爆」：吸收脚下的场地，
 * 以自身为中心炸开，命中范围内所有敌人（威力 ×1.5），随后在落点重新铺一片场地。
 * 场地是租借效果，到期自己结束；场上留下的脚印让后来的单位也能认出这块地。
 */
namespace PokemonSkills {
    const EXPANDINGFORCE_SCENE = "world_combat:move_expandingforce";

    function expandingforceArea(world: CombatWorld, body: CombatObservation): WorldEffects.Area | null {
        var areas = WorldEffects.areas(world, EXPANDINGFORCE_IDENTITY), point = body.position();
        for (var i = 0; i < areas.length; i++) {
            var dx = areas[i].position[0] - point.x(), dz = areas[i].position[2] - point.z();
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius)
                return areas[i];
        }
        return null;
    }

    function expandingforceConsume(world: CombatWorld, point: CombatPoint): void {
        var areas = WorldEffects.areas(world, EXPANDINGFORCE_IDENTITY);
        for (var i = 0; i < areas.length; i++) {
            var dx = areas[i].position[0] - point.x(), dz = areas[i].position[2] - point.z();
            if (Math.sqrt(dx * dx + dz * dz) <= areas[i].radius)
                world.operation(areas[i].id, "world_combat:dispel", "{}");
        }
    }

    function expandingforceStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), target = action.target();
        var selfBody = world.observe(actor), power = p("expandingforce", "power", action);
        var origin = selfBody ? selfBody.position() : action.origin();
        var targetBody = target && world.valid(target) ? world.observe(target) : null;
        var impactPoint = targetBody ? targetBody.position() : action.targetPosition();
        sound(action, "cobblemon:move.psychic.actor");
        var empowered = !!selfBody && selfBody.grounded() && !!expandingforceArea(world, selfBody);
        if (empowered) {
            power = power * p("expandingforce", "empower", action);
            expandingforceConsume(world, origin);
            var burst = p("expandingforce", "burst", action);
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(origin, 0, burst, { below: 2, above: 3 }), function (enemy: CombatActor) {
                hurt(world, enemy, "expandingforce", power);
            });
            world.sound("minecraft:block.beacon.activate", origin, 16, "{}");
            WorldFeedback.emit(world, EXPANDINGFORCE_SCENE, 1, origin,
                { moment: "detonate", intensity: 2, scale: burst / 3.2, bursts: 40, cover: burst, shock: burst * 0.08 }, 40);
        } else if (target) {
            hurt(world, target, "expandingforce", power);
            WorldFeedback.emit(world, EXPANDINGFORCE_SCENE, 1, impactPoint,
                { moment: "wave", target: String(target.ref()), intensity: 1.4, scale: 1, bursts: 16 }, 34);
        }
        var radius = p("expandingforce", "fieldRadius", action), ticks = Math.round(p("expandingforce", "fieldTicks", action));
        WorldEffects.field(world, EXPANDINGFORCE_FIELD + "/expandingforce", impactPoint, radius, { owner: String(actor.ref()) }, ticks);
        WorldFeedback.emit(world, EXPANDINGFORCE_SCENE, 1, impactPoint,
            { moment: "field", intensity: 1, scale: radius / 3.0, radius: radius, ticks: ticks }, ticks);
        done(action);
    }

    define({ id: "expandingforce", name: "广域战力",
        description: "把精神力量压进目标脚下，留下精神场地；站在场地上再放时，波从自身炸开，命中所有贴身敌人且威力提高。",
        uses: ["范围压制", "场地经营"], kind: "enemy", range: 16, prepare: 10, active: 0, recover: 10, cooldown: 50, style: "psy",
        defaults: {}, fields: [],
        indicator: function () { return { radius: 16, geometry: "area", style: "psy", label: "广域战力" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            action.present("world_combat:expandingforce:" + action.id(), EXPANDINGFORCE_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: 1 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            expandingforceStrike(action, done);
        }
    });
}
