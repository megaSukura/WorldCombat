/**
 * 魔法空间 / magicroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在静默空间里，
 *   且落点范围内敌人的「可压制装备收益」确实高过自己一侧时才出手。没有任何可压制装备就不自动放。
 * 收益怎么判：按原生装备槽当前有效修饰的单位和正负估值，合计预定场内双方得失；宝可梦携带物只计
 *   纯伤害预估能确认的差额，行为型物品收益保持未知。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先默自己这边；开启时前压到交战区 40% 处，
 *   让双方一起被默。放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。
 * 配置 hush（长默／快默）改变半径、时长与节奏。
 */
namespace CompanionBehavior {
    const magicRoomChase = PokemonSkills.number("ai.maxChase", "静默距离", 2, 24, 1);
    magicRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑魔法空间；调小只在贴身时按，调大愿意提前布置。";
    const magicRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    magicRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被默；关闭则按在脚下先默住自己这边。";

    PokemonSkills.addPreferences("magicroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [magicRoomChase, magicRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    const magicRoomUnits: { [id: string]: number } = {
        "minecraft:generic.attack_damage": 8, "minecraft:generic.attack_speed": 4,
        "minecraft:generic.movement_speed": .2, "minecraft:generic.armor": 10,
        "minecraft:generic.armor_toughness": 8, "minecraft:generic.knockback_resistance": 1,
        "minecraft:generic.max_health": 40
    };
    // Active native-slot declarations only. Signed, unit-normalized weights estimate this field's tradeoff.
    CompanionBehavior.registerFact("world_combat:move_magicroom/gear", function (access: CombatWorld, actor: CombatActor): number {
        if (!access.valid(actor)) return 0;
        const entries: any[] = JSON.parse(access.equipmentModifiers(actor));
        let value = 0;
        entries.forEach(entry => {
            const unit = magicRoomUnits[entry.attribute];
            if (!entry.active || !unit || typeof entry.amount !== "number") return;
            const attribute = access.attributeValue(actor, entry.attribute);
            if (!attribute) return;
            const delta = entry.operation === "add_value" ? entry.amount * attribute.additionMultiplier()
                : entry.amount * Math.max(unit, Math.abs(attribute.value()));
            value += delta / Math.max(unit, Math.abs(attribute.value()));
        });
        if (String(actor.domain()) === "cobblemon") {
            const pokemon = CobblemonCombat.pokemon(actor), facts = PokemonDamage.sourceFacts(pokemon, access, actor);
            const native = facts.data.native;
            const state = native.state;
            let before = 0, after = 0;
            for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
                const move = pokemon.move(slot);
                if (!move || move.pp() <= 0 || String(move.category()) === "status" || !(move.power() > 0)) continue;
                native.state = state;
                const ordinary = PokemonDamage.preview(access, actor, facts, move, {});
                native.state = JSON.parse(JSON.stringify(state)); native.state.layers = native.state.layers || {};
                native.state.layers.suppressItems = true;
                const muted = PokemonDamage.preview(access, actor, facts, move, {});
                if (ordinary.available && muted.available) { before = Math.max(before, ordinary.amount); after = Math.max(after, muted.amount); }
            }
            native.state = state;
            if (before > 0) value += (before - after) / before;
        }
        return value;
    });
    function magicRoomPoint(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): number[] | null {
        const self = source(context), access = world(context), point = self.point.slice();
        if (ai<boolean>(item, "advance", false)) {
            const dx = threat.point[0] - point[0], dz = threat.point[2] - point[2], span = Math.sqrt(dx * dx + dz * dz);
            if (span > .001) { const step = Math.min(2, span * .4); point[0] += dx / span * step; point[2] += dz / span * step; }
        }
        const supported = SurfacePaths.support(access, CompanionBehavior.point(point), 2, 6);
        return supported ? [supported.x(), supported.y(), supported.z()] : null;
    }
    function magicRoomBalance(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): number {
        const at = magicRoomPoint(context, item, threat);
        if (!at) return 0;
        const access = world(context), self = source(context), radius = PokemonSkills.p(PokemonSkills.magicRoomId, "gagRadius", {
            world: access, actor: access.source(), skill: PokemonSkills.skills[PokemonSkills.magicRoomId], detail: { values: item.data.config } });
        const people = (context.facts.nearby || []).slice() as Entity[];
        if (!people.some(other => other.ref === self.ref)) people.push(self);
        let balance = 0;
        people.forEach(other => {
            if (other.health <= 0 || !other.friendly && !other.visible || distance(at, other.point) > radius
                || !access.clear(CompanionBehavior.point(at), CompanionBehavior.point(other.point))) return;
            balance += (other.friendly ? -1 : 1) * magicRoomGear(context, other);
        });
        return balance;
    }

    function magicRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "magicroom") return items[i];
        return null;
    }
    function magicRoomInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.magicRoomField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function magicRoomGear(context: WorldBehavior.Context, subject: Entity): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_magicroom/gear", subject);
        return typeof value === "number" && isFinite(value) ? value : 0;
    }
    function magicRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (magicRoomInside(context)) return false;
        return magicRoomBalance(context, item, threat) > .05;
    }
    function magicRoomPriority(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat) return 0;
        const value = magicRoomBalance(context, item, threat);
        return value > .05 ? Math.max(28, Math.min(74, 38 + value * 12)) : 0;
    }

    registerUse("magicroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: magicRoomPriority,
        available: function (context, item, _purpose, _target) { return magicRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_magicroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = magicRoomCapability(context);
            if (!item || !magicRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_magicroom:" + threat.ref, kind: "world_combat:move_magicroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_magicroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_magicroom") return [];
            const item = magicRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !magicRoomWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                if (!threat) return null;
                const at = magicRoomPoint(current, item, threat);
                if (!at) return null;
                const copy: Entity = JSON.parse(JSON.stringify(self)); copy.point = at;
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_magicroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_magicroom");
    });
}
