/**
 * 秘剑・千重涛 / ceaselessedge 的出手方式。
 *
 * 核心念头：一记贝壳之刃的斩击，刃锋掠过时甩下一片贝壳碎片留在落点地面；碎片插在那里谁踏上去就被割，
 *   同一片地上再斩一次会把碎片磨得更利。它是这一组里唯一**在对手脚下留下撒菱**的一击。
 *
 * 三幕：
 *   起（windup，提交前）：壳刃出鞘、刃身聚起珠光，只播预告，可被打断。
 *   斩（slash）：提交后朝目标一记 `cut` 接触斩击（暴击由本招自己的 `critChance` 掷取）。
 *   留（lay→tread／hum）：若斩中，碎片在落点地面插成半径 `patchRadius` 的圈（规则 `world_combat:hazard/shellshards`），
 *       并把同片地上的旧碎片并入、锋利度 +1（最多 `sharpMax` 层）。踏进来的贴地非友方吃一记重的 `shard`，
 *       留在圈里按间隔吃一记轻的（`standShare`）；未斩中只留一下碎屑。
 *
 * 与已有撒菱分开：撒菱是远程抛撒的纯布置、层数均匀加伤；千重涛是**近身斩击带出撒菱**，踏入第一刀最重，
 * 锋利度由施法者继续斩来养。
 */
namespace PokemonSkills {
    function ceaselessedgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    /** 落点收到地表上方一格：向下找第一块实体方块，把碎片圈放在它上面（中心在空气格）。 */
    function ceaselessedgeGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const baseX = Math.floor(point.x()), baseZ = Math.floor(point.z()), baseY = Math.floor(point.y());
        for (let dy = 1; dy >= -4; dy--) {
            const block = world.block(WorldCombat.point(baseX, baseY + dy, baseZ));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return WorldCombat.point(baseX + 0.5, baseY + dy + 1, baseZ + 0.5);
        }
        return point;
    }
    /** 找同一片地上自己留下的贝壳碎片，把锋利度并进新的一层（最多 max 层），旧圈收回。 */
    function ceaselessedgeSharpen(world: CombatWorld, point: CombatPoint, radius: number, max: number): number {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, ceaselessedgeRule);
        let sharpen = 1;
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            sharpen = Math.min(max, Math.max(sharpen, (Number(entry.data.sharpen) || 1) + 1));
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
        return sharpen;
    }
    /** 踩在碎片上：踏入第一刀按锋利度满额，留在圈里按 standShare 轻割。fresh 表示刚踏进来。 */
    function ceaselessedgeTread(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(6, Math.round(Number(field.data.interval) || 20));
        const sharpen = Math.max(1, Math.round(Number(field.data.sharpen) || 1));
        const gain = Math.max(0, Number(field.data.gain) || 0);
        const entry = Math.max(0, Number(field.data.shard) || 0) * (1 + (sharpen - 1) * gain);
        const power = fresh ? entry : entry * Math.max(0.1, Number(field.data.share) || 0.45);
        if (!hurt(world, actor, ceaselessedgeId, power, { damage: damageSpec(ceaselessedgeId, "shard"), type: "dark" })) return;
        WorldFeedback.emit(world, ceaselessedgeScene, 1, body.position(),
            { moment: "tread", target: ref, sharpen: sharpen, shards: Math.max(8, Math.round(10 + power * 0.6)),
                scale: field.radius / ceaselessedgeReference, fresh: fresh ? 1 : 0 }, 22);
        world.sound("cobblemon:impact.dark", body.position(), 14, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)), ceaselessedgeTreadText, [sharpen], 26);
    }
    /** 暴击由本招自己的几率掷取：命中瞬间在共享结算里决定是否暴击。 */
    function ceaselessedgeCrit(chance: number): (context: PokemonDamage.FeatureContext) => PokemonDamage.Metadata | undefined {
        return function (context: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (context.preview || !context.world) return undefined;
            return { critical: context.world.random() < chance };
        };
    }
    /** 一道斜掠的壳刃痕：过伤口、与瞄准方向垂直的平面里从一角划到对角。 */
    function ceaselessedgeSlash(centre: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const a = centre.minus(lateral.scale(reach * 0.5)).minus(WorldCombat.point(0, reach * 0.3, 0));
        const b = centre.plus(lateral.scale(reach * 0.5)).plus(WorldCombat.point(0, reach * 0.35, 0));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()]];
    }

    // 贝壳碎片圈：踏进来重割一次，留在圈里轻割；圈自己低频提示还在，锋利度越亮。规则登记一次，全场共用。
    WorldEffects.fieldRule(ceaselessedgeRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            ceaselessedgeTread(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            ceaselessedgeTread(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "ceaselessedge:field:" + effect.id(), ceaselessedgeScene, 1, ceaselessedgePoint(field),
                { moment: "hum", radius: field.radius, sharpen: Math.max(1, Math.round(Number(field.data.sharpen) || 1)),
                    shards: Math.max(12, Math.round(Number(field.data.shards) || 22)), scale: field.radius / ceaselessedgeReference }, 40);
        }
    });

    define({
        id: ceaselessedgeId,
        cooldownParameter: "recharge",
        name: "Ceaseless Edge",
        description: "A shell-blade slash cuts the target and sheds shell splinters that stay planted on the ground where it landed. Grounded foes that step in are cut hard the first time and lightly while they stay, and cutting the same ground again sharpens the splinters; it has a high chance to land a critical hit.",
        uses: ["近身斩一记，把贝壳碎片留在对手脚下成为撒菱", "在同一片地上反复斩，把碎片养成刀阵", "对着要害打出更高暴击的一刀"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.6,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "shell",
        stationary: true,
        defaults: { relentless: false, ai: { maxChase: 6, preferCluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[ceaselessedgeId], detail: { values: config } };
            return { radius: p(ceaselessedgeId, "reach", context), geometry: "line", style: "shell", color: 0xCFE8E0,
                label: config && config.relentless === true ? "千重涛·连涛" : "千重涛·沉涛" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ceaselessedgeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(ceaselessedgeId, "tempo", context)),
                recover: Math.round(p(ceaselessedgeId, "aftercast", context)),
                cooldown: Math.round(p(ceaselessedgeId, "recharge", context)),
                active: 0,
                range: p(ceaselessedgeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shards = Math.max(10, Math.round(p(ceaselessedgeId, "shards", action) * 0.5));
            action.present("ceaselessedge:windup:" + action.id(), ceaselessedgeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, shards: shards,
                    relentless: config && config.relentless === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const heading = aim(action);
            const target = action.target();
            const reach = Math.max(1.8, action.range());
            const power = p(ceaselessedgeId, "cut", action);
            const critChance = p(ceaselessedgeId, "critChance", action);
            const shard = p(ceaselessedgeId, "shard", action);
            const gain = p(ceaselessedgeId, "shardGain", action);
            const share = p(ceaselessedgeId, "standShare", action);
            const radius = Math.max(1.0, p(ceaselessedgeId, "patchRadius", action));
            const ticks = Math.max(80, Math.round(p(ceaselessedgeId, "patchTicks", action)));
            const interval = Math.max(6, Math.round(p(ceaselessedgeId, "treadInterval", action)));
            const shards = Math.max(10, Math.round(p(ceaselessedgeId, "shards", action)));
            const maxSharpen = Math.max(1, Math.round(p(ceaselessedgeId, "sharpMax", action)));
            const scale = radius / ceaselessedgeReference;

            const foe = target !== null && world.valid(target) ? world.observe(target) : null;
            const centre = foe !== null ? foe.position() : origin.plus(heading.scale(reach));

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, ceaselessedgeScene, 1, centre,
                { moment: "slash", path: ceaselessedgeSlash(centre, heading, reach), shards: shards, scale: scale }, 22);

            if (foe === null || !hurt(action, target!, ceaselessedgeId, power,
                { damage: damageSpec(ceaselessedgeId, "cut"), contact: true, slice: true, resolve: ceaselessedgeCrit(critChance) })) {
                WorldFeedback.emit(world, ceaselessedgeScene, 1, centre.minus(heading.scale(0.2)),
                    { moment: "miss", shards: Math.max(6, Math.round(shards * 0.5)), scale: scale }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), ceaselessedgeMissText, [], 20);
                done(action);
                return;
            }

            // 斩中：碎片插在落点地面，并把同片地上的旧碎片并入、锋利度 +1。
            const point = ceaselessedgeGround(world, centre);
            const sharpen = ceaselessedgeSharpen(world, point, radius, maxSharpen);
            WorldEffects.field(world, ceaselessedgeRule, point, radius,
                { shard: shard, gain: gain, share: share, sharpen: sharpen, interval: interval, shards: shards,
                    maxSharpen: maxSharpen, next: {} }, ticks);
            WorldFeedback.emit(world, ceaselessedgeScene, 1, point,
                { moment: "lay", radius: radius, sharpen: sharpen, shards: shards, scale: scale }, 30);
            WorldFeedback.keep(world, "ceaselessedge:hum:" + String(action.id()), ceaselessedgeScene, 1, point,
                { moment: "hum", radius: radius, sharpen: sharpen, shards: shards, scale: scale }, ticks);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.6, 0)), ceaselessedgeLayText, [sharpen], 30);
            world.sound("cobblemon:impact.dark", point, 14, "{}");
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记强调与浮字（暴击率来自本招的 critChance）。
    WorldCombat.on("world_combat:move_ceaselessedge/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== ceaselessedgeId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, ceaselessedgeScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: 16, scale: 1.1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), ceaselessedgeCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
