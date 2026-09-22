/**
 * 隐形岩 / stealthrock 的出手方式。
 *
 * 核心念头：抬手把一圈碎石抬到选定的地点悬浮起来，石阵留在那里缓缓浮沉；谁闯进这片空域就被砸一次，
 *   留在里面再被砸。它不要求目标落地——飞行的、跳起来的都躲不掉；砸伤走岩属性，越怕岩的吃得越重。
 *
 * 三幕：
 *   起（windup，提交前）：脚边碎石浮起的预告。
 *   抬（raise→settle）：提交后碎石飞向落点，散成半径 fieldRadius 的悬浮石阵（WorldEffects.field，
 *       规则 `world_combat:hazard/stealthrock` 由本单元注册）；同一片地上再放会先收回旧阵、重新计数。
 *   砸（hit→hum）：石阵存续 stoneTicks；进入空域的非友方 `enter` 时结算一次 `fall`（岩属性、几乎无视防御），
 *       留在里面每隔 stoneInterval 再被砸。沉岩式只砸落地目标，浮岩式连空中的一起砸。
 *
 * 反制：绕开石阵、等它到期（stoneTicks）；沉岩式可以靠飞行/离地躲过，浮岩式不行——那时只能用走位与时长。
 */
namespace PokemonSkills {
    function stealthrockPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 同一片地上自己已布下的石阵先收回：隐形岩不叠层，重放就是刷新时长与数值。 */
    function stealthrockRefresh(world: CombatWorld, point: CombatPoint, radius: number): void {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, stealthrockRule);
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
    }

    /** 被石阵砸中：按 stoneInterval 节流结算一次 `fall`；fresh 表示刚进入（不吃节流、报一句浮字）。 */
    function stealthrockStrike(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null) return;
        if (Number(field.data.heavy) && !body.grounded()) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const power = Math.max(0, Number(field.data.fall) || 0);
        if (!hurt(world, actor, stealthrockId, power, { damage: damageSpec(stealthrockId, "fall"), type: "rock" })) return;
        WorldFeedback.emit(world, stealthrockScene, 1, body.position(),
            { moment: "hit", target: ref, stones: Math.max(6, Math.round(8 + power * 0.4)), scale: field.radius / 2.6 }, 24);
        world.sound("cobblemon:impact.rock", body.position(), 16, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)), stealthrockHitText, [], 26);
    }

    // 悬浮石阵：踏进来砸一次，留在里面按间隔再砸；阵自己用低频悬浮石块提示还在。规则登记一次，全场共用。
    WorldEffects.fieldRule(stealthrockRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stealthrockStrike(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stealthrockStrike(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "stealthrock:field:" + effect.id(), stealthrockScene, 1, stealthrockPoint(field),
                { moment: "hum", radius: field.radius, heavy: Number(field.data.heavy) ? 1 : 0,
                    stones: Math.max(12, Math.round(Number(field.data.stones) || 18)), scale: field.radius / 2.6 }, 40);
        }
    }, { tags: [WorldEffects.categories.hazard] });

    define({
        id: stealthrockId,
        name: "隐形岩",
        description: "抬手把一圈碎石抬到选定的地点悬浮起来，石阵留在那里浮沉：谁闯进这片空域就被砸一次，留在里面会持续被砸。它不要求目标落地，飞在空中的敌人一样会被砸到；砸伤走岩属性，越怕岩的对手吃到的越重。沉岩式砸得更重更久但只砸落地目标，浮岩式能连空中的一起砸但更轻。",
        uses: ["提前在敌人必经的空域布下石阵", "专门惩罚怕岩的目标", "让飞行的敌人也躲不掉"],
        kind: "point",
        range: 9,
        maxRange: 13,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 110,
        style: "stealthrock",
        defaults: { heavy: false },
        fields: [flag("heavy", "沉岩")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stealthrockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stealthrockId, "tempo", context)),
                recover: Math.round(p(stealthrockId, "recover", context)),
                cooldown: Math.round(p(stealthrockId, "recharge", context)),
                active: 0,
                range: p(stealthrockId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("stealthrock:windup:" + action.id(), stealthrockScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", heavy: config && config.heavy ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stealthrockId], detail: { values: config } };
            return { radius: p(stealthrockId, "fieldRadius", context), geometry: "area", style: "stealthrock", color: 0xB7B3A6,
                label: config && config.heavy === true ? "隐形岩·沉岩" : "隐形岩·浮岩" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const heavy = !!(config && config.heavy);
            const speed = Math.max(0.6, p(stealthrockId, "raiseSpeed", action));
            const radius = Math.max(1.8, p(stealthrockId, "fieldRadius", action));
            const ticks = Math.max(100, Math.round(p(stealthrockId, "stoneTicks", action)));
            const fall = p(stealthrockId, "fall", action);
            const interval = Math.max(10, Math.round(p(stealthrockId, "stoneInterval", action)));
            const stones = Math.max(12, Math.round(p(stealthrockId, "stones", action)));
            const scale = radius / 2.6;
            let raised = false;

            function raise(current: CombatAction, point: CombatPoint): void {
                if (raised) return;
                raised = true;
                const scope = current.world();
                stealthrockRefresh(scope, point, radius);
                WorldEffects.field(scope, stealthrockRule, point, radius,
                    { fall: fall, interval: interval, stones: stones, heavy: heavy ? 1 : 0, next: {} }, ticks);
                WorldFeedback.emit(scope, stealthrockScene, 1, point,
                    { moment: "raise", radius: radius, heavy: heavy ? 1 : 0, stones: stones, scale: scale }, 34);
                WorldFeedback.keep(scope, "stealthrock:hum:" + String(current.id()), stealthrockScene, 1, point,
                    { moment: "hum", radius: radius, heavy: heavy ? 1 : 0, stones: stones, scale: scale }, ticks);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), stealthrockRaiseText, [], 30);
                sound(current, "cobblemon:impact.rock");
                done(current);
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.28, gravity: 0.02, lifetime: 110,
                appearance: { item: "minecraft:cobblestone", scale: 0.85 },
                impact: function (current, hit) { raise(current, hit.position()); }
            }, function (current) { raise(current, current.targetPosition()); });
            WorldFeedback.emit(world, stealthrockScene, 1, action.origin(),
                { moment: "throw", projectile: flight, stones: stones, heavy: heavy ? 1 : 0, scale: scale }, 26);
        }
    });
}
