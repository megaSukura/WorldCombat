/**
 * 戏法空间 / trickroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在任何戏法空间里，且实际选点的
 *   净收益高于接近 0 的阈值时才出手；全是快队友、或扭转会净拖累队伍时不白放。
 * 出手前的位置：比较脚下与前方 40% 处两处落点的实际净收益，选更高的一处——己方偏慢时按在脚下先把他们推快，
 *   敌方偏快时前压到交火点拖慢对手；开启 `ai.advance` 则优先前压。快于基准的队友会拉低该处收益，避免把他们一起拖慢。
 * 候选之间怎么排：净收益越大排得越前（基准 46，收益每 1 单位 +12，夹在 30..74）；只剩本招可选时仍按共享顺序落地。
 * 放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。配置 turn（强扭／缓扭）改变幅度、时长与冷却。
 */
namespace CompanionBehavior {
    const trickRoomChase = PokemonSkills.number("ai.maxChase", "扭转距离", 2, 24, 1);
    trickRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑戏法空间；调小只在贴身时按，调大愿意提前布置。";
    const trickRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    trickRoomAdvance.help = "开启后优先把空间前压到交战区拖慢对手；关闭则比较脚下与交火点两处的实际收益，取更有利的一处。";

    PokemonSkills.addPreferences("trickroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [trickRoomChase, trickRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);
    /** 净收益阈值（对数单位）：略高于 0，双方速度相近或净拖累队友时不白放一次空间。 */
    const trickRoomPayoffFloor = 0.05;

    function trickRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "trickroom") return items[i];
        return null;
    }
    /** 是否已经是某个戏法空间的有效成员：用真实状态身份，墙体挡住却没贡献的空间不算。 */
    function trickRoomInside(context: WorldBehavior.Context): boolean {
        return CompanionBehavior.status(context, source(context), PokemonSkills.trickRoomStatus);
    }
    /** 机制参数算出的空间半径；AI 不另写一份常数。 */
    function trickRoomRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const access = world(context), actor = access.actor(source(context).ref);
            if (!actor) return 3.6;
            const radius = PokemonSkills.p("trickroom", "spinRadius", { world: access, actor: actor, detail: { values: item.data.config } });
            return typeof radius === "number" && isFinite(radius) && radius > 0 ? radius : 3.6;
        } catch (error) { return 3.6; }
    }
    /** 机制参数算出的基准移动速度（原生量纲）；AI 不另写一份常数。 */
    function trickRoomReference(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const access = world(context), actor = access.actor(source(context).ref);
            if (!actor) return 0.184;
            const value = PokemonSkills.p("trickroom", "reference", { world: access, actor: actor, detail: { values: item.data.config } });
            return typeof value === "number" && isFinite(value) && value > 0 ? value : 0.184;
        } catch (error) { return 0.184; }
    }
    /** 一名活体的实际移动速度；读取失败就不计入收益。 */
    function trickRoomSpeed(context: WorldBehavior.Context, subject: Entity): number | null {
        const value = CompanionBehavior.speed(context, subject);
        return typeof value === "number" && isFinite(value) && value > 0 ? value : null;
    }
    /** 落点净收益：慢于基准的己方与快于基准的敌方为正，快己方、慢敌方为负；快队友会拉低收益。 */
    function trickRoomBenefit(context: WorldBehavior.Context, placement: number[], radius: number, reference: number): number {
        const candidates: Entity[] = [source(context)].concat((context.facts.nearby as Entity[]) || []);
        let benefit = 0;
        for (let i = 0; i < candidates.length; i++) {
            const subject = candidates[i];
            if (!subject || subject.health <= 0 || distance(subject.point, placement) > radius) continue;
            const speed = trickRoomSpeed(context, subject);
            if (speed === null) continue;
            const gain = Math.log(reference / speed);
            if (!isFinite(gain)) continue;
            benefit += subject.friendly ? gain : -gain;
        }
        return benefit;
    }
    function trickRoomPlacement(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number[] {
        const self = source(context), radius = trickRoomRadius(context, item), reference = trickRoomReference(context, item);
        const feet = self.point.slice();
        if (!threat) return feet;
        const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz));
        // 交火点：贴近威胁落点，让快威胁进圈、自己却多半留在圈外——敌快时扭它而不拖慢自己。
        const step = Math.max(0, Math.min(length, length - radius * 0.35));
        const front = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
        const feetScore = trickRoomBenefit(context, feet, radius, reference), frontScore = trickRoomBenefit(context, front, radius, reference);
        if (ai<boolean>(item, "advance", false)) return frontScore >= feetScore ? front : feet;
        return frontScore > feetScore + 0.15 ? front : feet;
    }
    /** 实际选点的净收益；wants／propose／create 用同一份判断，净收益接近零或为负就不白放。 */
    function trickRoomPayoff(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number {
        return trickRoomBenefit(context, trickRoomPlacement(context, item, threat), trickRoomRadius(context, item), trickRoomReference(context, item));
    }
    function trickRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (trickRoomInside(context)) return false;
        return trickRoomPayoff(context, item, threat) > trickRoomPayoffFloor;
    }
    function trickRoomPriority(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat) return 0;
        return Math.max(30, Math.min(74, 46 + trickRoomPayoff(context, item, threat) * 12));
    }

    registerUse("trickroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: trickRoomPriority,
        available: function (context, item, _purpose, _target) { return trickRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_trickroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = trickRoomCapability(context);
            if (!item || !trickRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_trickroom:" + threat.ref, kind: "world_combat:move_trickroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_trickroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_trickroom") return [];
            const item = trickRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !trickRoomWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                copy.point = trickRoomPlacement(current, item, threat);
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_trickroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_trickroom");
    });
}
