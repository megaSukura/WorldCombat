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
        ["interval", "drop", "left", "coat"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid syrupbomb bind");
        });
        if (value.interval < 1 || value.drop === 0 || value.left < 0 || value.coat < 1) throw new Error("Invalid syrupbomb bind");
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
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        // 这一层糖衣由绑定持有：它自己申请精确的那一次 carrier（租约），替换/清除糖衣时绑定同步失效。
        if (!CombatStatus.apply(world, victim, "syrupbomb", syrupbombEffect, Math.max(1, Math.round(data.coat)), 0, { unique: true })) { effect.end(); return; }
        data.lease = MobEffects.bind(world, victim, syrupbombEffect);
        if (!data.lease) { effect.end(); return; }
        effect.state(JSON.stringify(data));
        const body = world.observe(victim);
        if (body !== null) WorldFeedback.emit(world, syrupbombScene, 1, body.position(),
            { moment: "coat", target: String(victim.ref()), drop: 1, pulses: data.left }, 26);
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(syrupbombBind, "pulse", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        // 显示真实降级：已到 -6 时这一阵实际掉 0，不假装又降了一级，也不重复播报。
        const drop = NativeEffects.boost(world, victim, "spe", -data.drop);
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        const body = world.observe(victim);
        if (body !== null) {
            WorldFeedback.emit(world, syrupbombScene, 1, body.position(),
                { moment: "slow", target: String(victim.ref()), drop: drop, left: data.left }, 22);
            if (drop !== 0) world.sound("minecraft:block.honey_block.slide", body.position(), 12, "{}");
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

    // 落点粘糖洼：只有真正踩在洼上的敌人被黏住一下；表现由 field 托管效果自己持有，洼在粒子就在。
    WorldEffects.fieldRule(syrupbombPool, {
        accepts: function (world, actor, field) {
            // 高度不同不算踩上：必须真的着地、脚底落在这块糖面附近。
            return !world.friendly(actor) && WorldEffects.groundedContact(world, actor, field, 1.2);
        },
        scan: function (effect, world, field) {
            const scale = (field.radius || 1.6) / 1.6;
            // 用托管效果的 presentOn：洼结束的那一刻表现一起收走，不会出现「场还在、画面先没了」。
            WorldFeedback.onEffect(world, effect.id(), "syrupbomb:pool", syrupbombScene, 1,
                WorldCombat.point(field.position[0], field.position[1], field.position[2]), { moment: "pool", scale: scale });
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
     * 把糖洼收在真实可支撑的地面上：撞到方块侧面时先沿方块面法线让开该格，再向下找第一块实心方块。
     * 只有当糖面就在接触点脚边（竖直、水平都靠得住）才算落地；悬空结束的弹找不到支撑时返回 null，
     * 由调用方散掉，不把糖洼画在半空或凭空补一个假落点。
     */
    function syrupbombLanding(world: CombatWorld, point: CombatPoint, face: string): CombatPoint | null {
        let x = point.x(), y = point.y(), z = point.z();
        if (face === "north") z -= 0.5;
        else if (face === "south") z += 0.5;
        else if (face === "west") x -= 0.5;
        else if (face === "east") x += 0.5;
        else if (face === "down") y -= 0.5;
        const probe = WorldCombat.point(x, y, z);
        const ground = WorldGeometry.ground(world, probe, 8);
        const vertical = Math.abs(ground.y() - point.y());
        const horizontal = WorldCombat.point(ground.x() - point.x(), 0, ground.z() - point.z()).length();
        return vertical <= 2.5 && horizontal <= 2.0 ? ground : null;
    }

    /** 没炸到任何实心落点（或悬空结束）时只在真实位置散一下，不含糊地补一个假糖洼。 */
    function syrupbombFizzle(world: CombatWorld, point: CombatPoint): void {
        WorldFeedback.emit(world, syrupbombScene, 1, point, { moment: "fizzle" }, 18);
        WorldFeedback.text(world, point, syrupbombFizzleText, [], 24);
    }

    /**
     * 爆开：范围内的非友方被裹上糖浆并各自挂上掉速绑定（绑定自带精确 carrier 租约，负责真正落地与掉速）。
     * 实心墙挡住爆心与目标连线的敌人吃不到；只要有真实可支撑的落点就留下粘糖洼，全空则只散掉。
     */
    function syrupbombSplash(world: CombatWorld, point: CombatPoint, poolPoint: CombatPoint | null, blast: number, poolRadius: number, poolTicks: number,
        coatTicks: number, interval: number, pulses: number, stick: number, power: number): void {
        let coated = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, blast), function (actor, facts) {
            if (WorldGeometry.blockHit(world, point, facts.position()) !== null) return;
            const existing = world.effects(actor, syrupbombBind);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            const id = world.effect(syrupbombBind, actor,
                JSON.stringify({ interval: interval, drop: 1, left: pulses, coat: coatTicks }), coatTicks);
            // 绑定 start 同步申请 carrier 并领取租约；领取失败（原生拒绝）就不算裹上，也不播报。
            if (!world.effects(actor, syrupbombBind).some(function (view) { return view.id() === id; })) return;
            coated++;
        });
        WorldFeedback.emit(world, syrupbombScene, 1, point,
            { moment: "burst", scale: blast / 2.2, radius: blast, coated: coated, intensity: Math.max(0.6, Math.min(2, power / 60)) }, 36);
        if (poolPoint !== null) {
            WorldEffects.field(world, syrupbombPool, poolPoint, poolRadius, { stick: stick, drop: 1 }, poolTicks);
            if (coated > 0) WorldFeedback.text(world, poolPoint.plus(WorldCombat.point(0, 0.8, 0)), syrupbombCoatText, [coated], 28);
        }
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
        indicator: function (config, pokemon) {
            // 指示圈用这一只这一次真的炸开半径，浓糖也走同一棵公式，不写死第二份常数。
            return { radius: p("syrupbomb", "blast", pokemon), geometry: "point", style: "syrup",
                label: config && config.thick ? "糖浆炸弹·浓糖" : "糖浆炸弹" };
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
            // requireSupport：自然结束（没撞到东西）时只有落在真实支撑面上的终点才炸开；
            // 直接命中实体或方块时以实际接触点为落点，悬空命中（如打中飞行目标）仍裹糖但不出洼。
            function splash(scope: CombatWorld, point: CombatPoint, face: string, requireSupport: boolean): void {
                if (splashed) return;
                const poolPoint = syrupbombLanding(scope, point, face);
                if (requireSupport && poolPoint === null) { syrupbombFizzle(scope, point); return; }
                splashed = true;
                syrupbombSplash(scope, point, poolPoint, blast, poolRadius, poolTicks, coatTicks, interval, pulses, stick, power);
                if (poolPoint !== null) scope.sound("minecraft:block.honey_block.break", poolPoint, 16, "{}");
            }
            sound(action, "minecraft:entity.experience_bottle.throw");
            // 点投：按真实抛物线飞向落点，落点与发射读同一次瞄准数据。
            const direction = gravity > 0
                ? (LivingActions.ballistic(action.origin(), action.targetPosition(), speed, gravity) || aim(action))
                : aim(action);
            let landed = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 120, direction: direction,
                appearance: { item: "minecraft:honey_bottle", scale: 0.9, glow: true },
                impact: function (current, hit) {
                    if (landed) return;
                    landed = true;
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck)) {
                        impact(current, hit, "syrupbomb", power, { damage: damageSpec("syrupbomb", "burst") });
                    }
                    scenes.stop(current, "lob");
                    splash(scope, hit.position(), hit.blockFace(), false);
                }
            }, function (current) {
                const scope = current.world();
                if (!splashed) {
                    // 只在弹体自己的真实终点结算：完成回调里能读到它最后的接触/结束点，不用瞄准点或满射程点假造。
                    const end = scope.projectilePosition(flight);
                    if (end === null) syrupbombFizzle(scope, current.targetPosition());
                    else splash(scope, end, "", true);
                }
                scenes.stop(current, "lob");
                scenes.finish(current, done);
            });
            scenes.show(action, "lob", action.origin(),
                { moment: "lob", projectile: flight, target: action.target() ? String(action.target()!.ref()) : "" });
        }
    });
}
