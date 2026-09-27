/**
 * 雪景 / snowscape 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片（自己或友方的）雪区里。
 * 出手前的位置：`ai.advance` 开启（默认）时把雪区铺在自己与威胁之间；关闭时铺在脚下。
 * 什么时候最想出手：雪景护冰之躯——自己带冰属性时 priority 抬到 58，附近队友带冰属性时也抬；
 *   否则 42，当作改变地面、为冰招与走位做准备的布置。再看计划雪区里非冰活体的净收益（队友被罩住降权、
 *   对手被罩住加权），以及脚下是否真有露天水面可冻；避免只看任意一片同类雪场。接在 `world_combat:defend` 之前。
 * 放完之后把伤害交回共用交战计划；还站在雪区里时不再重复。
 */
namespace CompanionBehavior {
    const snowscapeChase = PokemonSkills.number("ai.maxChase", "落雪距离", 2, 24, 1);
    snowscapeChase.help = "伙伴只在威胁离自己这么远以内时才考虑雪景；调小只在贴身时落雪，调大愿意提前布置。";
    const snowscapeAdvance = PokemonSkills.flag("ai.advance", "把雪区铺向对手");
    snowscapeAdvance.help = "开启后把雪区铺在自己与威胁之间，让交战区落进雪里；关闭则铺在脚下先护住自己。";

    PokemonSkills.addPreferences("snowscape", { ai: { maxChase: 14, advance: true, leaveStation: false } },
        [snowscapeChase, snowscapeAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function snowscapeCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "snowscape") return items[i];
        return null;
    }
    /** 共享战斗者类型：宝可梦、普通生物与临时改型一致，不再只看 pokemonFacts。 */
    function snowscapeIce(context: WorldBehavior.Context, target: Entity): boolean {
        const access = world(context), actor = access.actor(target.ref);
        if (actor === null || !access.valid(actor)) return false;
        try { return PokemonDamage.combatants.read(access, actor).types.indexOf("ice") >= 0; } catch (error) { return false; }
    }
    /** 自己或友方已经拥有的雪区算「已在雪里」；敌方的同类场不算，避免站进对手的雪就当已布置。 */
    function snowscapeInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.snowscapeField);
        for (let i = 0; i < areas.length; i++) {
            if (distance(areas[i].position, self.point) > areas[i].radius) continue;
            const owner = access.actor(areas[i].source);
            if (owner !== null && access.friendly(owner)) return true;
        }
        return false;
    }
    function snowscapeFriendlyIce(context: WorldBehavior.Context): boolean {
        const self = source(context);
        if (snowscapeIce(context, self)) return true;
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) if (nearby[i].friendly && nearby[i].health > 0 && snowscapeIce(context, nearby[i])) return true;
        return false;
    }
    /** 本招在该个体上的实际雪区半径，和判定与指示圈同源。 */
    function snowscapeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const access = world(context);
        return Math.max(1, PokemonSkills.p("snowscape", "snowRadius",
            { world: access, actor: access.source(), skill: PokemonSkills.skills["snowscape"], detail: { values: item.data.config } }));
    }
    /** 与 method.create 一致的落点：advance 开时铺在自己与威胁之间，否则脚下。 */
    function snowscapePlanned(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number[] {
        const self = source(context);
        if (!threat || !ai<boolean>(item, "advance", true)) return self.point;
        const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(3, length * 0.5);
        return [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
    }
    /** 计划雪区里非冰活体的净收益：被罩住的友方为负、对手为正；冰之躯两边都受益，不计入。 */
    function snowscapeNetIce(context: WorldBehavior.Context, centre: number[], radius: number): number {
        const nearby = context.facts.nearby as Entity[], self = source(context);
        let net = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health <= 0 || distance(other.point, centre) > radius) continue;
            if (snowscapeIce(context, other)) continue;
            if (other.ref === self.ref) { net -= 1; continue; }
            net += other.friendly ? -1 : 1;
        }
        return net;
    }
    /** 计划雪区脚下是否真有露天水面可冻：扫几条线上第一块非空气方块里有没有水。 */
    function snowscapeWater(context: WorldBehavior.Context, centre: number[], radius: number): boolean {
        const access = world(context);
        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4, step = radius * 0.6;
            const x = Math.floor(centre[0] + Math.cos(angle) * step), z = Math.floor(centre[2] + Math.sin(angle) * step);
            for (let dy = 2; dy >= -2; dy--) {
                const block = access.block(WorldCombat.point(x + 0.5, centre[1] + dy + 0.5, z + 0.5));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:water") return true;
                break;
            }
        }
        return false;
    }
    function snowscapeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !snowscapeInside(context);
    }

    registerUse("snowscape", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context, item) {
            let value = snowscapeFriendlyIce(context) ? 58 : 42;
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (threat) {
                const centre = snowscapePlanned(context, item, threat), radius = snowscapeRadius(context, item);
                value += Math.max(-18, Math.min(18, snowscapeNetIce(context, centre, radius) * 5));
                if (snowscapeWater(context, centre, radius)) value += 6;
            }
            return Math.max(0, Math.min(100, value));
        },
        available: function (context, item, _purpose, _target) { return snowscapeWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_snowscape/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = snowscapeCapability(context);
            if (!item || !snowscapeWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_snowscape:" + threat.ref, kind: "world_combat:move_snowscape", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_snowscape/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_snowscape") return [];
            const item = snowscapeCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !snowscapeWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", true) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(3, length * 0.5);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_snowscape/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_snowscape");
    });
}
