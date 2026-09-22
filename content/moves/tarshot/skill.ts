/**
 * 沥青射击 / tarshot — 执行组织。
 *
 * 核心念头：**把一团黏稠的沥青泼在目标身上**——它糊住脚步（速度 -1、移动变黏），也糊开了它对火焰的弱点
 *   （任何火属性招式打上去伤害 ×2）；泼洒过的地方会留下沥青滩，谁踩进去谁被糊上，水会把它冲掉。
 *
 * 三幕：
 *   起（windup，提交前）：沥青在口边聚成一团黑亮（只观察与预告）。
 *   泼（shot → coat，提交后）：沥青团沿直线飞出；命中活体即糊身：
 *       挂共享身份 `world_combat:status/tarshot` 的 `world_combat:tar_coated`（糊身时长），
 *       首次命中再掉 `speedDrop` 级速度，并在命中点留下 `puddle` 半径的沥青滩
 *       （`world_combat:field/tar` 规则：踩进去的非友方同样被糊上）；大泼形态把 `splash` 半径内的非友方一起糊上。
 *   验（弱点）：结算任何火属性招式时，`PokemonDamage.metadata` 读取目标的 `tarshot` 身份，把这一段威力 ×2；
 *       火打在糊了沥青的目标上还会把它点着一下（flare）；目标湿身或下雨时沥青被冲掉（wash）。
 *
 * 与同族分开：它不封锁退路，而是同时降速度、开弱点；目标身上黑亮发黏、脚下留一滩黑，谁都能一眼读出。
 *
 * 配置 `wide`（大泼）由 resolve 改时序与射程，由公式改覆盖半径与飞行：能一次糊多人，但更慢更近更费。
 */
namespace PokemonSkills {
    const tarshotId = "tarshot";
    const tarshotScene = "world_combat:move_tarshot";
    const tarshotCoated = "world_combat:tar_coated";
    const tarshotField = "world_combat:tar";
    const tarshotPuddleBlock = "minecraft:black_concrete";
    /** 被糊住时的导航速度系数：沥青黏住脚步，AI 的移动意图也被压到六成。 */
    const tarshotStick = 0.4;
    const tarshotCoatText = "world_combat.move.tarshot.text.coat";
    const tarshotWashText = "world_combat.move.tarshot.text.wash";

    /** 结算任何招式时读取目标的沥青身份：火属性那一段的威力 ×2（原作的「弱点变为火」）。 */
    PokemonDamage.metadata.define({
        id: "world_combat:move_tarshot/weakness",
        applies: function (context) {
            return context.metadata.type === "fire" && !!context.target && !!context.world
                && CombatStatus.has(context.world, context.target, "tarshot");
        },
        apply: function (context) { context.metadata.power *= tarshotWeakness; }
    });

    /** 沥青滩：踩进去的非友方被糊上同样的沥青。 */
    WorldEffects.fieldRule(tarshotField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const data = field.data || {};
            if (MobEffects.read(world, actor, tarshotCoated) !== null) return;
            MobEffects.apply(world, actor, tarshotCoated, Math.max(20, Math.round(data.ticks || 60)), 0);
            const drop = typeof data.drop === "number" ? data.drop : 0;
            if (drop > 0) NativeEffects.boost(world, actor, "spe", -drop);
        }
    });

    /** 在命中点/落点铺一小滩沥青：把最上面那层地表替换成租借的黑块，到期原方块回来。 */
    function tarshotPuddle(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], r = Math.ceil(radius), baseY = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            for (let dy = 1; dy >= -4; dy--) {
                const at = WorldCombat.point(centre.x() + dx, baseY + dy, centre.z() + dz);
                const block = world.block(at);
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water" || id === "minecraft:lava") break;
                cells.push({ x: Math.floor(at.x()), y: Math.floor(at.y()), z: Math.floor(at.z()), block: tarshotPuddleBlock });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    /** 糊身：挂身份、首次命中掉速度、在脚下留下沥青滩。 */
    function tarshotCoat(world: CombatWorld, actor: CombatActor, ticks: number, drop: number, drops: number): void {
        const fresh = MobEffects.read(world, actor, tarshotCoated) === null;
        MobEffects.apply(world, actor, tarshotCoated, ticks, 0);
        if (fresh && drop > 0) NativeEffects.boost(world, actor, "spe", -drop);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, tarshotScene, 1, body.position(),
            { moment: "coat", target: String(actor.ref()), drops: drops, fresh: fresh ? 1 : 0,
                scale: Math.max(0.6, Math.min(2.4, body.width() / 0.9)) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), tarshotCoatText, [drop], 28);
    }

    // 沥青黏住脚步：被糊期间 AI 的导航速度压到六成（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_tarshot/stick", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), tarshotCoated) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = Math.max(0, (typeof data.speed === "number" ? data.speed : 0.2) * tarshotStick);
        event.data(JSON.stringify(data));
    });

    // 水会把沥青冲掉：湿身（下雨、泡水）时精确移除这层沥青。
    WorldCombat.on("world_combat:move_tarshot/wash", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tarshotCoated) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null || !body.wet()) return;
        const tar = MobEffects.read(world, actor, tarshotCoated);
        if (tar !== null && world.removeMobEffect(actor, tarshotCoated, tar.key())) {
            WorldFeedback.emit(world, tarshotScene, 1, body.position(), { moment: "wash", target: String(actor.ref()) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), tarshotWashText, [], 22);
        }
    });

    // 火点着了沥青：糊身期间挨了火属性伤害或身上着火，就再点一下（flare），并留下火星。
    WorldCombat.on("world_combat:move_tarshot/flare", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), target = event.target();
        if (target === null || !world.valid(target)) return;
        const data = JSON.parse(String(event.data()));
        const fire = data.type === "fire"
            || ["inFire", "onFire", "lava", "hotFloor", "fireball", "unattributedFireball", "campfire"].indexOf(String(data.cause || "")) >= 0;
        if (!fire || MobEffects.read(world, target, tarshotCoated) === null) return;
        const body = world.observe(target);
        if (body === null) return;
        world.ignite(target, 30);
        WorldFeedback.emit(world, tarshotScene, 1, body.position(), { moment: "flare", target: String(target.ref()) }, 24);
        world.sound("cobblemon:impact.fire", body.position(), 12, "{}");
    });

    define({
        id: tarshotId,
        name: "沥青射击",
        description: "把一团黏稠的沥青泼向一个对手：命中后糊住它，降低它的速度等级、压慢它的脚步，并让它在糊身期间对火焰的弱点翻倍——任何火属性招式打上去伤害 ×2。命中点会留下一滩沥青，踩进去的非友方同样被糊上；水会把沥青冲掉。",
        uses: ["在队友的火招之前先糊住目标", "拖慢一个高速目标并逼它退开", "把一片地面泼成谁踩谁黏的沥青滩"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "tar",
        defaults: { wide: false, ai: { maxChase: 12, coatFirst: true, leaveStation: false } },
        fields: [
            flag("wide", "大泼")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tarshotId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(tarshotId, "tempo", context)),
                recover: Math.round(p(tarshotId, "aftercast", context)),
                cooldown: Math.round(p(tarshotId, "recharge", context)),
                active: 1,
                range: p(tarshotId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tarshot:windup", tarshotScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(tarshotId, "reach"), geometry: "line", style: "tar", color: 0x1E1A17,
                label: config && config.wide === true ? "沥青射击·大泼" : "沥青射击" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.5, p(tarshotId, "globSpeed", action));
            const radius = Math.max(0.15, p(tarshotId, "globRadius", action));
            const reach = Math.max(2, p(tarshotId, "reach", action));
            const coatTicks = Math.max(40, Math.round(p(tarshotId, "coatTicks", action)));
            const drop = Math.max(0, Math.round(p(tarshotId, "speedDrop", action)));
            const splash = Math.max(0.4, p(tarshotId, "splash", action));
            const weakness = tarshotWeakness;
            const puddle = Math.max(0.4, p(tarshotId, "puddle", action));
            const puddleTicks = Math.max(40, Math.round(p(tarshotId, "puddleTicks", action)));
            const drops = Math.max(6, Math.round(p(tarshotId, "drops", action)));
            const wide = !!(config && config.wide);
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function splat(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                const area = wide ? splash : Math.max(0.4, splash * 0.4);
                let caught = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, area), function (actor) {
                    tarshotCoat(scope, actor, coatTicks, drop, drops);
                    caught++;
                });
                tarshotPuddle(scope, point, wide ? puddle * 1.15 : puddle, puddleTicks);
                WorldEffects.field(scope, tarshotField, point, wide ? puddle * 1.15 : puddle,
                    { ticks: coatTicks, drop: drop }, puddleTicks);
                WorldFeedback.emit(scope, tarshotScene, 1, point,
                    { moment: "splat", drops: drops, caught: caught, weakness: weakness, scale: area / 1.5 }, 24);
            }

            sound(action, "minecraft:block.slime_block.place");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius,
                lifetime: Math.max(40, Math.round(reach / Math.max(0.2, speed) + 30)),
                appearance: { item: "minecraft:black_dye", scale: Math.max(0.8, radius * 2.4), tint: 0x1E1A17 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                        tarshotCoat(scope, struck, coatTicks, drop, drops);
                    }
                    splat(current, hit.position());
                    scope.sound("minecraft:block.honey_block.place", hit.position(), 12, "{}");
                }
            }, function (current: CombatAction) {
                splat(current, current.targetPosition());
                finish(current);
            });
            WorldFeedback.emit(world, tarshotScene, 1, action.origin(),
                { moment: "shot", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    drops: drops, scale: Math.max(0.6, Math.min(1.8, radius * 3)) }, 40);
        }
    });
}
