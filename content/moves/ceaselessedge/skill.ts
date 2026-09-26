/**
 * 秘剑・千重涛 / ceaselessedge 的出手方式。
 *
 * 核心念头：一记贝壳之刃朝瞄准方向斩出，刃锋掠过时甩下一片贝壳碎片留在落点地面；碎片插在那里谁踏上去就被割，
 *   同一片地上再斩一次会把碎片磨得更利。它是这一组里唯一**贴地撒菱**的一击——重伤来自踩进/跨过碎片边界，
 *   留在圈里只有有界低频的轻割，原地不动不会反复领到踏入那一刀。
 *
 * 三幕：
 *   起（windup，提交前）：壳刃出鞘、刃身聚起珠光，只播预告，可被打断。
 *   斩（slash）：提交后朝瞄准方向做一记 `cut` 接触斩击（真实 ray 碰到第一个敌对目标才结算；墙会拦住）。
 *   留（lay→tread／graze／hum）：无论是否斩中实体，只要刀锋落点没有隔着墙，碎片就在落点地面插成半径 `patchRadius` 的圈
 *       （规则 `world_combat:hazard/shellshards`），并把同片地上的旧碎片并入、锋利度 +1（最多 `sharpMax` 层）。
 *       贴地非友方朝圈里踏入/跨过边界吃一记重的 `shard`（`tread`），留在圈里按 `treadInterval` 间隔吃一记轻的（`graze`）；
 *       飞行对象不会被割。未斩中且落点被墙挡住时才只留一下碎屑。
 *
 * 与已有撒菱分开：撒菱是远程抛撒的纯布置、层数均匀加伤；千重涛是**近身斩击带出撒菱**，踏入第一刀最重、
 * 锋利度由施法者继续斩来养。自由瞄准：`kind: "aim"`，可选任意阵营实体或方向/地点；target 为 null 时按方向斩。
 */
namespace PokemonSkills {
    function ceaselessedgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
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
    /** 踩在碎片上：踏入/跨过边界第一刀按锋利度满额（tread），留在圈里按 standShare 轻割（graze）。只对贴地的非友方生效。 */
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
            { moment: fresh ? "tread" : "graze", target: ref, sharpen: sharpen, shards: Math.max(8, Math.round(10 + power * 0.6)),
                scale: field.radius / ceaselessedgeReference, fresh: fresh ? 1 : 0 }, fresh ? 22 : 16);
        world.sound("cobblemon:impact.dark", body.position(), fresh ? 14 : 9, "{}");
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

    // 贝壳碎片圈：踏进来/跨过边界重割一次，留在圈里轻割；圈自己低频提示还在，锋利度越亮。规则登记一次，全场共用。
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
            // 持续表现挂在本效果的 id 上，随碎片圈自然到期或提前驱散一起收掉。
            WorldFeedback.onEffect(world, effect.id(), "ceaselessedge:field", ceaselessedgeScene, 1, ceaselessedgePoint(field),
                { moment: "hum", radius: field.radius, layerRadius: field.radius * (1 + 0.14 * (Math.max(1, Math.round(Number(field.data.sharpen) || 1)) - 1)),
                    layers: Math.max(1, Math.round(Number(field.data.sharpen) || 1)),
                    gleam: Math.min(1, 0.35 + Math.max(1, Math.round(Number(field.data.sharpen) || 1)) * 0.2),
                    shards: Math.max(12, Math.round(Number(field.data.shards) || 22)), scale: field.radius / ceaselessedgeReference });
        }
    });

    define({
        id: ceaselessedgeId,
        cooldownParameter: "recharge",
        name: "Ceaseless Edge",
        description: "朝瞄准方向一记贝壳之刃的斩击，把散落的贝壳碎片留在刀锋落点地面成为撒菱：踏进来或跨过边界的贴地敌人第一刀被重割、留在圈里按间隔被轻割；在同一片地上再斩会把碎片磨得更利（最多三层）。刀锋被墙挡住就不隔墙远摆。这一刀瞄准要害，暴击率高于普通招。",
        uses: ["近身斩一记，把贝壳碎片留在对手脚下成为撒菱", "在同一片地上反复斩，把碎片养成刀阵", "对着要害打出更高暴击的一刀"],
        kind: "aim",
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
            const heading = WorldGeometry.flatUnit(aim(action));
            const target = action.target();
            const reach = Math.max(1.8, action.range());
            const cut = p(ceaselessedgeId, "cut", action);
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
            const tip = origin.plus(heading.scale(reach));

            // 真实接触：刀锋从站位到落点扫一条射线，碰到第一个敌对生物才算命中；墙会在中途拦住。
            const contact = action.trace(origin, tip, 0.7, false);
            const struck = contact.hitEntity() ? contact.target() : null;
            const blocked = contact.blocked() && !contact.hitEntity();
            const body = struck !== null && world.valid(struck) ? world.observe(struck) : null;
            const centre = body !== null ? body.position() : tip;

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, ceaselessedgeScene, 1, centre,
                { moment: "slash", path: ceaselessedgeSlash(centre, heading, reach), shards: shards, scale: scale }, 22);

            let landed = false;
            if (struck !== null && world.valid(struck) && !world.friendly(struck))
                landed = hurt(action, struck, ceaselessedgeId, cut,
                    { damage: damageSpec(ceaselessedgeId, "cut"), contact: true, slice: true, resolve: ceaselessedgeCrit(critChance) });
            if (!landed) {
                WorldFeedback.emit(world, ceaselessedgeScene, 1, tip.minus(heading.scale(0.2)),
                    { moment: "miss", shards: Math.max(6, Math.round(shards * 0.5)), scale: scale, blocked: blocked ? 1 : 0 }, 18);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.9, 0)), ceaselessedgeMissText, [], 20);
            }

            // 刀锋落点：斩中实体就落在它脚下；空斩就落在刀刃前方地面；被墙挡住则不在墙后摆碎片。
            if (!blocked) {
                const dropBody = struck !== null && world.valid(struck) ? world.observe(struck) : null;
                const drop = dropBody !== null ? dropBody.position() : tip;
                const point = WorldGeometry.ground(world, drop);
                const sharpen = ceaselessedgeSharpen(world, point, radius, maxSharpen);
                WorldEffects.field(world, ceaselessedgeRule, point, radius,
                    { shard: shard, gain: gain, share: share, sharpen: sharpen, interval: interval, shards: shards,
                        maxSharpen: maxSharpen, next: {} }, ticks);
                WorldFeedback.emit(world, ceaselessedgeScene, 1, point,
                    { moment: "lay", radius: radius, layerRadius: radius * (1 + 0.14 * (sharpen - 1)),
                        layers: sharpen, gleam: Math.min(1, 0.35 + sharpen * 0.2), shards: shards, scale: scale }, 30);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.6, 0)), ceaselessedgeLayText, [sharpen], 30);
                world.sound("cobblemon:impact.dark", point, 14, "{}");
            }
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
