/**
 * 飞翔 / Fly — 伙伴 AI 用途。
 *
 * 这招的 AI 围绕“头顶那片天空是资源”：
 *   - 何时考虑：目标看得见、活着、非友方，且在 `ai.maxChase` 内（或它就是焦点）；并且自己头顶有净空
 *     （`flyOpen` 检查头顶 1.5 格是不是空的）。压在天花板下只剩低跳，伙伴宁可交给别的招。
 *   - 对谁出手：默认接受任何合格目标；`ai.minHealth` 决定带伤到什么程度还愿意飞上去换一击。
 *   - 出手前：没有视线要求（从上方落，不走地面直线），由共用任务走到 reach。
 *   - 够不到：由共用任务靠近；驻守且没开 leaveStation 时不硬追。
 *   - 放完之后：不追加动作，交回共享交战；落点通常已经贴着目标。
 *   - 什么时候紧急：自身生命低于 `ai.minHealth` 且目标在射程内时 priority 提到 60——用天空躲开近战火力
 *     的同时仍然砸出去，是这招最像“逃也是打”的一刻。
 */
namespace CompanionBehavior {
    /** 头顶 1.5 格是否有净空：按整身体积扫多个横截面，任一列顶到方块就不算开阔；没观察到就当作开阔。 */
    function flyOpen(context: WorldBehavior.Context): boolean {
        var access = world(context), actor = access.actor(source(context).ref);
        var body = actor === null ? null : access.observe(actor);
        if (body === null) return true;
        var position = body.position(), top = position.y() + body.height() * 0.5 + 1.5;
        var halfW = Math.max(0.15, body.width() * 0.5 - 0.05);
        var offsets = [[0, 0], [halfW, halfW], [-halfW, halfW], [halfW, -halfW], [-halfW, -halfW]];
        for (var i = 0; i < offsets.length; i++) {
            var block = access.block(point([position.x() + offsets[i][0], top, position.z() + offsets[i][1]]));
            if (block !== null && String(block.id()).indexOf("air") < 0) return false;
        }
        return true;
    }
    /** 身体中心到第一块非空气方块之间的净空（AI 侧读同一事实，用于估算真实飞行高度）。 */
    function flyClearance(access: CombatWorld, body: CombatObservation, limit: number): number {
        var position = body.position(), top = position.y() + body.height() * 0.5;
        var steps = Math.ceil(limit * 2) + 2;
        for (var step = 0; step <= steps; step++) {
            var block = access.block(point([position.x(), top + step * 0.5, position.z()]));
            if (block !== null && String(block.id()).indexOf("air") < 0) return Math.max(0, step * 0.5 - 0.4);
        }
        return limit;
    }
    /** 整条飞行路径是否都在净空下：沿到威胁的直线在实际悬停高度采样几处，中途低顶也会被读到。 */
    function flyRouteOpen(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        var access = world(context), actor = access.actor(source(context).ref);
        var body = actor === null ? null : access.observe(actor);
        if (body === null) return true;
        var limit = PokemonSkills.p("fly", "altitude", { world: access, actor: access.source(),
            skill: PokemonSkills.skills["fly"], detail: { values: item.data.config } });
        var position = body.position(), y = position.y() + Math.max(0.5, Math.min(limit, flyClearance(access, body, limit)));
        for (var step = 1; step <= 4; step++) {
            var t = step / 4;
            var block = access.block(point([position.x() + (threat.point[0] - position.x()) * t, y,
                position.z() + (threat.point[2] - position.z()) * t]));
            if (block !== null && String(block.id()).indexOf("air") < 0) return false;
        }
        return true;
    }

    /** 是不是配置里的定点击落：此时落点范围大，值得等落区聚起人再一起压。 */
    function flyPin(item: WorldBehavior.Capability): boolean {
        return !!item.data.config && item.data.config.track === false;
    }
    /** 本招当刻真实的定点半径（AI 聚群与判定共用公式），不另写一个近似值。 */
    function flyPinRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        var access = world(context);
        return PokemonSkills.p("fly", "impactRadius", { world: access, actor: access.source(),
            skill: PokemonSkills.skills["fly"], detail: { values: item.data.config } }) * PokemonSkills.flyPinFactor;
    }
    /** 目标落区附近聚着几个敌人，用来决定定点击落值不值得飞。 */
    function flyNearbyEnemies(context: WorldBehavior.Context, threat: Entity, radius: number): number {
        var nearby = context.facts.nearby as Entity[], count = 0;
        for (var i = 0; i < nearby.length; i++) {
            if (nearby[i].friendly || nearby[i].health <= 0) continue;
            if (distance(nearby[i].point, threat.point) <= radius) count++;
        }
        return count;
    }

    const flyChase = PokemonSkills.number("ai.maxChase", "俯冲距离", 3, 22, 1);
    flyChase.help = "伙伴在威胁离自己这么远以内时才考虑飞翔；调小只在近处落击，调大愿意从更远处飞过去。";
    const flyHealth = PokemonSkills.number("ai.minHealth", "最低血线", 0.15, 0.9, 0.05);
    flyHealth.help = "伙伴生命低于这个比例时才把飞翔当成“躲开近战的一击”，priority 提前；调高更常在挨打时飞。";
    const flyCrowd = PokemonSkills.number("ai.crowd", "落区敌人数", 1, 4, 1);
    flyCrowd.help = "定点击落时，落点附近至少聚着这么多敌人才飞，好一次压住一群；追踪俯冲不受此限，设为 1 则单个目标也飞。";
    const flyLeave = PokemonSkills.flag("ai.leaveStation", "离开驻守点");
    flyLeave.help = "开启后，驻守中的伙伴会离开原位飞出去落击敌人。";

    PokemonSkills.addPreferences("fly", { ai: { maxChase: 14, minHealth: 0.5, crowd: 1, leaveStation: false } }, [flyChase, flyHealth, flyCrowd, flyLeave]);

    /** 这个目标此刻值不值得飞：看得见、活着、非友方、在俯冲距离内；定点击落再要求落区聚够人。 */
    function flyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.friendly || !threat.visible || threat.health <= 0) return false;
        if (context.facts.focus !== threat.ref && distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        if (flyPin(item)) {
            var need = ai<number>(item, "crowd", 1);
            if (need > 1 && flyNearbyEnemies(context, threat, flyPinRadius(context, item)) < need) return false;
        }
        return true;
    }

    registerUse("fly", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (!flyOpen(context)) return false;
            if (target && !flyRouteOpen(context, item, target)) return false;
            return !target || flyWants(context, item, target);
        },
        priority: function (context, item, target) {
            if (!target) return 0;
            var self = source(context), range = item.data.range;
            // 带伤、目标又在射程内，且确实是贴地的近战威胁、头顶有净空：才把飞翔当“逃也是打”。
            if (ratio(self) < ai<number>(item, "minHealth", 0.5) && distance(self.point, target.point) <= range
                && target.grounded !== false && flyOpen(context)) return 60;
            return 0;
        },
        accepts: function (context, item, target) {
            return flyWants(context, item, target);
        }
    });
}
