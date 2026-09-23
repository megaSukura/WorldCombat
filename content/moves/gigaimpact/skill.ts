/**
 * 终极冲击 / gigaimpact 的出手方式。
 *
 * 核心念头：把整个身体压低、沿瞄准方向直线射出去，把全部力量在撞上的一刻交出；撞完之后惯性还在，
 * 身体有一段真实的力竭窗口——这段时间自己无法行动、无法移动，是对手还手的机会。
 *
 * 三幕：
 *   起：压低身体、脚下起尘（windup）。
 *   击：提交后逐刻沿瞄准方向推进，用 trace 找接触；命中则按精灵数据结算这一撞、把目标顶开；
 *       撞墙、跑不动或跑满冲程即落空。
 *   收：无论命中与否，挂上 `world_combat:status/mustrecharge` 力竭状态（本单元 startup 声明的效果），
 *       播放力竭表现并浮字；力竭期间由 mob_effect_tick 维持一段低密度的晕眩画面。
 *
 * 力竭的「无法行动」由一条 CombatStatus.actions 门禁实现（对所有活体一致）；「无法移动」由效果自带的
 * movement_speed/flying_speed 归零实现。
 */
namespace PokemonSkills {
    const gigaimpactScene = "world_combat:move_gigaimpact";
    const gigaimpactExhaustEffect = "world_combat:gigaimpact_exhaust";
    const gigaimpactHitText = "world_combat.move.gigaimpact.text.hit";
    const gigaimpactMissText = "world_combat.move.gigaimpact.text.miss";
    const gigaimpactExhaustText = "world_combat.move.gigaimpact.text.exhaust";

    define({
        freeMovement: true,
        id: "gigaimpact",
        name: "Giga Impact",
        description: "把整个身体压低后沿直线全力撞出去；撞实的一刻把目标顶开，但无论撞中还是撞空，冲完自己都会力竭一段时间，无法行动也无法移动。",
        uses: ["直线全力冲撞", "把目标撞飞，用自己的力竭换这一下", "在对手还手前先手终结"],
        kind: "enemy",
        range: 5,
        maxRange: 9,
        prepare: 7,
        active: 40,
        recover: 8,
        cooldown: 60,
        style: "impact",
        defaults: { brace: false, ai: { maxChase: 12, minHealth: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("gigaimpact", "collisionRadius", pokemon) * 1.2, geometry: "line", style: "impact", label: "终极冲击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["gigaimpact"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var exhaust = Math.round(p("gigaimpact", "exhaust", context));
            return {
                prepare: Math.round(p("gigaimpact", "charge", context)),
                recover: 8,
                cooldown: exhaust + 14,
                range: p("gigaimpact", "lunge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_gigaimpact:windup", gigaimpactScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(gigaimpactScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("gigaimpact", "lunge", action);
            const speed = p("gigaimpact", "speed", action);
            const radius = p("gigaimpact", "collisionRadius", action);
            const traceAhead = p("gigaimpact", "traceAhead", action);
            const push = p("gigaimpact", "push", action);
            const crash = p("gigaimpact", "crash", action);
            const exhaustTicks = Math.max(1, Math.round(p("gigaimpact", "exhaust", action)));
            const direction = aim(action);
            const scale = radius / 0.55;
            let travelled = 0;

            movementScenes.show(action, "drive", action.origin(), { moment: "drive", scale: scale, intensity: Math.max(0.6, Math.min(2.2, crash / 150)) });
            sound(action, "cobblemon:move.bodyslam.actor_1");

            function exhale(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), gigaimpactExhaustEffect, exhaustTicks, 0);
                WorldEffects.apply(scope, current.actor(), "rooted", {}, exhaustTicks);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, gigaimpactScene, 1, body.position(), { moment: "exhaust", scale: scale,
                        seconds: exhaustTicks / 20, count: Math.round(8 + (exhaustTicks / 20) * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.4, 0)), gigaimpactExhaustText, [Math.round(exhaustTicks / 20 * 10) / 10], 30);
                }
                sound(current, "minecraft:entity.generic.big_fall");
            }

            function land(current: CombatAction, textKey: string, moment: string): void {
                const body = current.world().observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(current.world(), gigaimpactScene, 1, body.position(), { moment: moment, scale: scale }, 24);
                    WorldFeedback.text(current.world(), body.position().plus(WorldCombat.point(0, 1.4, 0)), textKey, [], 24);
                }
                sound(current, "minecraft:block.anvil.land");
                exhale(current);
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { land(current, gigaimpactMissText, "miss"); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const landed = impact(current, hit, "gigaimpact", crash,
                        { damage: damageSpec("gigaimpact", "crash"), contact: true });
                    const point = hit.position();
                    WorldFeedback.emit(scope, gigaimpactScene, 1, point, { moment: "impact", scale: scale,
                        target: target ? String(target.ref()) : "", intensity: Math.max(0.6, Math.min(2.4, crash / 130)),
                        count: Math.round(30 + Math.min(2.4, crash / 130) * 60) }, 34);
                    if (landed && target !== null && scope.valid(target)) {
                        const body = scope.observe(target);
                        if (body !== null) {
                            const outward = body.position().minus(origin);
                            if (outward.length() >= 0.05) scope.displace(target, outward.unit().scale(push));
                        }
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), gigaimpactHitText, [], 30);
                        sound(current, "cobblemon:move.bodyslam.target");
                    }
                    sound(current, "minecraft:entity.iron_golem.attack");
                    exhale(current);
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("gigaimpact", "minimumMove", current) || travelled >= length) {
                    land(current, gigaimpactMissText, "miss");
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

    // 力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:gigaimpact/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 效果挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_gigaimpact/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== gigaimpactExhaustEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 力竭期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_gigaimpact/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), gigaimpactExhaustEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持一段低密度晕眩画面：少而稳，放在脚边与头顶，让玩家看清目标。
    WorldCombat.on("world_combat:move_gigaimpact/exhaust-linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== gigaimpactExhaustEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_gigaimpact/recharge/" + String(actor.ref()), gigaimpactScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
