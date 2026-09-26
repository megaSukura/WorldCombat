/**
 * 终极冲击 / gigaimpact 的出手方式。
 *
 * 核心念头：把整个身体压低、沿瞄准方向直线射出去，把全部力量在撞上的一刻交出；撞完之后惯性还在，
 * 身体有一段真实的力竭窗口——这段时间自己无法行动、无法移动，是对手还手的机会。空冲同样要付这份代价。
 *
 * 三幕：
 *   起：压低身体、脚下起尘，并沿实际冲程方向拉出冲迹预告（windup，提交前）。
 *   击：提交后逐刻沿瞄准方向推进，用 moveSweep 找接触；撞上活体按精灵数据结算这一撞、把目标顶开；
 *       撞墙在真实方块面留一处收势痕；跑满冲程、跑不动或撞墙都算空冲。
 *   收：无论命中、撞墙还是空冲，都挂上 `world_combat:status/mustrecharge`（本单元 startup 声明的效果），
 *       进入力竭：无法行动、无法移动。喘息表现由一段托管效果承载，随真实力竭状态自然到期或被提前解除一起撤下。
 *
 * 选取：kind 为 aim——方向或世界点都能放，瞄空中也成立；不要求提交时存在敌人，命中权限仍由命中层判断。
 *
 * 力竭的「无法行动」由一条 CombatStatus.actions 门禁实现（对所有活体一致）；「无法移动」由效果自带的
 * movement_speed/flying_speed 归零与 navigate 归零实现。
 */
namespace PokemonSkills {
    const gigaimpactScene = "world_combat:move_gigaimpact";
    const gigaimpactExhaustEffect = "world_combat:gigaimpact_exhaust";
    const gigaimpactExhaustMark = "world_combat:gigaimpact_exhaust_mark";
    const gigaimpactHitText = "world_combat.move.gigaimpact.text.hit";
    const gigaimpactMissText = "world_combat.move.gigaimpact.text.miss";
    const gigaimpactExhaustText = "world_combat.move.gigaimpact.text.exhaust";

    define({
        freeMovement: true,
        id: "gigaimpact",
        name: "Giga Impact",
        description: "把整个身体压低后沿直线全力撞出去；撞实的一刻把目标顶开，但无论撞中、撞墙还是冲空，冲完自己都会力竭一段时间，无法行动也无法移动。",
        uses: ["直线全力冲撞", "把目标撞飞，用自己的力竭换这一下", "在对手还手前先手终结"],
        kind: "aim",
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
            const delta = action.targetPosition().minus(action.origin());
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const seconds = Math.round(p("gigaimpact", "exhaust", action) / 20 * 10) / 10;
            // 预告这具身体真实的冲程与冲完后要付的力竭：冲迹长度与力竭秒数都来自本招现场算出的值。
            action.present("world_combat:move_gigaimpact:windup", gigaimpactScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, lunge: p("gigaimpact", "lunge", action),
                    exhaust: seconds, strain: Math.round(3 + seconds * 2),
                    direction: [direction.x(), direction.y(), direction.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(gigaimpactScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("gigaimpact", "lunge", action);
            const speed = p("gigaimpact", "speed", action);
            const radius = p("gigaimpact", "collisionRadius", action);
            const push = p("gigaimpact", "push", action);
            const crash = p("gigaimpact", "crash", action);
            const exhaustTicks = Math.max(1, Math.round(p("gigaimpact", "exhaust", action)));
            const direction = aim(action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.4, crash / 130));
            let travelled = 0;

            movementScenes.show(action, "drive", action.origin(), { moment: "drive", scale: scale, intensity: intensity });
            sound(action, "cobblemon:move.bodyslam.actor_1");

            /** 落力竭：挂上真实 mustrecharge 并停步；喘息表现由一段托管效果承载，跟状态同起同落。 */
            function exhale(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), gigaimpactExhaustEffect, exhaustTicks, 0);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    const seconds = Math.round(exhaustTicks / 20 * 10) / 10;
                    WorldFeedback.emit(scope, gigaimpactScene, 1, body.position(),
                        { moment: "exhaust", scale: scale, seconds: seconds, count: Math.round(8 + seconds * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.4, 0)), gigaimpactExhaustText, [seconds], 30);
                    scope.effect(gigaimpactExhaustMark, current.actor(),
                        JSON.stringify({ scale: scale, seconds: seconds, puffs: Math.round(6 + seconds * 3) }), exhaustTicks);
                }
                sound(current, "minecraft:entity.generic.big_fall");
            }

            function land(current: CombatAction, textKey: string, moment: string): void {
                const body = current.world().observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(current.world(), gigaimpactScene, 1, body.position(), { moment: moment, scale: scale }, 24);
                    WorldFeedback.text(current.world(), body.position().plus(WorldCombat.point(0, 1.4, 0)), textKey, [], 24);
                }
                exhale(current);
                movementScenes.finish(current, done);
            }

            /** 撞墙：在实际撞到的原生方块格上留一处收势痕，落点就是真正停下的位置。 */
            function wall(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world();
                const cell = hit.blockPosition(), at = cell === null ? hit.position() : cell;
                WorldFeedback.emit(scope, gigaimpactScene, 1, at,
                    { moment: "wall", point: [at.x(), at.y(), at.z()], face: hit.blockFace(), scale: scale }, 22);
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
                    const point = hit.position();
                    const landed = impact(current, hit, "gigaimpact", crash,
                        { damage: damageSpec("gigaimpact", "crash"), contact: true });
                    WorldFeedback.emit(scope, gigaimpactScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", scale: scale,
                            intensity: intensity, count: Math.round(30 + intensity * 60) }, 34);
                    if (landed && target !== null && scope.valid(target)) {
                        const body = scope.observe(target);
                        if (body !== null) {
                            const outward = body.position().minus(origin);
                            if (outward.length() >= 0.05) scope.hitDisplace(target, outward.unit().scale(push));
                        }
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), gigaimpactHitText, [], 30);
                        sound(current, "cobblemon:move.bodyslam.target");
                    }
                    sound(current, "minecraft:entity.iron_golem.attack");
                    exhale(current);
                    movementScenes.finish(current, done);
                    return;
                }
                travelled += swept.moved;
                if (hit.blocked()) { wall(current, hit); land(current, gigaimpactMissText, "miss"); return; }
                if (swept.moved < p("gigaimpact", "minimumMove", current) || travelled >= length) {
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

    // 喘息载体：只为一件事存在——把「站在原地喘过这口气」这个持续表现，绑在真实的 mustrecharge 生命周期上。
    WorldCombat.effect(gigaimpactExhaustMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.seconds !== "number" || !isFinite(value.seconds) || value.seconds <= 0
            || typeof value.scale !== "number" || !isFinite(value.scale) || value.scale <= 0
            || typeof value.puffs !== "number" || !isFinite(value.puffs) || value.puffs < 1)
            throw new Error("Invalid gigaimpact exhaust mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gigaimpactExhaustMark, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        const body = world.observe(actor);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_gigaimpact/pant", gigaimpactScene, 1,
            body.position(), { moment: "pant", target: String(actor.ref()), scale: state.scale, seconds: state.seconds, puffs: state.puffs });
        effect.schedule("watch", "watch", 5, "{}");
    });
    // 状态提前消失（牛奶、驱散）时立刻结束托管表现；自然到期时托管效果自己的计时也到点。
    WorldCombat.effectHandler(gigaimpactExhaustMark, "watch", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor) || world.mobEffect(actor, gigaimpactExhaustEffect) === null) { effect.end(); return; }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(gigaimpactExhaustMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // mustrecharge 一被移除（自然到期或提前解除）就撤掉托管表现，不靠表现自己的计时。
    WorldCombat.on("world_combat:move_gigaimpact/exhaust-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== gigaimpactExhaustEffect) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, gigaimpactExhaustMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    // 力竭挂上的一刻立刻停步，避免带着残余动量滑出去。
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
}
