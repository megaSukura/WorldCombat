/**
 * 奇妙空间 / wonderroom 的伙伴 AI 用途与自己的出手计划。
 *
 * 什么局面下出手：有可见威胁在 `ai.maxChase`（默认 13）格内、自己还没站在交换空间里，且落点范围内
 *   至少有一个「交换能带来正收益」的对象时出手。没有可交换对象（例如全场只有单通道生物）就不自动放。
 * 收益怎么判：从注册事实读实际双防；友方看威胁的实际攻击类别（优先最近一次真实原生攻击的记忆，其次按它自身攻/特攻取向）
 *   把对方打来的那一路守厚，敌方看我自己打的是哪一类把对方那一路削薄；对落点内每个双通道对象求「交换对己方是否有利」
 *   并求和，不再统一沿我方 atk/spa 且只取单个最大值。没有双防事实的对象保守跳过。
 * 出手前的位置：`ai.advance` 关闭（默认）时按在脚下先换自己；开启时前压到交战区 40% 处，让双方一起被换。
 * 放完之后：把伤害交回共用交战计划；还站在空间里时不再重复。配置 span（广域／紧凑）改变半径、时长与节奏。
 */
namespace CompanionBehavior {
    const wonderRoomChase = PokemonSkills.number("ai.maxChase", "交换距离", 2, 24, 1);
    wonderRoomChase.help = "伙伴只在威胁离自己这么远以内时才考虑奇妙空间；调小只在贴身时按，调大愿意提前布置。";
    const wonderRoomAdvance = PokemonSkills.flag("ai.advance", "把空间压向对手");
    wonderRoomAdvance.help = "开启后把空间按在自己与威胁之间，让交战区一起被换；关闭则按在脚下先换自己。";

    PokemonSkills.addPreferences("wonderroom", { ai: { maxChase: 13, advance: false, leaveStation: false } },
        [wonderRoomChase, wonderRoomAdvance, PokemonSkills.flag("ai.leaveStation", "离开驻守点")]);

    // 注册事实：只有同时具有防御与特防两条通道的对象才返回；单通道生物返回 null，AI 据此保守不猜。
    CompanionBehavior.registerFact("world_combat:move_wonderroom/stats", function (access: CombatWorld, actor: CombatActor, _argument: any): any {
        const facts = PokemonDamage.combatants.read(access, actor);
        const def = facts.stats.def, spd = facts.stats.spd;
        if (typeof def !== "number" || !isFinite(def) || typeof spd !== "number" || !isFinite(spd)) return null;
        return { def: def, spd: spd };
    });

    function wonderRoomCapability(context: WorldBehavior.Context): WorldBehavior.Capability | null {
        const items = ready(context, "world_combat:prepare");
        for (let i = 0; i < items.length; i++) if (items[i].data.move === "wonderroom") return items[i];
        return null;
    }
    function wonderRoomInside(context: WorldBehavior.Context): boolean {
        const access = world(context), self = source(context);
        const areas = WorldEffects.areas(access, PokemonSkills.wonderRoomField);
        for (let i = 0; i < areas.length; i++) if (distance(areas[i].position, self.point) <= areas[i].radius) return true;
        return false;
    }
    // 我方输出方向：用施法者本人的实际攻击／特攻取向作代理，决定把敌方的哪条通道削薄。
    function wonderRoomSelfPhysical(context: WorldBehavior.Context): boolean {
        const facts = CompanionBehavior.combatStats(context, source(context));
        const stats = facts && facts.stats;
        if (!stats) return true;
        const atk = Number(stats.atk), spa = Number(stats.spa);
        return !isFinite(atk) || !isFinite(spa) ? true : atk >= spa;
    }
    // 敌实际攻击类别：优先读威胁最近一次真正发生的原生攻击记忆，其次按威胁自身攻/特攻取向估计。
    function wonderRoomFoePhysical(context: WorldBehavior.Context, threat: Entity | null): boolean {
        const access = world(context);
        if (threat) {
            const actor = access.actor(threat.ref);
            if (actor !== null) {
                const recent = DamageSemantics.recentAttack(access, actor, 200);
                if (recent) {
                    if (recent.category === "special") return false;
                    if (recent.category === "physical") return true;
                }
            }
            const stats = CompanionBehavior.combatStats(context, threat);
            const values = stats && stats.stats;
            if (values) {
                const atk = Number(values.atk), spa = Number(values.spa);
                if (isFinite(atk) && isFinite(spa)) return atk >= spa;
            }
        }
        return true;
    }
    // 用机制本身解出的空间半径判断落点覆盖，避免在 AI 里另写一份常数。
    function wonderRoomRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const access = world(context), actor = access.actor(source(context).ref);
            if (!actor) return 3.4;
            const radius = PokemonSkills.p("wonderroom", "swapRadius",
                { world: access, actor: actor, detail: { values: item.data.config } });
            return typeof radius === "number" && isFinite(radius) && radius > 0 ? radius : 3.4;
        } catch (error) { return 3.4; }
    }
    function wonderRoomPlacement(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): number[] {
        const self = source(context);
        if (!threat || !ai<boolean>(item, "advance", false)) return self.point.slice();
        const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
        const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
        return [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
    }
    // 交换收益：对每个对象的双防差值按「哪一方受益」选方向，再对落点内所有双通道对象求净收益。
    // 友方：看威胁真正打来的是物理还是特殊，把那一侧守厚；敌方：看我自己打的是哪一类，把那一侧削薄。
    function wonderRoomAssess(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): { any: boolean; net: number } {
        const foePhysical = wonderRoomFoePhysical(context, threat), selfPhysical = wonderRoomSelfPhysical(context);
        const radius = wonderRoomRadius(context, item);
        const placement = wonderRoomPlacement(context, item, threat);
        const candidates: Entity[] = [source(context)].concat((context.facts.nearby as Entity[]) || []);
        let any = false, net = 0;
        for (let i = 0; i < candidates.length; i++) {
            const subject = candidates[i];
            if (!subject || subject.health <= 0 || distance(subject.point, placement) > radius) continue;
            const stats = CompanionBehavior.fact<{ def: number; spd: number }>(context, "world_combat:move_wonderroom/stats", subject);
            if (!stats || typeof stats.def !== "number" || typeof stats.spd !== "number") continue;
            const diff = stats.spd - stats.def;
            const benefit = subject.friendly ? (foePhysical ? diff : -diff) : (selfPhysical ? -diff : diff);
            if (!isFinite(benefit)) continue;
            net += benefit; any = true;
        }
        return { any: any, net: net };
    }
    function wonderRoomWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity | null): boolean {
        if (!threat || threat.health <= 0 || !threat.visible || threat.friendly) return false;
        if (context.facts.intent === "hold" && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 13)) return false;
        if (wonderRoomInside(context)) return false;
        const assessment = wonderRoomAssess(context, item, threat);
        return assessment.any && assessment.net > 0;
    }
    function wonderRoomPriority(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const threat: Entity | null = context.senses["world_combat:threat"];
        if (!threat) return 0;
        const assessment = wonderRoomAssess(context, item, threat);
        if (!assessment.any || assessment.net <= 0) return 0;
        return Math.max(32, Math.min(74, 46 + assessment.net * 0.15));
    }

    registerUse("wonderroom", {
        protocols: ["world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        priority: wonderRoomPriority,
        available: function (context, item, _purpose, _target) { return wonderRoomWants(context, item, context.senses["world_combat:threat"]); }
    });
    registry.goal({ id: "world_combat:move_wonderroom/goal", propose: function (context) {
            const threat: Entity | null = context.senses["world_combat:threat"];
            if (!threat) return [];
            const item = wonderRoomCapability(context);
            if (!item || !wonderRoomWants(context, item, threat)) return [];
            return [{ id: "world_combat:move_wonderroom:" + threat.ref, kind: "world_combat:move_wonderroom", data: { ref: threat.ref } }];
        } });
    registry.method({ id: "world_combat:move_wonderroom/method",
        propose: function (context, goal) {
            if (goal.kind !== "world_combat:move_wonderroom") return [];
            const item = wonderRoomCapability(context), threat = entity(context, goal.data.ref);
            if (!item || !wonderRoomWants(context, item, threat)) return [];
            return [{ id: item.id, data: { ref: goal.data.ref }, capabilities: [item] }];
        },
        create: function (_context, choice) {
            const item = choice.offer.capabilities![0];
            return castNode(item.id, "prepare", function (current) {
                const self = source(current), threat: Entity | null = current.senses["world_combat:threat"];
                const copy: Entity = JSON.parse(JSON.stringify(self));
                if (ai<boolean>(item, "advance", false) && threat) {
                    const dx = threat.point[0] - self.point[0], dz = threat.point[2] - self.point[2];
                    const length = Math.max(0.001, Math.sqrt(dx * dx + dz * dz)), step = Math.min(2, length * 0.4);
                    copy.point = [self.point[0] + dx / length * step, self.point[1], self.point[2] + dz / length * step];
                }
                return copy;
            });
        }
    });
    orderGoals("world_combat:move_wonderroom/priority", function (_context, order) {
        const index = order.indexOf("world_combat:defend");
        order.splice(index < 0 ? order.length : index, 0, "world_combat:move_wonderroom");
    });
}
