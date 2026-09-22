/**
 * 流星突击 / meteorassault 的出手方式。
 *
 * 核心念头：抡起那根粗壮的东西，在同一条大弧线上连续几下大力横扫，把扇形里的对手一下一下砸实；
 * 挥得太猛，收招之后自己也被晃得晕头转向——一段最长的力竭窗口，这是这一招的签名代价。
 *
 * 三幕：
 *   起：把茎举过头顶（windup）。
 *   击：提交后按 `interval` 逐段重挥；每段以施法者为顶点、朝当前目标方向扫出一个扇形，
 *       命中扇形内所有敌人各结算一次接触伤害，并播放这一段自己的挥弧（swing）。
 *   收：挥完最后一段，挂上 `world_combat:status/mustrecharge` 晃晕状态（本单元 startup 效果），
 *       播放头顶转圈的晕眩；力竭期间由 mob_effect_tick 维持低密度的晕圈。
 *
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零实现。
 */
namespace PokemonSkills {
    const meteorassaultScene = "world_combat:move_meteorassault";
    const meteorassaultDazeEffect = "world_combat:meteorassault_daze";
    const meteorassaultDazeText = "world_combat.move.meteorassault.text.daze";
    const meteorassaultSwingText = "world_combat.move.meteorassault.text.swing";

    define({
        id: "meteorassault",
        name: "Meteor Assault",
        description: "The user attacks wildly with its thick leek. The user can't move on the next turn, because the force of this move makes it stagger.",
        uses: ["近距离连续重挥", "一次扫到挤在面前的几个对手", "用最长的力竭换最高的爆发"],
        kind: "enemy",
        range: 3.6,
        maxRange: 5,
        prepare: 8,
        active: 80,
        recover: 10,
        cooldown: 90,
        style: "swing",
        stationary: true,
        defaults: { swings: 3, ai: { minHealth: 0.4, preferMultiple: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteorassault", "reach", pokemon), geometry: "cone", style: "swing", label: "流星突击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["meteorassault"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var exhaust = Math.round(p("meteorassault", "exhaust", context));
            return {
                prepare: Math.round(p("meteorassault", "charge", context)),
                recover: 10,
                cooldown: exhaust + 14,
                range: p("meteorassault", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_meteorassault:windup", meteorassaultScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const swings = Math.max(2, Math.min(5, Math.round(p("meteorassault", "swings", action))));
            const interval = Math.max(4, Math.round(p("meteorassault", "interval", action)));
            const arc = p("meteorassault", "arc", action);
            const reach = p("meteorassault", "reach", action);
            const smash = p("meteorassault", "smash", action);
            const exhaustTicks = Math.max(1, Math.round(p("meteorassault", "exhaust", action)));
            const scale = reach / 3.0;
            let index = 0;

            sound(action, "cobblemon:move.closecombat.actor_1");

            function daze(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), meteorassaultDazeEffect, exhaustTicks, 0);
                WorldEffects.apply(scope, current.actor(), "rooted", {}, exhaustTicks);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, meteorassaultScene, 1, body.position(), { moment: "daze", scale: scale,
                        seconds: exhaustTicks / 20, count: Math.round(8 + (exhaustTicks / 20) * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)), meteorassaultDazeText,
                        [Math.round(exhaustTicks / 20 * 10) / 10], 30);
                }
                sound(current, "minecraft:entity.ravager.stunned");
            }

            function swing(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const direction = aim(current);
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, arc, { below: 1, above: 3 }), function (enemy: CombatActor) {
                    if (hurt(current, enemy, "meteorassault", smash, { damage: damageSpec("meteorassault", "smash"), contact: true })) hits++;
                });
                const at = origin.plus(direction.scale(reach * 0.5));
                WorldFeedback.emit(scope, meteorassaultScene, 1, at, { moment: "swing", scale: scale, swing: index + 1,
                    count: swings, hits: hits, reach: reach, arc: arc, half: arc / 2,
                    intensity: Math.max(0.6, Math.min(2.4, smash / 52)),
                    direction: [direction.x(), direction.y(), direction.z()] }, 24);
                sound(current, index % 2 === 0 ? "minecraft:entity.player.attack.strong" : "minecraft:entity.player.attack.sweep");
                if (hits > 0) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), meteorassaultSwingText, [index + 1, hits], 24);
                    sound(current, "cobblemon:move.closecombat.target");
                }
                index++;
                if (index >= swings) {
                    daze(current);
                    done(current);
                    return;
                }
                current.after(interval, swing);
            }

            const target = action.target();
            if (target !== null && world.valid(target)) {
                const targetBody = world.observe(target);
                if (targetBody !== null) action.face(targetBody.position(), 20, 20);
            }
            swing(action);
        }
    });

    // 晃晕的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:meteorassault/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    WorldCombat.on("world_combat:move_meteorassault/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meteorassaultDazeEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 晃晕期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_meteorassault/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), meteorassaultDazeEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 晃晕期间维持头顶转圈的晕眩：少而稳，放在头顶上方，不遮挡目标。
    WorldCombat.on("world_combat:move_meteorassault/exhaust-linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meteorassaultDazeEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_meteorassault/recharge/" + String(actor.ref()), meteorassaultScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
