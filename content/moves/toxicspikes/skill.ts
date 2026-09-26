/**
 * 毒菱 / toxicspikes 的出手方式。
 *
 * 核心念头：把一把带毒的菱角撒到选定的地面，插成一片毒菱留在那里；贴地的敌人踏进来就中毒，同一片同层地上
 *   再撒一次叠到第二层，踩到的就变成剧毒。毒属性的身体走进来会把整片毒菱吸掉。已经带着同等或更强毒素的目标
 *   只保留它自己的合法剩余时长，不会被每一下重置。
 *
 * 三幕：
 *   起（windup，提交前）：掌心拢起毒雾的预告。
 *   撒（toss→lay）：提交后毒菱沿低弧线飞出，落点必须吸到真实合法地表才插成半径 patchRadius 的毒菱阵
 *       （`WorldEffects.field`，规则 `world_combat:hazard/toxicspikes` 由本单元注册）；落在水面、岩浆或空中就落空。
 *       同一片同层地上已有的自方毒菱并入新的一层（最多 2 层），旧阵收回且表现随旧阵一起收。
 *   毒（poison→absorb→hum）：贴地、且脚部与毒菱同层的非友方 `enter` 时按层数上毒——1 层中毒、2 层剧毒
 *       （走共享状态身份，宝可梦那一层由共享默认效果同步成原生异常）；已有同等/更强毒则不重施，进出遵守同一
 *       冷却；毒属性走进来把整片毒菱吸掉（`absorb`），尖从地表收向它脚边、整片熄灭。阵自己用低频毒气提示还在。
 *
 * 反制：绕开毒菱阵、等它到期（patchTicks）；毒属性可以走进去把毒菱清掉；钢属性与共享门禁挡住的目标直接穿过。
 */
namespace PokemonSkills {
    export const toxicspikesToxicText = "world_combat.move.toxicspikes.text.toxic";

    function toxicspikesPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 落点必须收到真实合法地表的支撑：水、岩浆、基岩、屏障与空中都算落空。 */
    function toxicspikesLanding(world: CombatWorld, raw: CombatPoint): CombatPoint | null {
        const point = WorldGeometry.ground(world, raw, 6);
        const below = world.block(WorldCombat.point(point.x(), point.y() - 1, point.z()));
        if (below === null) return null;
        const id = String(below.id());
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return null;
        if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
        return point;
    }

    function toxicspikesFoot(body: CombatObservation): CombatPoint {
        return body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
    }

    /** 脚部与毒菱落在同一层地表才算踩上：楼上不踩楼下毒菱。 */
    function toxicspikesOnLayer(field: WorldEffects.Field, body: CombatObservation): boolean {
        return Math.abs(toxicspikesFoot(body).y() - field.position[1]) <= 0.8;
    }

    /**
     * 从毒菱略抬高的一点看向目标身体中心，墙与楼板挡住就不算踩到。
     * 场域本身关掉默认视线（`lineOfSight: false`），因为它落在贴地高度、默认射线容易在脚下地面反复判定；
     * 这里用自己的清晰起点重新做一次视线检查，保留隔墙/隔层的拦截。
     */
    function toxicspikesReaches(world: CombatWorld, field: WorldEffects.Field, body: CombatObservation): boolean {
        const origin = WorldCombat.point(field.position[0], field.position[1] + 0.35, field.position[2]);
        return world.clear(origin, body.position());
    }

    function toxicspikesTone(layers: number): string { return layers >= 2 ? "toxic" : "poison"; }

    /** 同一片同层地上自己布下的毒菱并入新层（最多 maxLayers），旧阵收回。 */
    function toxicspikesLayers(world: CombatWorld, point: CombatPoint, radius: number, max: number): number {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, toxicspikesRule);
        let layers = 1;
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            if (Math.abs(entry.position[1] - point.y()) > 0.8) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            layers = Math.min(max, Math.max(layers, (Number(entry.data.layers) || 1) + 1));
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
        return layers;
    }

    /** 毒属性把整片毒菱吸掉：尖从地表收向它的脚边，标记整阵失效，交给下一次扫描让它自然到期、表现一起收。 */
    function toxicspikesAbsorb(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        field.data.absorbed = true;
        const body = world.observe(actor);
        if (body === null) return;
        const centre = toxicspikesPoint(field);
        const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
        const fumes = Math.max(8, Math.round(Number(field.data.fumes) || 16));
        WorldFeedback.emit(world, toxicspikesScene, 1, centre,
            { moment: "absorb", target: String(actor.ref()), tone: toxicspikesTone(layers),
                path: [[centre.x(), centre.y(), centre.z()], String(actor.ref())],
                fumes: fumes, layers: layers, scale: field.radius / 2.2 }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), toxicspikesAbsorbText, [], 26);
        world.sound("cobblemon:impact.poison", body.position(), 16, "{}");
    }

    /**
     * 踩在毒菱上：按层数上中毒/剧毒；已有的同等或更强毒只保留它自己的合法剩余时长，不重施、不重置剧毒进度。
     * 进出遵守同一 `next` 冷却，短暂出入不能靠蹭边反复上毒。
     */
    function toxicspikesStatus(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, entering: boolean): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded() || !toxicspikesOnLayer(field, body) || !toxicspikesReaches(world, field, body)) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (now < (next[ref] || 0)) return;
        const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
        const wantToxic = layers >= 2;
        const hasToxic = CombatStatus.has(world, actor, "toxic");
        const hasPoison = hasToxic || CombatStatus.has(world, actor, "poison");
        // 同等或更强的毒已经存在：留它自己的时长，不把剧毒的递增进度每一下重置。
        if (hasPoison && (hasToxic || !wantToxic)) return;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const ticks = Math.max(20, Math.round(Number(field.data.status) || 200));
        if (!CombatStatus.inflict(world, actor, wantToxic ? "toxic" : "poison", ticks)) return;
        const fumes = Math.max(8, Math.round(Number(field.data.fumes) || 16));
        WorldFeedback.emit(world, toxicspikesScene, 1, body.position(),
            { moment: "poison", target: ref, layers: layers, toxic: wantToxic ? 1 : 0, tone: toxicspikesTone(layers),
                fumes: fumes, scale: field.radius / 2.2 }, 24);
        world.sound(wantToxic ? "cobblemon:status.nonvolatile.toxpoison.actor" : "cobblemon:status.nonvolatile.poison.actor", body.position(), 14, "{}");
        if (entering) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), wantToxic ? toxicspikesToxicText : toxicspikesPoisonText, [], 26);
    }

    // 毒菱阵：踏进来中毒（毒属性吸掉整阵），留在阵里维护同一状态；阵自己低频提示还在，表现随这个 field 效果一起收。
    WorldEffects.fieldRule(toxicspikesRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.absorbed || world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null || !body.grounded() || !toxicspikesOnLayer(field, body) || !toxicspikesReaches(world, field, body)) return;
            if (PokemonDamage.combatants.read(world, actor).types.indexOf("poison") >= 0) { toxicspikesAbsorb(world, actor, field); return; }
            toxicspikesStatus(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.absorbed || world.friendly(actor)) return;
            toxicspikesStatus(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (field.data.absorbed) { effect.remaining(1); return; }
            const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
            WorldFeedback.onEffect(world, effect.id(), "toxicspikes:field:" + effect.id(), toxicspikesScene, 1, toxicspikesPoint(field),
                { moment: "hum", radius: field.radius, layers: layers, tone: toxicspikesTone(layers),
                    fumes: Math.max(10, Math.round(Number(field.data.fumes) || 16)), scale: field.radius / 2.2 });
        }
    }, { tags: [WorldEffects.categories.hazard], lineOfSight: false, transferable: true });

    define({
        id: toxicspikesId,
        cooldownParameter: "recharge",
        name: "毒菱",
        description: "把一把带毒的菱角撒到选定的地面上，插成一片毒菱：踏进来的贴地敌人中毒，留在里面毒素维持。在同一片同层地上再由同一施放者撒一次会叠到第二层，踩到的就变成剧毒（已经同等或更毒的目标不会被重施）。敌方毒属性的身体走进来会把整片毒菱吸掉；钢属性与免疫者直接穿过。",
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
                const point = toxicspikesLanding(scope, raw);
                if (point === null) {
                    WorldFeedback.emit(scope, toxicspikesScene, 1, raw, { moment: "miss", fumes: fumes, scale: scale }, 18);
                    sound(current, "cobblemon:impact.poison");
                    done(current);
                    return;
                }
                const layers = toxicspikesLayers(scope, point, radius, maxLayers);
                const field = WorldEffects.field(scope, toxicspikesRule, point, radius,
                    { layers: layers, status: status, interval: 30, fumes: fumes, absorbed: false, next: {} }, ticks);
                WorldFeedback.emit(scope, toxicspikesScene, 1, point,
                    { moment: "lay", radius: radius, layers: layers, tone: toxicspikesTone(layers), fumes: fumes, scale: scale }, 30);
                WorldFeedback.onEffect(scope, field, "toxicspikes:hum", toxicspikesScene, 1, point,
                    { moment: "hum", radius: radius, layers: layers, tone: toxicspikesTone(layers), fumes: fumes, scale: scale });
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
