/**
 * 加农水炮 / hydrocannon 的出手方式。
 *
 * 核心念头：把水压到极限，压成一发粗短的水炮朝目标直冲——它把命中的活体顶开、泼透；湿透的目标再吃一发会更重。
 * 放完水压泄尽，施法者力竭一段时间，无法行动也无法移动。
 *
 * 三幕：
 *   起：身前水流旋转收束、水花四溅（windup，提交前）。
 *   击：提交后炮口压缩喷出、与弹体断开，水炮沿锁定方向高速飞行；命中活体即按精灵数据结算 `jet`，沿水炮方向把目标顶开，
 *       并泼上共享身份 `world_combat:status/soaked` 的浸湿状态（本单元效果）；已经湿透的目标多受一份 `drenchBonus`；
 *       撞到方块就在墙面散水（fizzle），只打第一处接触、不穿透、不留下会继续伤人的水流。
 *   收：水炮落下，施法者挂上 `world_combat:status/mustrecharge` 力竭并浮字；期间 mob_effect_tick 维持低伏的干燥喘息，不再持续发水。
 *
 * 选取：`kind: "aim"`——朝方向或世界点都能放，空放也成立；AI 仍可为攻击用途推荐敌人，命中权限由命中层判定。
 * 「无法行动」由 CombatStatus.actions 门禁实现；「无法移动」由效果自带的速度归零与 rooted 补上。
 */
namespace PokemonSkills {
    const hydrocannonScene = "world_combat:move_hydrocannon";
    const hydrocannonSpentEffect = "world_combat:hydrocannon_spent";
    const hydrocannonDrenchEffect = "world_combat:hydrocannon_drench";
    const hydrocannonHitText = "world_combat.move.hydrocannon.text.hit";
    const hydrocannonDrenchText = "world_combat.move.hydrocannon.text.drench";
    const hydrocannonMissText = "world_combat.move.hydrocannon.text.miss";
    const hydrocannonSpentText = "world_combat.move.hydrocannon.text.spent";

    /** 水柱落下：挂上力竭状态（共享身份 mustrecharge）并停步，播放收场表现与浮字。 */
    function hydrocannonSpent(action: CombatAction, ticks: number, hits: number, intensity: number): void {
        const world = action.world();
        MobEffects.apply(world, action.actor(), hydrocannonSpentEffect, ticks, 0);
        WorldEffects.apply(world, action.actor(), "rooted", {}, ticks);
        world.stopMovement(action.actor());
        const body = world.observe(action.actor());
        if (body !== null) {
            WorldFeedback.emit(world, hydrocannonScene, 1, body.position(),
                { moment: "spent", scale: intensity, seconds: ticks / 20, hits: hits, count: Math.round(10 + (ticks / 20) * 5) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), hydrocannonSpentText,
                [Math.round(ticks / 20 * 10) / 10], 30);
        }
        sound(action, "minecraft:entity.generic.splash");
    }

    define({
        freeMovement: true,
        id: "hydrocannon",
        name: "Hydro Cannon",
        description: "朝方向或点把水压到极限、压成一发粗短的高压水炮射出去：命中把目标顶开并泼得湿透，湿透的目标再吃一发更重；水炮撞上第一个活的或方块即停，不会穿透，放完自己力竭一段时间，无法行动也无法移动。",
        uses: ["一发压缩的高压水炮", "把目标顶开并泼得湿透", "对已经湿透的目标补一发更重的水炮"],
        kind: "aim",
        range: 11,
        maxRange: 20,
        prepare: 11,
        active: 40,
        recover: 10,
        cooldown: 72,
        style: "water",
        stationary: true,
        defaults: { pressurized: false, ai: { minHealth: 0.35, preferSoaked: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("hydrocannon", "reach", pokemon), geometry: "line", style: "water", color: 0x3E8FD0, label: "加农水炮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["hydrocannon"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("hydrocannon", "charge", context)),
                recover: 10,
                cooldown: Math.round(p("hydrocannon", "exhaust", context)) + 16,
                range: p("hydrocannon", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const target = action.targetPosition();
            action.present("world_combat:move_hydrocannon:windup", hydrocannonScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, pressurized: !!(config && config.pressurized),
                    point: [target.x(), target.y(), target.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(hydrocannonScene);
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const speed = p("hydrocannon", "speed", action);
            const reach = action.range();
            const radius = p("hydrocannon", "collisionRadius", action);
            const power = p("hydrocannon", "jet", action);
            const shove = p("hydrocannon", "shove", action);
            const soak = Math.max(1, Math.round(p("hydrocannon", "soakTicks", action)));
            const bonus = p("hydrocannon", "drenchBonus", action);
            const base = Math.max(1, Math.round(p("hydrocannon", "exhaust", action)));
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.6, power / 150));
            const heading = [direction.x(), direction.y(), direction.z()];
            let landed = false, struck = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            sound(action, "cobblemon:move.hydropump.actor");
            // 炮口：压缩水团一次喷出后与弹体断开，不再有连流。
            WorldFeedback.emit(world, hydrocannonScene, 1, origin,
                { moment: "muzzle", scale: scale, intensity: intensity, direction: heading }, 14);

            const flight = LivingActions.projectile(action, {
                speed: speed,
                range: reach + 1.5,
                radius: radius,
                direction: direction,
                gravity: 0,
                appearance: { sprite: "cobblemon:particle/generic/water/waterjet", scale: 1.6 },
                impact: function (current, hit, age) {
                    const scope = current.world();
                    // 首个接触即停：命中弹体随接触结束，余下的轨迹不再有隐形水流。
                    scenes.stop(current, "jet");
                    const at = hit.position();
                    const victim = hit.hitEntity() ? hit.target() : null;
                    if (victim === null) {
                        const blockPoint = hit.blockPosition();
                        WorldFeedback.emit(scope, hydrocannonScene, 1, blockPoint === null ? at : blockPoint,
                            { moment: "fizzle", point: [at.x(), at.y(), at.z()], scale: scale, face: hit.blockFace() }, 24);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    const body = scope.observe(victim);
                    const soaked = CombatStatus.has(scope, victim, "soaked") || (body !== null && body.wet());
                    const amount = soaked ? power * (1 + bonus) : power;
                    if (!impact(current, hit, "hydrocannon", amount, { damage: damageSpec("hydrocannon", "jet") })) return;
                    landed = true;
                    struck = struck + 1;
                    const outward = body !== null ? body.position().minus(origin) : direction;
                    if (scope.valid(victim) && outward.length() >= 0.05) scope.displace(victim, outward.unit().scale(shove));
                    MobEffects.apply(scope, victim, hydrocannonDrenchEffect, soak, 0);
                    WorldFeedback.emit(scope, hydrocannonScene, 1, at,
                        { moment: "burst", target: String(victim.ref()), scale: scale, intensity: intensity,
                            count: Math.round(50 + amount * 0.9), soaked: soaked, shove: shove, direction: heading }, 30);
                    if (soaked) WorldFeedback.emit(scope, hydrocannonScene, 1, at, { moment: "drench", target: String(victim.ref()), scale: scale }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), soaked ? hydrocannonDrenchText : hydrocannonHitText, [], 26);
                    sound(current, "cobblemon:move.hydropump.target");
                    sound(current, "minecraft:block.conduit.attack.target");
                }
            }, function complete(current) {
                if (!landed) WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 1.0, 0)), hydrocannonMissText, [], 24);
                hydrocannonSpent(current, base, struck, intensity);
                finish(current);
            });
            // 弹体飞行：场景跟着真实投射物走，命中/落地即刻 stop，不拖出一条看不到伤害的水流。
            scenes.show(action, "jet", origin,
                { moment: "jet", projectile: flight, scale: scale, intensity: intensity, range: reach,
                    notes: Math.round(20 + power * 0.6), direction: heading });
        }
    });

    // 力竭的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:hydrocannon/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    // 力竭挂上的一刻立刻停步，避免带着残余动量滑出去。
    WorldCombat.on("world_combat:move_hydrocannon/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hydrocannonSpentEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 力竭期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_hydrocannon/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), hydrocannonSpentEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 力竭期间维持低密度的滴水：少而稳，靠近脚边，让玩家看清目标。
    WorldCombat.on("world_combat:move_hydrocannon/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hydrocannonSpentEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_hydrocannon/recharge/" + String(actor.ref()), hydrocannonScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });

    // 浸湿期间在目标脚边维持一串缓慢滴落的水珠：让「湿透」这件事持续可读。
    WorldCombat.on("world_combat:move_hydrocannon/drip", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== hydrocannonDrenchEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_hydrocannon/drenched/" + String(actor.ref()), hydrocannonScene, 1,
            body.position(), { moment: "drenched", target: String(actor.ref()) }, 40);
    });
}
