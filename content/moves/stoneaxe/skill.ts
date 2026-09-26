/**
 * 岩斧 / stoneaxe 的出手方式。
 *
 * 核心念头：一记过顶的岩石斧劈下，斧头崩裂，数量有限的岩石碎片悬浮在落点四周——来一个敌人就落一块砸它，
 *   飞在半空的也躲不掉；石耗尽整片散尽。屋顶会拦住下落的岩块，所以空域要在露天才打得实。
 *
 * 三幕：
 *   起（windup，提交前）：岩斧举过头顶、斧刃结起石屑，只播预告，可被打断。
 *   劈（chop）：提交后朝瞄准方向做一记真实斧击（`cleave` 接触伤害，暴击由本招自己的 `critChance` 掷取）。
 *   悬（raise→fall／hit／blocked／shatter／hum）：只要斧刃落点没隔着墙，碎片在落点悬浮成半径 `fieldRadius`、高 `lift`
 *       的石阵（规则 `world_combat:hazard/floatingrocks`），余量 `rocks` 块。每个**新进入**空域的非友方消耗一块，
 *       从它正上方落一块真实岩/短下坠判定：竖直段被方块挡住就只砸在屋顶（不消耗、不伤人），通达才结算 `rock`
 *       并把岩块往下砸。余量归零整片散尽；崩解式第一次被闯进就把余量一次全落、只结算一记 `rock`（总伤预算不增），随后散尽。
 *
 * 与已有隐形岩分开：隐形岩是远程抬手布置的纯场地；岩斧是**近身斧劈带出有限的悬岩**，来一个砸一块、砸完即止。
 * 自由瞄准：`kind: "aim"` 可选任意阵营实体或方向/地点；target 为 null 时按方向劈向地面点。
 */
namespace PokemonSkills {
    function stoneaxePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    /**
     * 一块悬岩落下：从目标正上方 `lift` 处竖直落向目标。竖直段被方块挡住时只砸在屋顶，不消耗岩块也不伤人；
     * 通达才消耗一块并结算 `rock`。返回是否消耗了岩块（真落到底）。
     */
    function stoneaxeFall(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        const centre = stoneaxePoint(field);
        const lift = Math.max(0.6, Number(field.data.lift) || 1.4);
        const rock = WorldCombat.point(body.position().x(), centre.y() + lift, body.position().z());
        const clip = world.clipBlocks(rock, body.position());
        if (clip !== null && clip.blocked()) {
            const at = clip.blockPosition() !== null ? clip.blockPosition()! : clip.position();
            WorldFeedback.emit(world, stoneaxeScene, 1, at,
                { moment: "blocked", target: String(actor.ref()), rocks: 6, scale: field.radius / stoneaxeReference }, 18);
            world.sound("cobblemon:impact.rock", at, 8, "{}");
            return false;
        }
        const power = Math.max(0, Number(field.data.rock) || 0);
        const landed = hurt(world, actor, stoneaxeId, power, { damage: damageSpec(stoneaxeId, "rock"), type: "rock" });
        WorldFeedback.emit(world, stoneaxeScene, 1, rock,
            { moment: "fall", target: String(actor.ref()), drop: Math.max(0.6, rock.y() - body.position().y()),
                rocks: Math.max(8, Math.round(10 + power * 0.6)), scale: field.radius / stoneaxeReference }, 20);
        if (landed) {
            WorldFeedback.emit(world, stoneaxeScene, 1, body.position(),
                { moment: "hit", target: String(actor.ref()), rocks: Math.max(8, Math.round(10 + power * 0.6)),
                    scale: field.radius / stoneaxeReference }, 24);
            world.sound("cobblemon:impact.rock", body.position(), 16, "{}");
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)), stoneaxeHitText, [], 24);
        }
        return true;
    }
    /** 崩解：第一次被闯进就把余量一次全落，只结算一记 `rock`（原总伤预算不增），整片随即散尽。 */
    function stoneaxeCollapse(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const power = Math.max(0, Number(field.data.rock) || 0);
        const landed = hurt(world, actor, stoneaxeId, power, { damage: damageSpec(stoneaxeId, "rock"), type: "rock" });
        WorldFeedback.emit(world, stoneaxeScene, 1, body.position(),
            { moment: "shatter", target: String(actor.ref()), rocks: Math.max(12, Math.round(14 + power * 0.8)),
                scale: field.radius / stoneaxeReference }, 28);
        if (landed) {
            world.sound("cobblemon:impact.rock", body.position(), 16, "{}");
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)), stoneaxeShatterText, [], 26);
        }
    }
    /** 暴击由本招自己的几率掷取：命中瞬间在共享结算里决定是否暴击。 */
    function stoneaxeCrit(chance: number): (context: PokemonDamage.FeatureContext) => PokemonDamage.Metadata | undefined {
        return function (context: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (context.preview || !context.world) return undefined;
            return { critical: context.world.random() < chance };
        };
    }
    /** 一道斧痕：过目标、略带弧度的斜线，服务端与画面共用这组顶点。 */
    function stoneaxeCleave(centre: CombatPoint, heading: CombatPoint, reach: number): number[][] {
        const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const a = centre.minus(lateral.scale(reach * 0.45)).minus(WorldCombat.point(0, reach * 0.5, 0));
        const mid = centre.plus(WorldCombat.point(0, reach * 0.05, 0));
        const b = centre.plus(lateral.scale(reach * 0.45)).plus(WorldCombat.point(0, reach * 0.4, 0));
        return [[a.x(), a.y(), a.z()], [mid.x(), mid.y(), mid.z()], [b.x(), b.y(), b.z()]];
    }

    // 有限悬岩：每个新进入的非友方消耗一块，落一块砸它；留在里面不再挨。崩解式一次全落。规则登记一次，全场共用。
    WorldEffects.fieldRule(stoneaxeRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const now = world.tick(), ref = String(actor.ref());
            const next = field.data.next || (field.data.next = {});
            if (now < (next[ref] || 0)) return; // 同一目标短时间内反复进出只算一次
            next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
            const stock = Math.max(0, Math.round(Number(field.data.stock) || 0));
            if (stock <= 0) { if (field.data.fieldId) world.operation(Number(field.data.fieldId), "world_combat:dispel", "{}"); return; }
            if (Number(field.data.shatter) === 1) {
                if (field.data.burst) return;
                field.data.burst = 1;
                field.data.stock = 0;
                stoneaxeCollapse(world, actor, field);
                if (field.data.fieldId) world.operation(Number(field.data.fieldId), "world_combat:dispel", "{}");
                return;
            }
            if (!stoneaxeFall(world, actor, field)) return; // 被屋顶拦住：岩块没落地，不消耗
            field.data.stock = stock - 1;
            if (stock - 1 <= 0 && field.data.fieldId) {
                WorldFeedback.emit(world, stoneaxeScene, 1, stoneaxePoint(field),
                    { moment: "spent", radius: field.radius, lift: field.data.lift, rocks: 0,
                        scale: field.radius / stoneaxeReference }, 24);
                world.operation(Number(field.data.fieldId), "world_combat:dispel", "{}");
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            field.data.fieldId = effect.id();
            // 持续表现挂在本效果的 id 上，随石阵自然到期或提前驱散一起收掉；数量随剩余库存下降。
            WorldFeedback.onEffect(world, effect.id(), "stoneaxe:field", stoneaxeScene, 1, stoneaxePoint(field),
                { moment: "hum", radius: field.radius, lift: Number(field.data.lift) || 1.4,
                    rocks: Math.max(0, Math.round(Number(field.data.stock) || 0)),
                    rocksMax: Math.max(1, Math.round(Number(field.data.rocks) || 0)),
                    scale: field.radius / stoneaxeReference, shatter: Number(field.data.shatter) || 0 });
        }
    });

    define({
        id: stoneaxeId,
        cooldownParameter: "recharge",
        name: "Stone Axe",
        description: "一记过顶的岩石斧劈下，数量有限的岩石碎片悬浮在落点四周：每个走进这片空域的新敌人被落下一块岩砸中，飞在空中的也躲不掉，砸完即散。屋顶会拦住下落岩，所以悬岩要在露天才打得实。这一斧瞄准要害，暴击率高于普通招；崩解式第一次被闯进就把余量一次全落、砸一记重的。",
        uses: ["近身一记斧劈，把有限悬岩留在对手周围", "惩罚怕岩的目标，连飞在低空的一起砸", "把空域设在敌人必经的入口"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.6,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "rockaxe",
        stationary: true,
        defaults: { shatter: false, ai: { maxChase: 6, preferCluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stoneaxeId], detail: { values: config } };
            return { radius: p(stoneaxeId, "reach", context), geometry: "line", style: "rockaxe", color: 0xB7B3A6,
                label: config && config.shatter === true ? "岩斧·崩解" : "岩斧·悬岩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stoneaxeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(stoneaxeId, "tempo", context)),
                recover: Math.round(p(stoneaxeId, "aftercast", context)),
                cooldown: Math.round(p(stoneaxeId, "recharge", context)),
                active: 0,
                range: p(stoneaxeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const rocks = Math.max(8, Math.round(p(stoneaxeId, "rocks", action) * 0.5));
            action.present("stoneaxe:windup:" + action.id(), stoneaxeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, rocks: rocks,
                    shatter: config && config.shatter === true ? 1 : 0 }));
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
            const power = p(stoneaxeId, "cleave", action);
            const critChance = p(stoneaxeId, "critChance", action);
            const rock = p(stoneaxeId, "rock", action);
            const interval = Math.max(10, Math.round(p(stoneaxeId, "rockInterval", action)));
            const radius = Math.max(1.2, p(stoneaxeId, "fieldRadius", action));
            const ticks = Math.max(80, Math.round(p(stoneaxeId, "fieldTicks", action)));
            const rocks = Math.max(10, Math.round(p(stoneaxeId, "rocks", action)));
            const lift = Math.max(0.6, p(stoneaxeId, "lift", action));
            const shatter = !!(config && config.shatter);
            const scale = radius / stoneaxeReference;
            const tip = origin.plus(heading.scale(reach));

            // 真实斧击：从站位到落点扫一条射线，碰到第一个敌对生物才算命中；墙会在中途拦住。
            const contact = action.trace(origin, tip, 0.7, false);
            const struck = contact.hitEntity() ? contact.target() : null;
            const blocked = contact.blocked() && !contact.hitEntity();
            const body = struck !== null && world.valid(struck) ? world.observe(struck) : null;
            const centre = body !== null ? body.position() : tip;

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, stoneaxeScene, 1, centre,
                { moment: "chop", path: stoneaxeCleave(centre, heading, reach), rocks: rocks, scale: scale }, 22);

            let landed = false;
            if (struck !== null && world.valid(struck) && !world.friendly(struck))
                landed = hurt(action, struck, stoneaxeId, power,
                    { damage: damageSpec(stoneaxeId, "cleave"), contact: true, slice: true, resolve: stoneaxeCrit(critChance) });
            if (!landed) {
                WorldFeedback.emit(world, stoneaxeScene, 1, tip.minus(heading.scale(0.2)),
                    { moment: "miss", rocks: Math.max(6, Math.round(rocks * 0.5)), scale: scale, blocked: blocked ? 1 : 0 }, 18);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 0.9, 0)), stoneaxeMissText, [], 20);
            }

            // 斧刃落点：劈中实体就落它脚下，否则落在斧头前方地面；被墙挡住则不在墙后悬岩。
            if (!blocked) {
                const dropBody = struck !== null && world.valid(struck) ? world.observe(struck) : null;
                const drop = dropBody !== null ? dropBody.position() : tip;
                const point = WorldGeometry.ground(world, drop);
                WorldEffects.field(world, stoneaxeRule, point, radius,
                    { rock: rock, interval: interval, rocks: rocks, stock: rocks, lift: lift,
                        shatter: shatter ? 1 : 0, next: {} }, ticks);
                WorldFeedback.emit(world, stoneaxeScene, 1, point,
                    { moment: "raise", radius: radius, lift: lift, rocks: rocks, scale: scale, shatter: shatter ? 1 : 0 }, 32);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.6, 0)), stoneaxeLayText, [], 28);
                world.sound("cobblemon:impact.rock", point, 16, "{}");
            }
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记强调与浮字（暴击率来自本招的 critChance）。
    WorldCombat.on("world_combat:move_stoneaxe/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== stoneaxeId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, stoneaxeScene, 1, at,
            { moment: "crit", target: String(target.ref()), rocks: 18, scale: 1.1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), stoneaxeCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
