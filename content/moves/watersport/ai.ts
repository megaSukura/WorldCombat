/**
 * 玩水 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：自己或附近有活体在燃烧（burn 状态或原生真实明火都算，priority 抬到 72，先灭火救人），
 *   或存在火属性威胁 / 燃烧中的敌人；读不到配招的其他模组生物，用共享分类器记下的最近一次真实火伤害补证据
 *   （已转换元素或原生 is_fire 标签），落点附近有明火也算数。ai.fireOnly 关闭时见威胁也可能铺水当常备压制。
 *   ai.maxChase 决定愿意在多远处开铺。
 * 出手前的位置：有队友着火时把水洼按在这个队友身上先去救人，否则 ai.advance 关闭（默认）时按在脚下护住自己；
 *   开启时从落点朝威胁前压一点，把交战区罩进洼里。
 * 放完之后把伤害交回共用交战计划；自己还湿着时不再重复（水洼也在持续生效）。
 */
namespace CompanionBehavior {
    const watersportChase = PokemonSkills.number("ai.maxChase", "铺水距离", 2, 24, 1);
    watersportChase.help = "伙伴只在威胁离自己这么远以内时才考虑铺水；调小只在贴身时铺，调大愿意提前布置。";
    const watersportAdvance = PokemonSkills.flag("ai.advance", "把水洼泼向对手");
    watersportAdvance.help = "开启后把水洼按在自己与威胁之间，让交战区泡湿；关闭则按在脚下先护住自己。";
    const watersportFireOnly = PokemonSkills.flag("ai.fireOnly", "只在有火时铺水");
    watersportFireOnly.help = "开启时只在有火属性威胁、或附近有活体在燃烧时才铺水；关闭则把水洼当作常备压制。";
    const watersportStation = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    watersportStation.help = "开启后，收到「驻守」指令时也会离开原位去铺水。";

    PokemonSkills.addPreferences("watersport", { ai: { maxChase: 12, advance: false, fireOnly: true, leaveStation: false } },
        [watersportChase, watersportAdvance, watersportFireOnly, watersportStation]);

    /** 原生事实：这个活体现在真的在燃烧（不限于 burn 状态）。 */
    registerFact("world_combat:move_watersport/fire", function (access: CombatWorld, actor: CombatActor, _argument: any): boolean {
        const native: { isOnFire(): boolean } | null = access.nativeEntity(actor);
        return native !== null && native.isOnFire();
    });
    function watersportOnFire(context: WorldBehavior.Context, subject: Entity): boolean {
        return status(context, subject, "burn") || fact<boolean>(context, "world_combat:move_watersport/fire", subject) === true;
    }
    /** 原生证据：该活体最近真的打出过火伤害（已转换元素或原生 is_fire 标签）；未知 Mod 的攻击不算。 */
    registerFact("world_combat:move_watersport/native", function (access: CombatWorld, actor: CombatActor, _argument: any): boolean {
        const recent = DamageSemantics.recentAttack(access, actor, 200);
        if (recent === null) return false;
        if (String(recent.elementType || "").toLowerCase() === "fire") return true;
        return (recent.tags || []).indexOf("minecraft:is_fire") >= 0;
    });
    function watersportBurning(context: WorldBehavior.Context, self: Entity): boolean {
        if (watersportOnFire(context, self)) return true;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health > 0 && watersportOnFire(context, other)) return true;
        }
        return false;
    }
    /** 最该被这汪水罩住的落点：着火的友方 > 自己；有明火的队友比脚下的自保更优先。 */
    function watersportAnchor(context: WorldBehavior.Context): Entity {
        const self = source(context), nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly && other.health > 0 && other.visible && watersportOnFire(context, other)) return other;
        }
        return self;
    }
    function watersportFireThreat(context: WorldBehavior.Context, threat: Entity | null): boolean {
        if (!threat) return false;
        const facts = pokemonFacts(context, threat);
        if (facts && facts.types && facts.types.indexOf("fire") >= 0) return true;
        if (status(context, threat, "burn")) return true;
        return fact<boolean>(context, "world_combat:move_watersport/native", threat) === true;
    }
    /** 本个体当前水洼半径；读不到原生个体时退回定义参考半径，保证普通生物也能评估。 */
    function watersportRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const access = world(context);
        try {
            return Math.max(1.2, PokemonSkills.p(PokemonSkills.watersportId, "puddleRadius", { world: access, actor: access.source(),
                skill: PokemonSkills.skills[PokemonSkills.watersportId], detail: { values: item.data.config || {} } }));
        } catch (error) { return 3.2; }
    }
    /** 有界采样：落点附近有没有明火。只取少数格、按决策帧缓存，避免每评每实体重扫大片。 */
    function watersportOpenFire(context: WorldBehavior.Context, centre: number[], radius: number): boolean {
        return observedFlag(context, "world_combat:move_watersport/openfire", function () {
            const access = world(context), base = Math.floor(centre[1]);
            for (let i = 0; i < 8; i++) {
                const angle = access.random() * Math.PI * 2, spread = Math.sqrt(access.random()) * radius;
                const x = Math.floor(centre[0] + Math.cos(angle) * spread), z = Math.floor(centre[2] + Math.sin(angle) * spread);
                for (let dy = -1; dy <= 1; dy++) {
                    const block = access.block(WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5));
                    if (block === null) continue;
                    const id = String(block.id());
                    if (id === "minecraft:fire" || id === "minecraft:soul_fire") return true;
                }
            }
            return false;
        });
    }
    function watersportWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        const self = source(context);
        if (status(context, self, "watersport")) return false;
        if (watersportBurning(context, self)) return true;
        const fireThreat = !!threat && threat.health > 0 && threat.visible && !threat.friendly && watersportFireThreat(context, threat);
        const openFire = watersportOpenFire(context, watersportAnchor(context).point, watersportRadius(context, item));
        if (ai<boolean>(item, "fireOnly", true) && !fireThreat && !openFire) return false;
        if (!threat || threat.health <= 0 || !threat.visible) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
        return true;
    }
    function watersportCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "watersport") return items[i];
        return null;
    }

    registerUse("watersport", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            if (watersportBurning(context, source(context))) return 72;
            return watersportFireThreat(context, context.senses["world_combat:threat"]) ? 50 : 38;
        },
        available: function (context, item, _purpose, _target) { return watersportWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_watersport/goal", propose: function (context) {
        const threat: Entity | null = context.senses["world_combat:threat"];
        const item = watersportCapability(context);
        if (!item || !watersportWants(context, item, threat)) return [];
        const anchor = threat && threat.health > 0 ? threat : source(context);
        return [{ id: "world_combat:move_watersport:" + anchor.ref, kind: "world_combat:move_watersport", data: { ref: anchor.ref } }];
    } });
    registry.method({ id: "world_combat:move_watersport/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_watersport") return [];
            const item = watersportCapability(context), threat: Entity | null = entity(context, goal.data.ref);
            if (!item || !watersportWants(context, item, threat && threat.ref !== source(context).ref ? threat : null)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const threat: Entity | null = current.senses["world_combat:threat"];
                const anchor = watersportAnchor(current);
                const copy: Entity = JSON.parse(JSON.stringify(anchor));
                if (ai<boolean>(item, "advance", false) && threat) {
                    const dx = threat.point[0] - copy.point[0], dz = threat.point[2] - copy.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
                    copy.point = [copy.point[0] + dx / length * step, copy.point[1], copy.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_watersport/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_watersport");
    });
}
