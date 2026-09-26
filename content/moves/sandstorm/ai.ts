/**
 * 沙暴 / sandstorm 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 14）格内，且自己还没有站在一片沙幕里（不空烧一次出手）。
 * 风向：沙幕落点一旦定下，风向就是「自己→落点」的水平方向，沙阵只顺这个方向推。`ai.advance` 开启（默认）
 * 时把落点放到自己与威胁之间、更靠威胁的一侧，让风向压进敌人走廊；关闭时落点在脚下，风向仍取朝威胁那一头。
 * 为什么值得先手：沙幕按趟磨掉无岩土护体者的生命、把身体顺风推走，岩石之躯还能借它提高特防；所以
 * 对手越多、越靠近时越值得早放——周围敌人达到 2 个以上时 priority 抬到 62，否则 46，接在 `world_combat:defend` 之前。
 * 避让友军：`ai.avoidAllies`（默认开）时，若落点的顺风走廊里已经有非岩石／地面／钢属性的友军，就不在这里起风，
 * 换到能把自己与友军都放在上风的落点；关闭则把沙幕也盖到友军头上。
 * 放完之后把伤害交回共用交战计划；还站在沙幕里时不再重复。
 */
namespace CompanionBehavior {
    const sandstormChase = PokemonSkills.number("ai.maxChase", "扬沙距离", 2, 24, 1);
    sandstormChase.help = "伙伴只在威胁离自己这么远以内时才考虑沙暴；调小只在贴身时扬沙，调大愿意提前布置。";
    const sandstormAdvance = PokemonSkills.flag("ai.advance", "把沙幕压向对手");
    sandstormAdvance.help = "开启后把沙幕扬在自己与威胁之间、更靠威胁的一侧，让风向压进敌人走廊；关闭则扬在脚下先护住自己。";
    const sandstormAvoid = PokemonSkills.flag("ai.avoidAllies", "避开顺风的友军");
    sandstormAvoid.help = "开启后，若沙幕顺风走廊里已有非岩石／地面／钢属性的友军就不在这里起风；关闭则也把沙幕盖到他们头上。";

    PokemonSkills.addPreferences("sandstorm", { ai: { maxChase: 14, advance: true, avoidAllies: true, leaveStation: false } },
        [sandstormChase, sandstormAdvance, sandstormAvoid, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    function sandstormCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "sandstorm") return items[i];
        return null;
    }
    function sandstormInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.sandstormField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    function sandstormCrowd(context: WorldBehavior.Context): number {
        const self = source(context);
        return (context.facts.nearby as Entity[]).filter(function (other) {
            return other.health > 0 && other.visible && !other.friendly && distance(other.point, self.point) <= 16;
        }).length;
    }

    /** 落点与风向：advance 时把落点推到自己与威胁之间、更靠威胁的一侧；风向始终取朝威胁那一头。 */
    function sandstormPlacement(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): { point: Entity; wind: number[] } {
        const self = source(context);
        const copy: Entity = JSON.parse(JSON.stringify(self));
        let dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        if (ai<boolean>(item, "advance", true)) {
            const step = Math.min(3, length * 0.5);
            copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
        }
        dx = copy.point[0] - self.point[0]; dz = copy.point[2] - self.point[2];
        const windLength = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        const wind = windLength > 0.01 ? [dx / windLength, 0, dz / windLength] : [0, 0, 1];
        return { point: copy, wind: wind };
    }

    /** 岩石／地面／钢属性不吃磨蚀；读到属性事实才判定，读不到宁可当作会受伤。 */
    function sandstormAllyExposed(context: WorldBehavior.Context, other: Entity): boolean {
        const facts = pokemonFacts(context, other);
        if (!facts || !Array.isArray(facts.types)) return true;
        const types = facts.types;
        return !(types.indexOf("rock") >= 0 || types.indexOf("ground") >= 0 || types.indexOf("steel") >= 0);
    }

    /** 落点顺风走廊（下风向、横向 16 格内）里是否已有非免疫友军。 */
    function sandstormAllyAtRisk(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const place = sandstormPlacement(context, item, threat);
        const nearby = (context.facts.nearby as Entity[]) || [];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (!sandstormAllyExposed(context, other)) continue;
            const dx = other.point[0] - place.point.point[0], dz = other.point[2] - place.point.point[2];
            const along = dx * place.wind[0] + dz * place.wind[2];
            const across = Math.abs(-place.wind[2] * dx + place.wind[0] * dz);
            if (along > -2 && along <= 16 && across <= 16) return true;
        }
        return false;
    }

    function sandstormWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        if (sandstormInside(context)) return false;
        if (ai<boolean>(item, "avoidAllies", true) && sandstormAllyAtRisk(context, item, threat)) return false;
        return true;
    }

    registerUse("sandstorm", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: function (context) { return sandstormCrowd(context) >= 2 ? 62 : 46; },
        available: function (context, item, _purpose, _target) { return sandstormWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_sandstorm/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = sandstormCapability(context);
            if (!item || !sandstormWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_sandstorm:" + threat.ref, kind: "world_combat:move_sandstorm", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_sandstorm/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_sandstorm") return [];
            const item = sandstormCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !sandstormWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const threat: Entity | null = current.senses["world_combat:threat"];
                return threat ? sandstormPlacement(current, item, threat).point : JSON.parse(JSON.stringify(source(current)));
            });
        }
    });
    orderGoals("world_combat:move_sandstorm/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_sandstorm");
    });
}
