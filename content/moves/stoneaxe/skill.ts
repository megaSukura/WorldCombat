/**
 * 岩斧 / stoneaxe 的出手方式。
 *
 * 核心念头：一记过顶的岩石斧劈下，斧头崩裂，岩石碎片悬浮在落点四周——谁走进这片空域就被砸，飞在半空的也躲不掉。
 *
 * 三幕：
 *   起（windup，提交前）：岩斧举过头顶、斧刃结起石屑，只播预告，可被打断。
 *   劈（chop）：提交后朝目标一记 `cleave` 接触斧击（暴击由本招自己的 `critChance` 掷取）。
 *   悬（raise→hit／shatter／hum）：若劈中，碎片在落点悬浮成半径 `fieldRadius`、高 `lift` 的石阵
 *       （规则 `world_combat:hazard/floatingrocks`）；进入空域的非友方吃一记 `rock`（岩属性物理，不要求落地），
 *       留在里面按间隔再被砸。崩解式下第一次被闯进就整片崩下来砸一记重的、石阵随即散尽；未劈中只留一下崩碎。
 *
 * 与已有隐形岩分开：隐形岩是远程抬手布置的纯场地；岩斧是**近身斧劈带出浮岩**，伤害走物理攻防，
 * 崩解档让它第一次被闯进就整片崩下来。
 */
namespace PokemonSkills {
    function stoneaxePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    /** 落点收到地表上方一格：向下找第一块实体方块，把石阵放在它上面（中心在空气格）。 */
    function stoneaxeGround(world: CombatWorld, point: CombatPoint): CombatPoint {
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
    /** 被悬浮岩石砸中：按 interval 节流结算；fresh 表示刚进入（不吃节流、报一句浮字）。崩解式只砸一次后散尽。 */
    function stoneaxeStrike(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null) return;
        const shatter = Number(field.data.shatter) === 1;
        if (shatter && field.data.burst) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
        const power = Math.max(0, Number(field.data.rock) || 0);
        if (!hurt(world, actor, stoneaxeId, power, { damage: damageSpec(stoneaxeId, "rock"), type: "rock" })) return;
        WorldFeedback.emit(world, stoneaxeScene, 1, body.position(),
            { moment: shatter ? "shatter" : "hit", target: ref, rocks: Math.max(8, Math.round(10 + power * 0.6)),
                scale: field.radius / stoneaxeReference }, shatter ? 28 : 24);
        world.sound("cobblemon:impact.rock", body.position(), 16, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)),
            shatter ? stoneaxeShatterText : stoneaxeHitText, [], 26);
        if (shatter) {
            field.data.burst = 1;
            world.operation(Number(field.data.fieldId), "world_combat:dispel", "{}");
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

    // 悬浮岩阵：踏进来砸一次（崩解式只砸这一次并散尽），留在里面按间隔再砸；阵自己低频提示还在。规则登记一次，全场共用。
    WorldEffects.fieldRule(stoneaxeRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stoneaxeStrike(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            stoneaxeStrike(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            field.data.fieldId = effect.id();
            WorldFeedback.keep(world, "stoneaxe:field:" + effect.id(), stoneaxeScene, 1, stoneaxePoint(field),
                { moment: "hum", radius: field.radius, lift: Number(field.data.lift) || 1.4,
                    rocks: Math.max(12, Math.round(Number(field.data.rocks) || 20)), scale: field.radius / stoneaxeReference,
                    shatter: Number(field.data.shatter) || 0 }, 40);
        }
    });

    define({
        id: stoneaxeId,
        cooldownParameter: "recharge",
        name: "Stone Axe",
        description: "An overhead stone axe splits the target and its shards hang floating around the landing point; anything that enters the air there is struck, airborne or not. The first intruder of a Shatter field takes the whole blast at once; a Hover field keeps striking. It has a high chance to land a critical hit.",
        uses: ["近身一记斧劈，把悬浮岩留在对手周围", "惩罚怕岩的目标、连飞在空中的一起砸", "用崩解式在窄口砸出一记重的"],
        kind: "enemy",
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
            const heading = aim(action);
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

            const foe = target !== null && world.valid(target) ? world.observe(target) : null;
            const centre = foe !== null ? foe.position() : origin.plus(heading.scale(reach));

            sound(action, "cobblemon:move.rockthrow.actor");
            WorldFeedback.emit(world, stoneaxeScene, 1, centre,
                { moment: "chop", path: stoneaxeCleave(centre, heading, reach), rocks: rocks, scale: scale }, 22);

            if (foe === null || !hurt(action, target!, stoneaxeId, power,
                { damage: damageSpec(stoneaxeId, "cleave"), contact: true, slice: true, resolve: stoneaxeCrit(critChance) })) {
                WorldFeedback.emit(world, stoneaxeScene, 1, centre.minus(heading.scale(0.2)),
                    { moment: "miss", rocks: Math.max(6, Math.round(rocks * 0.5)), scale: scale }, 18);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), stoneaxeMissText, [], 20);
                done(action);
                return;
            }

            // 劈中：岩石碎片悬浮在落点四周，持续砸经过的人（崩解式只砸第一次）。
            const point = stoneaxeGround(world, centre);
            WorldEffects.field(world, stoneaxeRule, point, radius,
                { rock: rock, interval: interval, rocks: rocks, lift: lift, shatter: shatter ? 1 : 0, next: {} }, ticks);
            WorldFeedback.emit(world, stoneaxeScene, 1, point,
                { moment: "raise", radius: radius, lift: lift, rocks: rocks, scale: scale, shatter: shatter ? 1 : 0 }, 32);
            WorldFeedback.keep(world, "stoneaxe:hum:" + String(action.id()), stoneaxeScene, 1, point,
                { moment: "hum", radius: radius, lift: lift, rocks: rocks, scale: scale, shatter: shatter ? 1 : 0 }, ticks);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.6, 0)), stoneaxeLayText, [], 28);
            world.sound("cobblemon:impact.rock", point, 16, "{}");
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
