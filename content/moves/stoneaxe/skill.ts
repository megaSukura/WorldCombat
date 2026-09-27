/**
 * 岩斧 / stoneaxe 的出手方式。
 *
 * 核心念头：一记过顶的岩石斧劈下，斧头崩裂，数量有限的岩石碎片悬浮在落点四周——来一个敌人就落一块砸它，
 *   飞在半空的也躲不掉；石耗尽整片散尽。屋顶会拦住下落的岩块，所以空域要在露天才打得实。
 *
 * 三幕：
 *   起（windup，提交前）：岩斧举过头顶、斧刃结起石屑，只播预告，可被打断。
 *   劈（chop）：提交后沿过顶短弧逐段真实 trace（`cleave` 接触伤害，暴击由本招自己的 `critChance` 掷取）；
 *       画面截到真实首接触点，落点也取真实接触或无墙端点，目标致死不跳满射程。
 *   悬（raise→launch／hit／blocked／spent）：只要斧刃落点没隔着墙，碎片在落点悬浮成半径 `fieldRadius`、高 `lift`
 *       的石阵。每枚悬岩是一个真实轨位、客户端按库存用固定 sprite 画；每个**新进入**空域的非友方消耗一枚，
 *       从它显示的位置朝它发射一枚真实短弹（`world.projectile`，命名回调挂在 `world_combat:field` 上），
 *       接触实体才结算 `rock`，撞墙／顶棚只留崩屑且同样消耗；余量归零整片散尽。崩解式第一次被闯进把全部
 *       余量作为真实飞落一次放出，但只由第一枚结算一记重的（总伤预算不增），随后散尽。
 *
 * 与已有隐形岩分开：隐形岩是远程抬手布置的纯场地；岩斧是**近身斧劈带出有限的悬岩**，来一个砸一块、砸完即止。
 * 自由瞄准：`kind: "aim"` 可选任意阵营实体或方向/地点；target 为 null 时按方向劈向地面点。
 */
namespace PokemonSkills {
    const stoneaxeRockHit = "stoneaxe:rock/hit";
    const stoneaxeRockDone = "stoneaxe:rock/done";
    /** 崩解一次全落的表现上限；伤害始终只结算一记，数字只为限制同时存在的弹体数量。 */
    const stoneaxeRockCap = 16;
    const stoneaxeFieldScene = "world_combat:move_stoneaxe/field";

    function stoneaxePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 过顶短弧：从高举处斜向下劈到触及点。判定与画面共用这组顶点（由低到高不再是这道斧痕）。 */
    function stoneaxeArc(origin: CombatPoint, heading: CombatPoint, reach: number): CombatPoint[] {
        var up = WorldCombat.point(0, 1, 0), side = WorldCombat.point(-heading.z(), 0, heading.x());
        var apex = origin.plus(heading.scale(reach * 0.35)).plus(up.scale(reach * 0.75)).plus(side.scale(reach * 0.12));
        var mid = origin.plus(heading.scale(reach * 0.72)).plus(up.scale(reach * 0.3)).minus(side.scale(reach * 0.02));
        var end = origin.plus(heading.scale(reach));
        return [apex, mid, end];
    }

    /** 逐段 trace 过顶弧，返回首个接触（实体或方块）、当段真实接触点与命中段末顶点下标；无接触时给末顶点。 */
    function stoneaxeSweep(action: CombatAction, arc: CombatPoint[], radius: number): { contact: CombatImpact | null; point: CombatPoint; segment: number } {
        for (var i = 1; i < arc.length; i++) {
            var contact = action.trace(arc[i - 1], arc[i], radius, false);
            if (contact.hitEntity() || contact.blocked()) return { contact: contact, point: contact.position(), segment: i };
        }
        return { contact: null, point: arc[arc.length - 1], segment: arc.length };
    }

    /** 第 index 个真实轨位：绕阵心均匀分布、抬到 lift 高度；库存就是这些位置。 */
    function stoneaxeSlot(position: CombatPoint, radius: number, lift: number, index: number, count: number): CombatPoint {
        var angle = (Math.PI * 2 * index) / Math.max(1, count), orbit = radius * 0.86;
        return WorldCombat.point(position.x() + Math.cos(angle) * orbit, position.y() + lift + (index % 3) * 0.06,
            position.z() + Math.sin(angle) * orbit);
    }
    function stoneaxeSlots(position: CombatPoint, radius: number, lift: number, count: number): number[][] {
        var out: number[][] = [];
        for (var i = 0; i < count; i++) { var point = stoneaxeSlot(position, radius, lift, i, count); out.push([point.x(), point.y(), point.z(), 1]); }
        return out;
    }
    function stoneaxeOccupied(slots: number[][]): number {
        var count = 0;
        for (var i = 0; i < (slots || []).length; i++) if (slots[i] && slots[i][3]) count++;
        return count;
    }
    /** 离目标最近的现有悬岩；一枚都没有时返回 -1。 */
    function stoneaxeChooseSlot(slots: number[][], target: CombatPoint): number {
        var best = -1, nearest = Infinity;
        for (var i = 0; i < (slots || []).length; i++) {
            if (!slots[i] || !slots[i][3]) continue;
            var distance = WorldCombat.point(slots[i][0], slots[i][1], slots[i][2]).minus(target).length();
            if (distance < nearest) { nearest = distance; best = i; }
        }
        return best;
    }
    /** 现有悬岩按离目标由近到远排序，用于崩解一次全落。 */
    function stoneaxeOrder(slots: number[][], target: CombatPoint): number[] {
        var order: number[] = [];
        for (var i = 0; i < (slots || []).length; i++) if (slots[i] && slots[i][3]) order.push(i);
        order.sort(function (a, b) {
            var da = WorldCombat.point(slots[a][0], slots[a][1], slots[a][2]).minus(target).length();
            var db = WorldCombat.point(slots[b][0], slots[b][1], slots[b][2]).minus(target).length();
            return da - db;
        });
        return order;
    }

    /**
     * 从一枚显示中的悬岩发射一枚真实短弹：起点是它的真实高度（高目标抬到其头顶以上，避免从下向上假落），
     * 沿目标方向的真实飞行受墙／顶棚拦截。发射成功才消耗库存；`primary` 决定这枚是否结算伤害。
     */
    function stoneaxeLaunch(world: CombatWorld, field: WorldEffects.Field, slotIndex: number, actor: CombatActor,
        body: CombatObservation, power: number, primary: boolean): boolean {
        var slot = field.data.slots[slotIndex];
        if (!slot || !slot[3]) return false;
        var target = body.position(), top = target.y() + body.height() * 0.5 + 0.25;
        var origin = WorldCombat.point(slot[0], Math.max(slot[1], top), slot[2]);
        var delta = target.minus(origin);
        if (delta.length() < 0.05) return false;
        var distance = delta.length(), speed = 0.9, range = distance + 1.4, lifetime = Math.ceil(range / speed) + 8;
        field.data.inflight = (Number(field.data.inflight) || 0) + 1;
        var input = JSON.stringify({ power: power, primary: primary ? 1 : 0, target: String(actor.ref()) });
        var flight = world.projectile(origin, delta.unit().scale(speed), 0.05, 0.3, range, lifetime,
            stoneaxeRockHit, stoneaxeRockDone, input, JSON.stringify({ item: "minecraft:cobblestone", scale: 0.6 }));
        if (!flight) { field.data.inflight = Math.max(0, (Number(field.data.inflight) || 1) - 1); return false; }
        WorldFeedback.emit(world, stoneaxeScene, 1, origin,
            { moment: "fall", target: String(actor.ref()), drop: Math.max(0.6, origin.y() - target.y()),
                rocks: Math.max(8, Math.round(10 + power * 0.6)), scale: field.radius / stoneaxeReference }, 20);
        return true;
    }

    /** 余量归零且没有在飞的岩块时，整片散尽并驱散场规则。 */
    function stoneaxeSpend(world: CombatWorld, field: WorldEffects.Field): void {
        if (stoneaxeOccupied(field.data.slots || []) > 0 || (Number(field.data.inflight) || 0) > 0) return;
        var id = Number(field.data.fieldId) || 0;
        if (id <= 0) return;
        WorldFeedback.emit(world, stoneaxeScene, 1, stoneaxePoint(field),
            { moment: "spent", radius: field.radius, lift: field.data.lift, rocks: 0, scale: 1 }, 24);
        world.operation(id, "world_combat:dispel", "{}");
    }

    /** 崩解：余量一次全落（真实飞落），只有第一枚结算一记重的，随后整片散尽。 */
    function stoneaxeCollapse(world: CombatWorld, actor: CombatActor, body: CombatObservation, field: WorldEffects.Field): void {
        if (field.data.burst) return;
        field.data.burst = 1;
        field.data.stock = 0;
        var slots = field.data.slots || [], occupied = stoneaxeOccupied(slots), power = Math.max(0, Number(field.data.rock) || 0);
        var order = stoneaxeOrder(slots, body.position()), launched = 0;
        for (var i = 0; i < order.length && launched < Math.min(occupied, stoneaxeRockCap); i++)
            if (stoneaxeLaunch(world, field, order[i], actor, body, power, launched === 0)) launched++;
        for (var j = 0; j < order.length; j++) slots[order[j]][3] = 0;
    }

    // 每枚悬岩是一枚真实原生弹体，命名回调挂在共享的 field 定义上；接触实体才结算。
    WorldCombat.effectHandler("world_combat:field", stoneaxeRockHit, function (effect: CombatEffect): void {
        const impact = effect.impact();
        if (impact === null) return;
        const world = effect.world(), at = impact.position();
        var input: any = {};
        try { input = JSON.parse(effect.input() || "{}"); } catch (error) { input = {}; }
        try {
            const state: any = JSON.parse(effect.state());
            const data = state.data || (state.data = {});
            (data.hitFlights || (data.hitFlights = {}))[effect.projectileId()] = 1;
            effect.state(JSON.stringify(state));
        } catch (error) { }
        if (!impact.hitEntity()) {
            // 真实撞墙／顶棚：在接触点留一小片崩屑，不结算，但这一枚已经发出、库存照样消耗。
            WorldFeedback.emit(world, stoneaxeScene, 1, at, { moment: "blocked", rocks: 6, scale: 1 }, 18);
            world.sound("cobblemon:impact.rock", at, 8, "{}");
            return;
        }
        const target = impact.target();
        if (target === null || !world.valid(target) || world.friendly(target)) return;
        if (Number(input.primary) !== 1) return;
        const power = Math.max(0, Number(input.power) || 0);
        const landed = hurt(world, target, stoneaxeId, power, { damage: damageSpec(stoneaxeId, "rock"), type: "rock" });
        if (!landed) return;
        const body = world.observe(target), rocks = Math.max(8, Math.round(10 + power * 0.6));
        WorldFeedback.emit(world, stoneaxeScene, 1, body !== null ? body.position() : at,
            { moment: "hit", target: String(target.ref()), rocks: rocks, scale: 1 }, 24);
        world.sound("cobblemon:impact.rock", at, 16, "{}");
        if (body !== null) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)), stoneaxeHitText, [], 24);
    });
    // complete：读真实结束后点给没接触的弹体一小撮尘，再结清在飞计数、必要时收场。
    WorldCombat.effectHandler("world_combat:field", stoneaxeRockDone, function (effect: CombatEffect): void {
        const world = effect.world(), flight = effect.projectileId();
        var state: any;
        try { state = JSON.parse(effect.state()); } catch (error) { return; }
        const data = state.data || (state.data = {}), hits = data.hitFlights || (data.hitFlights = {});
        if (!hits[flight]) {
            const end = world.projectilePosition(flight);
            if (end !== null) WorldFeedback.emit(world, stoneaxeScene, 1, end, { moment: "settle", rocks: 4, scale: 1 }, 14);
        }
        delete hits[flight];
        data.inflight = Math.max(0, (Number(data.inflight) || 0) - 1);
        effect.state(JSON.stringify(state));
        if (stoneaxeOccupied(data.slots || []) <= 0 && data.inflight <= 0) {
            var id = Number(data.fieldId) || 0;
            if (id > 0) {
                WorldFeedback.emit(world, stoneaxeScene, 1, WorldCombat.point(state.position[0], state.position[1], state.position[2]),
                    { moment: "spent", radius: state.radius, lift: data.lift, rocks: 0, scale: 1 }, 24);
                world.operation(id, "world_combat:dispel", "{}");
            }
        }
    });

    // 有限悬岩：每个新进入的非友方消耗一枚、落一枚；在场内站住不再挨。崩解式一次全落。规则登记一次，全场共用。
    WorldEffects.fieldRule(stoneaxeRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            var body = world.observe(actor);
            if (body === null) return;
            var now = world.tick(), ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (now < (next[ref] || 0)) return; // 同一目标短时间内反复进出只算一次
            next[ref] = now + Math.max(10, Math.round(Number(field.data.interval) || 30));
            if (stoneaxeOccupied(field.data.slots || []) <= 0) { stoneaxeSpend(world, field); return; }
            if (Number(field.data.shatter) === 1) { stoneaxeCollapse(world, actor, body, field); return; }
            var slot = stoneaxeChooseSlot(field.data.slots || [], body.position());
            if (slot < 0) { stoneaxeSpend(world, field); return; }
            if (!stoneaxeLaunch(world, field, slot, actor, body, Math.max(0, Number(field.data.rock) || 0), true)) return;
            field.data.slots[slot][3] = 0;
            field.data.stock = stoneaxeOccupied(field.data.slots);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            field.data.fieldId = effect.id();
            // 持续表现挂在本效果的 id 上，随石阵自然到期或提前驱散一起收掉；库存用固定 sprite 画，发出即少一枚。
            WorldFeedback.onEffect(world, effect.id(), "stoneaxe:field", stoneaxeFieldScene, 1, stoneaxePoint(field),
                { moment: "field", slots: field.data.slots || [], radius: field.radius, lift: Number(field.data.lift) || 1.4,
                    rocks: stoneaxeOccupied(field.data.slots || []), rocksMax: Math.max(1, Math.round(Number(field.data.rocks) || 0)),
                    shatter: Number(field.data.shatter) || 0 });
        }
    }, { tags: [WorldEffects.categories.hazard], transferable: true });

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

            // 真实斧击：沿过顶短弧逐段扫，碰到第一个实体或方块就停；落点取这次的真实接触或无墙端点。
            const arc = stoneaxeArc(origin, heading, reach);
            const sweep = stoneaxeSweep(action, arc, 0.7);
            const struck = sweep.contact !== null && sweep.contact.hitEntity() ? sweep.contact.target() : null;
            const wall = sweep.contact !== null && sweep.contact.blocked() && !sweep.contact.hitEntity();
            const land = sweep.point;

            sound(action, "cobblemon:move.rockthrow.actor");
            var path: number[][] = [];
            if (sweep.contact !== null) {
                for (var i = 0; i < sweep.segment; i++) path.push([arc[i].x(), arc[i].y(), arc[i].z()]);
                path.push([land.x(), land.y(), land.z()]);
            } else for (var j = 0; j < arc.length; j++) path.push([arc[j].x(), arc[j].y(), arc[j].z()]);
            WorldFeedback.emit(world, stoneaxeScene, 1, land, { moment: "chop", path: path, rocks: rocks, scale: scale }, 22);

            let landed = false;
            if (struck !== null && world.valid(struck) && !world.friendly(struck))
                landed = hurt(action, struck, stoneaxeId, power,
                    { damage: damageSpec(stoneaxeId, "cleave"), contact: true, slice: true, resolve: stoneaxeCrit(critChance) });
            if (!landed) {
                WorldFeedback.emit(world, stoneaxeScene, 1, land.minus(heading.scale(0.2)),
                    { moment: "miss", rocks: Math.max(6, Math.round(rocks * 0.5)), scale: scale, blocked: wall ? 1 : 0 }, 18);
                WorldFeedback.text(world, land.plus(WorldCombat.point(0, 0.9, 0)), stoneaxeMissText, [], 20);
            }

            // 斧刃落点铺阵：撞墙就不在墙后悬岩；目标致死也停在真实接触点，不跳回满射程。
            if (!wall) {
                const point = WorldGeometry.ground(world, land);
                const slots = stoneaxeSlots(point, radius, lift, rocks);
                WorldEffects.field(world, stoneaxeRule, point, radius,
                    { rock: rock, interval: interval, rocks: rocks, stock: rocks, lift: lift, shatter: shatter ? 1 : 0,
                        slots: slots, inflight: 0, next: {}, burst: 0 }, ticks);
                WorldFeedback.emit(world, stoneaxeScene, 1, point,
                    { moment: "raise", radius: radius, lift: lift, rocks: rocks, scale: 1, shatter: shatter ? 1 : 0 }, 32);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.6, 0)), stoneaxeLayText, [], 28);
                world.sound("cobblemon:impact.rock", point, 16, "{}");
            }
            done(action);
        }
    });

    /** 暴击由本招自己的几率掷取：命中瞬间在共享结算里决定是否暴击。 */
    function stoneaxeCrit(chance: number): (context: PokemonDamage.FeatureContext) => PokemonDamage.Metadata | undefined {
        return function (context: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (context.preview || !context.world) return undefined;
            return { critical: context.world.random() < chance };
        };
    }

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
