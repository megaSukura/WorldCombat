/**
 * 羽毛舞 的伙伴 AI 用途：这招自己的一套出手计划。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内、对方还没被羽绒覆住。
 * 对谁出手：当前威胁；正在攻击自己或主人、或刚打过自己的那个优先——先把最凶的物攻手压住。
 *   物理威胁（atk ≥ spa）额外提价，正对得上「削弱靠物攻输出的对手」。
 * 预判撒羽：移动中的目标，用它的当前速度乘上「羽绒飞到它所在处所需的刻数」（距离 ÷ flightSpeed，
 *   时间夹 0..12 刻、位移再夹 2.5 格），把云撒在它下一刻要经过的位置。预测点先过两关才采用：
 *   clipBlocks 确认施法者到预测点之间没有被地形截下，地表探针确认预测点下方确有可落的地面；
 *   任一不过就退回目标当前位置，不硬赌。这是 target 钩子里的只读计算，不新增机制、不改本招强度。
 * 够不到怎么办：reach 就是撒羽距离，超出的先走近；羽绒会被掩体挡下，视线不好时交回共享接近逻辑。
 * 放完之后：目标大幅掉攻击，落点留下一片绒雾；伙伴随即交回共享顺序，把对手往绒雾里带或直接追击。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("featherdance", { ai: { maxChase: 10, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function featherdanceWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (context.facts.focus !== threat.ref && distance(self.point, threat.point) > ai<number>(item, "maxChase", 10)) return false;
        return !status(context, threat, "downy");
    }

    /** 预测点下方是否有可落羽的地面：向下探几格，遇到空气继续，遇到液体视为不可落，找不到支撑面则不采用。 */
    function featherdanceLanding(world: CombatWorld, at: number[]): boolean {
        const baseY = Math.floor(at[1]);
        for (let probe = baseY + 1; probe >= baseY - 4; probe--) {
            const block = world.block(WorldCombat.point(at[0], probe, at[2]));
            if (block === null) return false;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return id !== "minecraft:water" && id !== "minecraft:lava";
        }
        return false;
    }

    /** 预判落点：当前速度 × 有界飞行时间，再夹位移；clipBlocks 与地表探针任一不过就退回目标当前位置。 */
    function featherdancePredicted(context: WorldBehavior.Context, item: WorldBehavior.Capability, selected: Entity): Entity {
        const velocity = selected.velocity;
        if (!velocity || velocity.length < 3) return selected;
        const self = source(context), world = CompanionBehavior.world(context);
        let speed = 1.0;
        try { speed = Math.max(0.5, PokemonSkills.p("featherdance", "flightSpeed", world)); }
        catch (error) { speed = 1.0; }
        const lead = Math.max(0, Math.min(12, distance(self.point, selected.point) / speed));
        if (lead <= 0) return selected;
        let dx = velocity[0] * lead, dz = velocity[2] * lead;
        const length = Math.sqrt(dx * dx + dz * dz), cap = 2.5;
        if (length > cap) { dx *= cap / length; dz *= cap / length; }
        if (Math.abs(dx) + Math.abs(dz) < 0.05) return selected;
        const predicted = [selected.point[0] + dx, selected.point[1], selected.point[2] + dz];
        const clip = world.clipBlocks(point(self.point), point(predicted));
        if (clip !== null && clip.blocked()) return selected;
        if (!featherdanceLanding(world, predicted)) return selected;
        const copy: Entity = JSON.parse(JSON.stringify(selected));
        copy.point = predicted;
        // ref 置空：宿主把 aim 动作按世界点提交，云就撒在预测的位置而不是追着目标本人。
        copy.ref = "";
        return copy;
    }

    registerUse("featherdance", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || featherdanceWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        /** 落点交给预测点（ref 为空按世界点提交）；接近对象仍是真实威胁。 */
        target: function (context, item, selected) { return featherdancePredicted(context, item, selected); },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !featherdanceWants(context, item, target)) return 0;
            const self = source(context);
            const owner = context.facts.owner;
            const provoked = target.attacking === self.ref || !!owner && target.attacking === owner.ref;
            const recent = self.hurtAgo < 40;
            // 偏向物理威胁：攻击高过特攻的目标先被削，正对得上「削弱靠物攻输出的对手」。
            const stats = CompanionBehavior.combatStats(context, target);
            const values = stats && stats.stats ? stats.stats : null;
            const atk = values && typeof values.atk === "number" ? values.atk : 0;
            const spa = values && typeof values.spa === "number" ? values.spa : 0;
            const physical = atk > 0 && atk >= spa ? 14 : 0;
            return Math.min(95, 50 + (provoked ? 12 : 0) + (recent ? 8 : 0) + physical);
        }
    });
}
