/**
 * 毒菱 / toxicspikes 的出手方式。
 *
 * 核心念头：把一把带毒的菱角撒到选定的地面，插成一片毒菱留在那里；贴地的敌人踏进来就中毒，留在里面
 *   毒素被持续维持；同一片地上再撒一次叠到第二层，踩到的就变成剧毒。毒属性的身体走进来会把整片毒菱吸掉。
 *
 * 三幕：
 *   起（windup，提交前）：掌心拢起毒雾的预告。
 *   撒（toss→lay）：提交后毒菱沿低弧线飞出、落地插开成半径 patchRadius 的毒菱阵
 *       （WorldEffects.field，规则 `world_combat:hazard/toxicspikes` 由本单元注册）；同一片地上已有的自方毒菱
 *       并入新的一层（最多 2 层），旧阵收回。
 *   毒（poison→absorb→hum）：贴地的非友方 `enter` 时按层数上毒——1 层中毒、2 层剧毒（走共享状态身份，
 *       宝可梦那一层由共享默认效果同步成原生异常）；毒属性走进来把整片毒菱吸掉（`absorb`），不中毒；
 *       留在阵里的目标按间隔被维持毒素；阵自己用低频毒气提示还在。
 *
 * 反制：绕开毒菱阵、等它到期（patchTicks）；毒属性可以走进去把毒菱清掉；钢属性与共享门禁挡住的目标直接穿过。
 */
namespace PokemonSkills {
    export const toxicspikesToxicText = "world_combat.move.toxicspikes.text.toxic";

    function toxicspikesPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 落点收到地表上方一格：共享的下投射助手。 */
    function toxicspikesGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        return WorldGeometry.ground(world, point);
    }

    /** 同一片地上自己布下的毒菱并入新层（最多 maxLayers），旧阵收回。 */
    function toxicspikesLayers(world: CombatWorld, point: CombatPoint, radius: number, max: number): number {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, toxicspikesRule);
        let layers = 1;
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            layers = Math.min(max, Math.max(layers, (Number(entry.data.layers) || 1) + 1));
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
        return layers;
    }

    /** 毒属性把整片毒菱吸掉：标记整阵失效，交给下一次扫描让它自然到期。 */
    function toxicspikesAbsorb(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        field.data.absorbed = true;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, toxicspikesScene, 1, body.position(),
            { moment: "absorb", target: String(actor.ref()), fumes: Math.max(8, Math.round(Number(field.data.fumes) || 16)),
                scale: field.radius / 2.2 }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), toxicspikesAbsorbText, [], 26);
        world.sound("cobblemon:impact.poison", body.position(), 16, "{}");
    }

    /** 踩在毒菱上：按层数上中毒/剧毒；fresh 表示刚踏进来（不吃节流、报一句浮字）。 */
    function toxicspikesPoison(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
        const toxic = layers >= 2;
        const ticks = Math.max(20, Math.round(Number(field.data.status) || 200));
        if (!CombatStatus.inflict(world, actor, toxic ? "toxic" : "poison", ticks)) return;
        WorldFeedback.emit(world, toxicspikesScene, 1, body.position(),
            { moment: "poison", target: ref, layers: layers, toxic: toxic ? 1 : 0,
                fumes: Math.max(8, Math.round(Number(field.data.fumes) || 16)), scale: field.radius / 2.2 }, 24);
        world.sound(toxic ? "cobblemon:status.nonvolatile.toxpoison.actor" : "cobblemon:status.nonvolatile.poison.actor", body.position(), 14, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), toxic ? toxicspikesToxicText : toxicspikesPoisonText, [], 26);
    }

    // 毒菱阵：踏进来中毒（毒属性吸掉整阵），留在阵里维持毒素；阵自己低频提示还在。规则登记一次，全场共用。
    WorldEffects.fieldRule(toxicspikesRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.absorbed || world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null || !body.grounded()) return;
            if (PokemonDamage.combatants.read(world, actor).types.indexOf("poison") >= 0) { toxicspikesAbsorb(world, actor, field); return; }
            toxicspikesPoison(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.absorbed || world.friendly(actor)) return;
            toxicspikesPoison(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (field.data.absorbed) { effect.remaining(1); return; }
            WorldFeedback.keep(world, "toxicspikes:field:" + effect.id(), toxicspikesScene, 1, toxicspikesPoint(field),
                { moment: "hum", radius: field.radius, layers: Math.max(1, Math.round(Number(field.data.layers) || 1)),
                    fumes: Math.max(10, Math.round(Number(field.data.fumes) || 16)), scale: field.radius / 2.2 }, 40);
        }
    }, { tags: [WorldEffects.categories.hazard] });

    define({
        id: toxicspikesId,
        name: "毒菱",
        description: "把一把带毒的菱角撒到选定的地面上，插成一片毒菱：踏进来的贴地敌人中毒，留在里面毒素持续被维持。在同一片地上再撒一次会叠到第二层，踩到的就变成剧毒。毒属性的身体走进来会把整片毒菱吸掉；钢属性与免疫者直接穿过。",
        uses: ["提前封住一条通道或门口", "让追击的敌人持续中毒", "叠到第二层逼出剧毒"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 95,
        style: "toxicspikes",
        defaults: { virulent: false },
        fields: [flag("virulent", "烈毒")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[toxicspikesId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(toxicspikesId, "tempo", context)),
                recover: Math.round(p(toxicspikesId, "recover", context)),
                cooldown: Math.round(p(toxicspikesId, "recharge", context)),
                active: 0,
                range: p(toxicspikesId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("toxicspikes:windup:" + action.id(), toxicspikesScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", virulent: config && config.virulent ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[toxicspikesId], detail: { values: config } };
            return { radius: p(toxicspikesId, "patchRadius", context), geometry: "area", style: "toxicspikes", color: 0x9B4FBE,
                label: config && config.virulent === true ? "毒菱·烈毒" : "毒菱·缓和" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p(toxicspikesId, "throwSpeed", action));
            const radius = Math.max(1.4, p(toxicspikesId, "patchRadius", action));
            const ticks = Math.max(100, Math.round(p(toxicspikesId, "patchTicks", action)));
            const status = Math.max(20, Math.round(p(toxicspikesId, "statusTicks", action)));
            const fumes = Math.max(10, Math.round(p(toxicspikesId, "fumes", action)));
            const maxLayers = Math.max(1, Math.round(p(toxicspikesId, "maxLayers", action)));
            const scale = radius / 2.2;
            let laid = false;

            function lay(current: CombatAction, raw: CombatPoint): void {
                if (laid) return;
                laid = true;
                const scope = current.world();
                const point = toxicspikesGround(scope, raw);
                const layers = toxicspikesLayers(scope, point, radius, maxLayers);
                WorldEffects.field(scope, toxicspikesRule, point, radius,
                    { layers: layers, status: status, interval: 30, fumes: fumes, absorbed: false, next: {} }, ticks);
                WorldFeedback.emit(scope, toxicspikesScene, 1, point,
                    { moment: "lay", radius: radius, layers: layers, fumes: fumes, scale: scale }, 30);
                WorldFeedback.keep(scope, "toxicspikes:hum:" + String(current.id()), toxicspikesScene, 1, point,
                    { moment: "hum", radius: radius, layers: layers, fumes: fumes, scale: scale }, ticks);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), toxicspikesLayText, [layers], 30);
                sound(current, "cobblemon:impact.poison");
                done(current);
            }

            sound(action, "cobblemon:move.poisonpowder.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.24, gravity: 0.03, lifetime: 100,
                appearance: { sprite: "cobblemon:generic/goo/ooze", scale: 0.8, tint: 0x9B4FBE },
                impact: function (current, hit) { lay(current, hit.position()); }
            }, function (current) { lay(current, current.targetPosition()); });
            WorldFeedback.emit(world, toxicspikesScene, 1, action.origin(),
                { moment: "throw", projectile: flight, fumes: fumes, scale: scale }, 26);
        }
    });
}
