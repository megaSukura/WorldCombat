/**
 * 黏黏网 / stickyweb 的出手方式。
 *
 * 核心念头：把一团黏丝抛到选定的地面、摊成一张网留在地上；贴地的敌人踏进来脚步就被黏住、速度掉一档，
 *   留在网里这层黏劲一直被维持，走出后按剩余时间慢慢脱开。它不造成伤害，是本组唯一的纯减速陷阱。
 *
 * 三幕：
 *   起（windup，提交前）：口边拢起丝光的预告。
 *   抛（toss→spread）：提交后黏丝团沿低弧线飞出、落地摊成半径 webRadius 的网（WorldEffects.field，
 *       规则 `world_combat:hazard/stickyweb` 由本单元注册）；同一片地上再织会先收回旧网、重新计数。
 *   黏（snare→hum）：贴地的非友方 `enter` 时掉 dropStages 级速度并挂 `world_combat:stickywebbed`
 *       （身份 `world_combat:status/stickyweb`，持续拖慢移动）；留在网里按间隔刷新这层黏劲；网自己用低频
 *       网线提示还在。
 *
 * 反制：绕开黏网、等它到期（webTicks）；飞在半空的生物从网上方过去；走出网外黏劲按剩余时间自然脱开。
 */
namespace PokemonSkills {
    function stickywebPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 落点收到地表上方一格：共享的下投射助手，把网放在地表之上。 */
    function stickywebGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        return WorldGeometry.ground(world, point);
    }

    /** 同一片地上自己已织的网先收回：黏黏网不叠层，重织就是刷新时长与数值。 */
    function stickywebRefresh(world: CombatWorld, point: CombatPoint, radius: number): void {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, stickywebRule);
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
    }

    /** 黏住一个贴地目标：掉速度等级 + 挂黏身；fresh 表示刚踏进来（刚进来那一下掉级并报浮字）。 */
    function stickywebSnare(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const ticks = Math.max(40, Math.round(Number(field.data.strand) || 100));
        if (fresh) NativeEffects.boost(world, actor, "spe", -Math.max(1, Math.round(Number(field.data.stages) || 1)));
        if (MobEffects.apply(world, actor, stickywebEffect, ticks, 0) === null) return;
        WorldFeedback.emit(world, stickywebScene, 1, body.position(),
            { moment: "snare", target: ref, stages: Math.max(1, Math.round(Number(field.data.stages) || 1)),
                strands: Math.max(8, Math.round(Number(field.data.strands) || 18)), scale: field.radius / 2.6 }, 24);
        world.sound("minecraft:block.cobweb.place", body.position(), 14, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), stickywebSnareText,
            [Math.max(1, Math.round(Number(field.data.stages) || 1))], 26);
    }

    // 黏网：踏进来掉速度并黏住，留在网里持续维持黏劲；网自己低频提示还在。规则登记一次，全场共用。
    WorldEffects.fieldRule(stickywebRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stickywebSnare(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stickywebSnare(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "stickyweb:field:" + effect.id(), stickywebScene, 1, stickywebPoint(field),
                { moment: "hum", radius: field.radius, stages: Math.max(1, Math.round(Number(field.data.stages) || 1)),
                    strands: Math.max(12, Math.round(Number(field.data.strands) || 18)), scale: field.radius / 2.6 }, 40);
        }
    }, { tags: [WorldEffects.categories.hazard] });

    define({
        id: stickywebId,
        cooldownParameter: "recharge",
        name: "黏黏网",
        description: "把一团黏丝抛到选定的地面、摊成一张网：踏进来的贴地敌人速度掉一档，并在一段时间里被网黏住、脚步发沉；留在网里这层黏劲一直被维持。它不造成伤害，只把对手拖慢。飞在半空的生物从网上方过去。深锚式多降一级、黏得更久但网更小，广铺式网更大更快但只降一级。",
        uses: ["提前把一片地面变成减速区", "缠住冲锋或逃跑的敌人", "压低高速目标的机动"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 100,
        style: "stickyweb",
        defaults: { anchored: false },
        fields: [flag("anchored", "深锚")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stickywebId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stickywebId, "tempo", context)),
                recover: Math.round(p(stickywebId, "recover", context)),
                cooldown: Math.round(p(stickywebId, "recharge", context)),
                active: 0,
                range: p(stickywebId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("stickyweb:windup:" + action.id(), stickywebScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", anchored: config && config.anchored ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stickywebId], detail: { values: config } };
            return { radius: p(stickywebId, "webRadius", context), geometry: "area", style: "stickyweb", color: 0xE8DC9A,
                label: config && config.anchored === true ? "黏黏网·深锚" : "黏黏网·广铺" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p(stickywebId, "throwSpeed", action));
            const radius = Math.max(1.6, p(stickywebId, "webRadius", action));
            const ticks = Math.max(100, Math.round(p(stickywebId, "webTicks", action)));
            const strand = Math.max(40, Math.round(p(stickywebId, "strandTicks", action)));
            const stages = Math.max(1, Math.round(p(stickywebId, "dropStages", action)));
            const strands = Math.max(12, Math.round(p(stickywebId, "strands", action)));
            const scale = radius / 2.6;
            let spread = false;

            function lay(current: CombatAction, raw: CombatPoint): void {
                if (spread) return;
                spread = true;
                const scope = current.world();
                const point = stickywebGround(scope, raw);
                stickywebRefresh(scope, point, radius);
                WorldEffects.field(scope, stickywebRule, point, radius,
                    { stages: stages, strand: strand, interval: 30, strands: strands, next: {} }, ticks);
                WorldFeedback.emit(scope, stickywebScene, 1, point,
                    { moment: "spread", radius: radius, stages: stages, strands: strands, scale: scale }, 32);
                WorldFeedback.keep(scope, "stickyweb:hum:" + String(current.id()), stickywebScene, 1, point,
                    { moment: "hum", radius: radius, stages: stages, strands: strands, scale: scale }, ticks);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), stickywebLayText, [], 30);
                sound(current, "minecraft:block.cobweb.place");
                done(current);
            }

            sound(action, "cobblemon:move.stringshot.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.26, gravity: 0.03, lifetime: 100,
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.75, tint: 0xF2EAC0 },
                impact: function (current, hit) { lay(current, hit.position()); }
            }, function (current) { lay(current, current.targetPosition()); });
            WorldFeedback.emit(world, stickywebScene, 1, action.origin(),
                { moment: "throw", projectile: flight, strands: strands, scale: scale }, 26);
        }
    });
}
