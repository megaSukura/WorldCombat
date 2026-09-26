/**
 * 糖浆炸弹 / syrupbomb 的出手方式。
 *
 * 核心念头：把一颗粘稠的麦芽糖炸弹抛出去，落地炸开一大团琥珀糖浆——被裹住的目标越拖越慢，
 *   连着三阵各掉一级速度；落点地面留下一片粘糖洼，踏进去的敌人会被黏住一下。
 *   炸弹走的是抛物线，所以能被打空、被走位躲开；它不追人，只是把一片地弄脏。
 *
 * 两幕 + 收：
 *   起：提交前 windup 在掌心搓团糖浆（action.present）。
 *   击：`kind: "aim"`——可瞄实体也可直接点地，提前把糖铺在敌人将经过的位置；炸弹抛物线飞向落点，
 *      落地（或命中活体）炸开：命中活体结算一次特殊伤害，范围内所有非友方被挂上共享身份
 *      world_combat:status/syrupbomb（本单元效果），各自起一个绑定效果按 interval 掉速。
 *   收：绑定效果连掉 `pulses` 级速度后结束；满身糖被牛奶/别的招式清掉则提前结束。落点粘糖洼
 *      （WorldEffects.field）在 poolTicks 内黏住踏进去的敌人。
 * 落点：糖洼按真实着地的可支撑地面放置——撞墙时沿方块面法线让开墙格再向下找地，不把水洼画在半空。
 * 反制：抛物线有飞行时间，掩体与走位能躲；粘糖洼只作用到走进去的人，绕开即可。
 * 配置 thick（浓糖）：爆散与洼更大，但炸弹更慢、冷却更长。
 */
namespace PokemonSkills {
    const syrupbombCoatText = "world_combat.move.syrupbomb.text.coat";
    const syrupbombFizzleText = "world_combat.move.syrupbomb.text.fizzle";

    function syrupbombBindData(json: string): string {
        const value = JSON.parse(json);
        ["interval", "drop", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid syrupbomb bind");
        });
        if (value.interval < 1 || value.drop === 0 || value.left < 0) throw new Error("Invalid syrupbomb bind");
        return JSON.stringify(value);
    }

    // 满身糖期间，身上持续滴下糖浆。
    WorldCombat.on("world_combat:move_syrupbomb/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== syrupbombEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "syrupbomb:" + String(actor.ref()), syrupbombScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 22);
    });

    WorldCombat.effect(syrupbombBind, 1, 1200, "actor", syrupbombBindData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(syrupbombBind, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(syrupbombBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || MobEffects.read(world, victim, syrupbombEffect) === null) { effect.end(); return; }
        NativeEffects.boost(world, victim, "spe", -data.drop);
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        const body = world.observe(victim);
        if (body !== null) {
            WorldFeedback.emit(world, syrupbombScene, 1, body.position(),
                { moment: "slow", target: String(victim.ref()), drop: data.drop, left: data.left }, 22);
            world.sound("minecraft:block.honey_block.slide", body.position(), 12, "{}");
        }
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(syrupbombBind, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 满身糖被外力清掉（牛奶、/effect clear、别的招式）时，掉速随之停止。
    WorldCombat.on("world_combat:move_syrupbomb/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== syrupbombEffect) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim) || MobEffects.read(world, victim, syrupbombEffect) !== null) return;
        const binds = world.effects(victim, syrupbombBind);
        for (let i = 0; i < binds.length; i++) world.operation(binds[i].id(), "world_combat:dispel", "{}");
    });

    // 落点粘糖洼：踏进去的敌人被黏住一下；粒子由 scan 按 field.radius 续期。
    WorldEffects.fieldRule(syrupbombPool, {
        scan: function (effect, world, field) {
            const scale = (field.radius || 1.6) / 1.6;
            WorldFeedback.keep(world, "syrupbomb:pool:" + String(effect.id()), syrupbombScene, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]), { moment: "pool", scale: scale }, 12);
        },
        enter: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const stick = field.data && typeof field.data.stick === "number" ? field.data.stick : 8;
            WorldEffects.apply(world, actor, "rooted", {}, Math.max(1, Math.round(stick)));
            const body = world.observe(actor);
            if (body !== null) WorldFeedback.emit(world, syrupbombScene, 1, body.position(), { moment: "stick", target: String(actor.ref()) }, 18);
        }
    });

    /**
     * 把糖洼收在真实可支撑的地面上：撞到方块侧面时先沿方块面法线让开该格，再向下找第一块实心方块；
     * 直接落地或砸中活体时也从接触点向下找地，避免把水洼画在墙面或半空。
     */
    function syrupbombLanding(world: CombatWorld, point: CombatPoint, face: string): CombatPoint {
        let x = point.x(), y = point.y(), z = point.z();
        if (face === "north") z -= 0.5;
        else if (face === "south") z += 0.5;
        else if (face === "west") x -= 0.5;
        else if (face === "east") x += 0.5;
        else if (face === "down") y -= 0.5;
        const ground = WorldGeometry.ground(world, WorldCombat.point(x, y, z), 8);
        return WorldCombat.point(ground.x(), ground.y(), ground.z());
    }

    /** 爆开：范围内所有非友方被裹上糖浆并各自挂上掉速绑定；落点留下粘糖洼。 */
    function syrupbombSplash(world: CombatWorld, point: CombatPoint, poolPoint: CombatPoint, blast: number, poolRadius: number, poolTicks: number,
        coatTicks: number, interval: number, pulses: number, stick: number, power: number): void {
        let coated = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, blast), function (actor) {
            if (MobEffects.apply(world, actor, syrupbombEffect, coatTicks, 0) === null) return;
            const existing = world.effects(actor, syrupbombBind);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            world.effect(syrupbombBind, actor, JSON.stringify({ interval: interval, drop: 1, left: pulses }), coatTicks);
            coated++;
            const at = world.observe(actor);
            if (at !== null) WorldFeedback.emit(world, syrupbombScene, 1, at.position(),
                { moment: "coat", target: String(actor.ref()), drop: 1, pulses: pulses }, 26);
        });
        WorldFeedback.emit(world, syrupbombScene, 1, point,
            { moment: "burst", scale: blast / 2.2, radius: blast, coated: coated, intensity: Math.max(0.6, Math.min(2, power / 60)) }, 36);
        WorldEffects.field(world, syrupbombPool, poolPoint, poolRadius, { stick: stick, drop: 1 }, poolTicks);
        if (coated > 0) WorldFeedback.text(world, poolPoint.plus(WorldCombat.point(0, 0.8, 0)), syrupbombCoatText, [coated], 28);
    }

    define({
        id: "syrupbomb",
        cooldownParameter: "wait",
        name: "糖浆炸弹",
        description: "抛出一颗粘稠的麦芽糖炸弹，落地炸开一大团糖浆；被裹住的敌人连续三阵各掉一级速度，落点留下一片会黏脚的粘糖洼。炸弹走抛物线，可以被走位躲开。",
        uses: ["把一群冲上来的敌人一起拖慢", "封住一条通道", "削弱高速目标"],
        kind: "aim",
        range: 8,
        maxRange: 11,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 70,
        style: "syrup",
        defaults: { thick: false, ai: { maxChase: 12, cluster: 1, lead: 0, leaveStation: true } },
        fields: [flag("thick", "浓糖")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["syrupbomb"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.round(p("syrupbomb", "tempo", context)),
                recover: p("syrupbomb", "recover", context),
                cooldown: Math.round(p("syrupbomb", "wait", context)),
                active: 1,
                range: p("syrupbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const thick = !!(config && config.thick);
            action.present("syrupbomb:windup", syrupbombScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: thick ? 1 : 0, intensity: thick ? 1.3 : 1 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: config && config.thick ? 10 : 8, geometry: "point", style: "syrup", label: config && config.thick ? "糖浆炸弹·浓糖" : "糖浆炸弹" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(syrupbombScene);
            const speed = Math.max(0.25, p("syrupbomb", "speed", action));
            const gravity = Math.max(0, p("syrupbomb", "gravity", action));
            const radius = Math.max(0.2, p("syrupbomb", "collision", action));
            const power = p("syrupbomb", "burst", action);
            const blast = Math.max(1.8, p("syrupbomb", "blast", action));
            const poolRadius = Math.max(1.2, p("syrupbomb", "poolRadius", action));
            const poolTicks = Math.max(60, Math.round(p("syrupbomb", "poolTicks", action)));
            const coatTicks = Math.max(80, Math.round(p("syrupbomb", "coatTicks", action)));
            const interval = Math.max(10, Math.round(p("syrupbomb", "interval", action)));
            const pulses = Math.max(1, Math.round(p("syrupbomb", "pulses", action)));
            const stick = Math.max(1, Math.round(p("syrupbomb", "stick", action)));
            let splashed = false;
            function splash(scope: CombatWorld, point: CombatPoint, face: string): void {
                if (splashed) return;
                splashed = true;
                const poolPoint = syrupbombLanding(scope, point, face);
                syrupbombSplash(scope, point, poolPoint, blast, poolRadius, poolTicks, coatTicks, interval, pulses, stick, power);
                scope.sound("minecraft:block.honey_block.break", poolPoint, 16, "{}");
            }
            sound(action, "minecraft:entity.experience_bottle.throw");
            // 点投：按真实抛物线飞向落点，落点与发射读同一次瞄准数据。
            const direction = gravity > 0
                ? (LivingActions.ballistic(action.origin(), action.targetPosition(), speed, gravity) || aim(action))
                : aim(action);
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 120, direction: direction,
                appearance: { item: "minecraft:honey_bottle", scale: 0.9, glow: true },
                impact: function (current, hit) {
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck)) {
                        impact(current, hit, "syrupbomb", power, { damage: damageSpec("syrupbomb", "burst") });
                    }
                    scenes.stop(current, "lob");
                    splash(scope, hit.position(), hit.blockFace());
                }
            }, function (current) {
                const scope = current.world();
                if (!splashed) {
                    WorldFeedback.emit(scope, syrupbombScene, 1, current.targetPosition(), { moment: "fizzle" }, 18);
                    WorldFeedback.text(scope, current.targetPosition(), syrupbombFizzleText, [], 24);
                }
                scenes.stop(current, "lob");
                splash(scope, current.targetPosition(), "");
                scenes.finish(current, done);
            });
            scenes.show(action, "lob", action.origin(),
                { moment: "lob", projectile: flight, target: action.target() ? String(action.target()!.ref()) : "" });
        }
    });
}
