/**
 * 爆炸烈焰 / blastburn 的出手方式。
 *
 * 核心念头：把火焰压成一团热核投向落点，落点炸开的火焰把范围内的对手一起烧尽；爆发之后施法者热力透支，
 * 进入一段真实的过热力竭——无法行动、无法移动，把「爆炸的火焰」的代价摊开在场上。
 *
 * 三幕：
 *   起：身前收拢火焰、压缩成球（windup）。
 *   击：提交后把火球沿低弧抛向落点（launch → 飞行）；命中点／撞上活体即引爆（blast），
 *       对半径内所有敌人结算一次特殊伤害，并按特攻概率点燃他们。
 *   收：无论是否点着谁，施法者挂上 `world_combat:status/mustrecharge` 过热力竭（本单元 startup 效果），
 *       播放热气收场；力竭期间由 mob_effect_tick 维持低密度的热气画面。
 *
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零实现。
 */
namespace PokemonSkills {
    const blastburnScene = "world_combat:move_blastburn";
    const blastburnOverheatEffect = "world_combat:blastburn_overheat";
    const blastburnBlastText = "world_combat.move.blastburn.text.blast";
    const blastburnFizzleText = "world_combat.move.blastburn.text.fizzle";
    const blastburnExhaustText = "world_combat.move.blastburn.text.exhaust";

    define({
        id: "blastburn",
        name: "Blast Burn",
        description: "The target is razed by a fiery explosion. The user can't move on the next turn.",
        uses: ["远距离大爆炸", "同时烧到挤在一起的对手", "用一次过热换一片清场"],
        kind: "point",
        range: 12,
        maxRange: 20,
        prepare: 10,
        active: 40,
        recover: 10,
        cooldown: 70,
        style: "fire",
        defaults: { spread: 2.6, ai: { minTargets: 1, minHealth: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("blastburn", "radius", pokemon), geometry: "area", style: "fire", label: "爆炸烈焰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["blastburn"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var exhaust = Math.round(p("blastburn", "exhaust", context));
            return {
                prepare: Math.round(p("blastburn", "charge", context)),
                recover: 10,
                cooldown: exhaust + 16,
                range: p("blastburn", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_blastburn:windup", blastburnScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", point: [action.targetPosition().x(), action.targetPosition().y(), action.targetPosition().z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const point = action.targetPosition();
            const speed = p("blastburn", "speed", action);
            const radius = p("blastburn", "radius", action);
            const blast = p("blastburn", "blast", action);
            const burnChance = p("blastburn", "burnChance", action);
            const burnTicks = Math.max(1, Math.round(p("blastburn", "burnTicks", action)));
            const collisionRadius = p("blastburn", "collisionRadius", action);
            const exhaustTicks = Math.max(1, Math.round(p("blastburn", "exhaust", action)));
            const spread = radius / 2.6;
            const intensity = Math.max(0.6, Math.min(2.6, blast / 150));

            sound(action, "cobblemon:move.fireblast.actor");
            WorldFeedback.emit(world, blastburnScene, 1, origin, { moment: "launch", scale: spread, intensity: intensity, range: point.minus(origin).length() }, 34);

            function exhale(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), blastburnOverheatEffect, exhaustTicks, 0);
                WorldEffects.apply(scope, current.actor(), "rooted", {}, exhaustTicks);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, blastburnScene, 1, body.position(), { moment: "exhale", scale: spread,
                        seconds: exhaustTicks / 20, count: Math.round(10 + (exhaustTicks / 20) * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)), blastburnExhaustText,
                        [Math.round(exhaustTicks / 20 * 10) / 10], 30);
                }
                sound(current, "minecraft:block.fire.extinguish");
            }

            const flight = LivingActions.projectile(action, {
                speed: speed,
                range: action.range(),
                radius: collisionRadius,
                direction: LivingActions.ballistic(origin, point, speed, 0.05) || undefined,
                gravity: 0.05,
                appearance: { sprite: "cobblemon:particle/generic/fire/flame", glow: true, scale: 1.5 },
                impact: function (current, hit, age) {
                    const scope = current.world();
                    const at = hit.position();
                    const count = Math.round(60 + intensity * 120);
                    WorldFeedback.emit(scope, blastburnScene, 1, at, { moment: "blast", scale: spread,
                        intensity: intensity, count: count, radius: radius }, 38);
                    sound(current, "minecraft:entity.generic.explode");
                    let touched = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2, above: 3 }), function (enemy: CombatActor) {
                        hurt(current, enemy, "blastburn", blast, { damage: damageSpec("blastburn", "blast") });
                        touched++;
                        if (scope.valid(enemy) && scope.random() < burnChance) CombatStatus.inflict(scope, enemy, "burn", burnTicks);
                    });
                    if (touched > 0) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), blastburnBlastText, [touched], 30);
                        sound(current, "cobblemon:move.fireblast.target");
                    } else {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), blastburnFizzleText, [], 28);
                    }
                }
            }, function complete(current: CombatAction) { exhale(current); done(current); });
            WorldFeedback.emit(world, blastburnScene, 1, origin, { moment: "track", projectile: flight }, 90);
        }
    });

    // 过热力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:blastburn/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    WorldCombat.on("world_combat:move_blastburn/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== blastburnOverheatEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 过热期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_blastburn/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), blastburnOverheatEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持低密度的热气：少而稳，靠近脚边，不遮挡目标。
    WorldCombat.on("world_combat:move_blastburn/exhaust-linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== blastburnOverheatEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_blastburn/recharge/" + String(actor.ref()), blastburnScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
