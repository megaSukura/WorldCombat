/**
 * 爆炸烈焰 / blastburn 的出手方式。
 *
 * 核心念头：把火焰压成一团热核投向落点，落点炸开的火焰把范围内的对手一起烧尽；爆发之后施法者热力透支，
 * 进入一段真实的过热力竭——无法行动、无法移动，把「爆炸的火焰」的代价摊开在场上。
 *
 * 三幕：
 *   起：身前收拢火焰、压缩成球（windup）。
 *   击：提交后把火球沿低弧抛向落点（launch → 飞行）；实体或方块首碰即提前引爆（blast），
 *       爆心落在真实接触点；半径内视线不被遮挡的敌人各结算一次特殊伤害，只有真正吃下伤害的人才可能被点燃。
 *   收：无论是否命中，施法者挂上 `world_combat:status/mustrecharge` 过热力竭（本单元 startup 效果）；
 *       喘息表现由一段托管效果承载，随真实力竭状态自然到期或被提前解除一起撤下。
 *
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 navigate 归零实现。
 */
namespace PokemonSkills {
    const blastburnScene = "world_combat:move_blastburn";
    const blastburnOverheatEffect = "world_combat:blastburn_overheat";
    const blastburnOverheatMark = "world_combat:blastburn_overheat_mark";
    const blastburnBlastText = "world_combat.move.blastburn.text.blast";
    const blastburnFizzleText = "world_combat.move.blastburn.text.fizzle";
    const blastburnExhaustText = "world_combat.move.blastburn.text.exhaust";
    const blastburnImmuneText = "world_combat.move.blastburn.text.immune";

    define({
        freeMovement: true,
        id: "blastburn",
        name: "Blast Burn",
        description: "把火焰压成一颗热球投向落点，整片炸开把范围内的对手一起烧尽；爆发之后自己会过热力竭一段时间，无法行动也无法移动。",
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

            /** 落定过热：挂上真实 mustrecharge 并停步；喘息表现由一段托管效果承载，跟状态同起同落。 */
            function exhale(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), blastburnOverheatEffect, exhaustTicks, 0);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    const seconds = Math.round(exhaustTicks / 20 * 10) / 10;
                    WorldFeedback.emit(scope, blastburnScene, 1, body.position(),
                        { moment: "exhale", scale: spread, seconds: seconds, count: Math.round(10 + seconds * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)), blastburnExhaustText, [seconds], 30);
                    scope.effect(blastburnOverheatMark, current.actor(),
                        JSON.stringify({ scale: spread, seconds: seconds, puffs: Math.round(6 + seconds * 3) }), exhaustTicks);
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
                    const blocked = !hit.hitEntity();
                    const cell = blocked ? hit.blockPosition() : null;
                    const column = Math.max(1.6, radius);
                    const count = Math.round(60 + intensity * 120);
                    // 爆心就是真实首碰点；撞墙时带上原生方块格与表面，让落点表现贴着那面墙。
                    WorldFeedback.emit(scope, blastburnScene, 1, at, { moment: "blast", scale: spread,
                        intensity: intensity, count: count, radius: radius, column: column,
                        smoke: Math.round(16 + radius * 6),
                        face: blocked ? hit.blockFace() : "",
                        block: cell !== null ? [cell.x(), cell.y(), cell.z()] : undefined }, 38);
                    sound(current, "minecraft:entity.generic.explode");
                    let touched = 0;
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2, above: 3 }), function (enemy: CombatActor, facts) {
                        // 遮挡限制爆圈：被墙挡住的对手不吃这一爆，火不会穿墙。
                        if (!scope.clear(at, facts.position())) return;
                        // 只有真正吃下这一爆的人才可能被点燃；免伤的对手不显示灼伤。
                        if (!hurt(current, enemy, "blastburn", blast, { damage: damageSpec("blastburn", "blast") })) return;
                        touched++;
                        if (!scope.valid(enemy)) return;
                        if (scope.random() < burnChance) {
                            // 免疫燃烧（如火属性）时如实反馈，不误报点着。
                            if (!CombatStatus.inflict(scope, enemy, "burn", burnTicks))
                                feedback(scope, enemy, facts.position(), "immune", { key: blastburnImmuneText });
                        }
                    });
                    if (touched > 0) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), blastburnBlastText, [touched], 30);
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

    // 喘息载体：只为一件事存在——把「热得喘不过气」这个持续表现绑在真实的 mustrecharge 生命周期上。
    WorldCombat.effect(blastburnOverheatMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.seconds !== "number" || !isFinite(value.seconds) || value.seconds <= 0
            || typeof value.scale !== "number" || !isFinite(value.scale) || value.scale <= 0
            || typeof value.puffs !== "number" || !isFinite(value.puffs) || value.puffs < 1)
            throw new Error("Invalid blastburn overheat mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(blastburnOverheatMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_blastburn/pant", blastburnScene, 1,
            body.position(), { moment: "pant", target: String(actor.ref()), scale: state.scale, seconds: state.seconds, puffs: state.puffs });
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(blastburnOverheatMark, "watch", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor) || world.mobEffect(actor, blastburnOverheatEffect) === null) { effect.end(); return; }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(blastburnOverheatMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // mustrecharge 一被移除就撤掉托管表现，不靠表现自己的计时。
    WorldCombat.on("world_combat:move_blastburn/exhaust-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== blastburnOverheatEffect) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, blastburnOverheatMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

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
}
