/**
 * 花瓣舞 的伙伴 AI 用途：一套「在外围走位、用花裙外沿削」的出手计划。
 *
 * 什么局面有意义：威胁可见、敌对、存活，且在 ai.maxChase（默认 12）格以内（花瓣舞够得远，比近战敢早开）。
 *   站距按外环维持：目标已经站在外沿附近、或落在外圈之外时按 ai.minFoes 决定；目标贴进安全中空时也要先把它送回外沿，
 *   所以 approach 会把伙伴带到一个「目标正好落在花裙外半径」的站位（按当前配置里的有效内圈算），并优先挑一条与目标通视、
 *   自身落点不是实心方块的方位（顺带避开贴墙转身）。
 * 对谁出手：当前威胁；正处于恍惚（共享身份 confusion）时不出手——刚跳完的自己就是乱的。
 * 够不到怎么办：reach 就是风暴半径，够不到就由共享任务走近；贴进内圈则先站到外圈距离，不直接走到敌人身边。
 * 放完之后：圈里的人被花瓣推挤，伙伴交回共享顺序再决定追击还是拉开距离。
 * ai.leaveStation：驻守/静止命令下是否愿意离位去舞。
 */
namespace CompanionBehavior {
    function petalRadius(capability: WorldBehavior.Capability): number {
        return typeof capability.data.range === "number" && isFinite(capability.data.range) ? capability.data.range : 5.0;
    }

    /** 按当前配置求有效内圈半径（绝对格数）；复用本招实际公式，配置不同内圈也不同。 */
    function petalInner(context: WorldBehavior.Context, capability: WorldBehavior.Capability, radius: number): number {
        const access = CompanionBehavior.world(context), actor = access.source();
        const ratio = PokemonSkills.p(PokemonSkills.petaldanceId, "inner", { world: access, actor: actor,
            skill: PokemonSkills.skills[PokemonSkills.petaldanceId], detail: { values: capability.data.config } });
        return Math.max(0.6, radius * ratio);
    }

    function petalFoes(context: WorldBehavior.Context, capability: WorldBehavior.Capability, centre: number[], radius: number): number {
        const access = CompanionBehavior.world(context);
        const inner = petalInner(context, capability, radius);
        let count = 0;
        WorldGeometry.selectBodies(access, PokemonSkills.petaldanceRing(CompanionBehavior.point(centre), inner, radius), (other, body) => {
            if (!access.friendly(other) && body.health() > 0 && body.visible()) count++;
        });
        return count;
    }

    function petalWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, threat: Entity): boolean {
        const self = CompanionBehavior.source(context);
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (CompanionBehavior.status(context, self, "confusion")) return false;
        const radius = petalRadius(capability), minimum = CompanionBehavior.ai<number>(capability, "minFoes", 1);
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)
            && CompanionBehavior.distance(self.point, threat.point) > radius) return false;
        const gap = CompanionBehavior.distance(self.point, threat.point);
        // 外圈之外：先接近；贴进安全中空：先站位把它送回外沿；已在环带附近：按罩住人数决定。
        if (gap > radius) return true;
        if (gap < petalInner(context, capability, radius)) return true;
        return petalFoes(context, capability, self.point, radius) >= minimum;
    }

    /** 站到「目标正好落在花裙外半径」的位置，优先与目标通视、落点非实心方块的方位。 */
    function petalApproach(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: Entity, reach: number): WorldMethods.Positioning {
        const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const radius = Math.max(2.0, isFinite(reach) && reach > 0 ? reach : petalRadius(capability));
        const dx = self.point[0] - target.point[0], dz = self.point[2] - target.point[2];
        const base = Math.abs(dx) + Math.abs(dz) < 1e-4 ? 0 : Math.atan2(dx, dz);
        const offsets = [0, 0.6, -0.6, 1.2, -1.2, 2.0, -2.0, Math.PI];
        for (let i = 0; i < offsets.length; i++) {
            const a = base + offsets[i];
            const px = target.point[0] + Math.sin(a) * radius, pz = target.point[2] + Math.cos(a) * radius, py = target.point[1];
            const cell = access.block(CompanionBehavior.point([Math.floor(px), Math.floor(py), Math.floor(pz)]));
            if (cell !== null) { const id = String(cell.id()); if (id.indexOf("air") < 0 && id.indexOf("water") < 0) continue; }
            if (!access.clear(CompanionBehavior.point([px, py, pz]), CompanionBehavior.point(target.point))) continue;
            return { point: [px, py, pz], within: 1.0 };
        }
        return { point: [target.point[0] + Math.sin(base) * radius, target.point[1], target.point[2] + Math.cos(base) * radius], within: 1.0 };
    }

    CompanionBehavior.registerUse(PokemonSkills.petaldanceId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return petalRadius(capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.status(context, CompanionBehavior.source(context), "confusion")) return false;
            if (!target) return true;
            if (!petalWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (context, capability, target) { return target; },
        approach: function (context, capability, target, reach) { return petalApproach(context, capability, target, reach); },
        priority: function (context, capability, target) {
            if (!target || !petalWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            return Math.min(88, 30 + petalFoes(context, capability, self.point, petalRadius(capability)) * 8);
        }
    });

    PokemonSkills.addPreferences(PokemonSkills.petaldanceId, {}, [
        PokemonSkills.field(PokemonSkills.pathOf("drift"), "旋舞", "boolean", {
            help: "开启：漂得更远、风暴更宽、花瓣留得更久、推得更开，但起手与冷却更久、舞完晕得更久——适合边打边拉开距离。关闭（原地舞）：转在原地、收放更快、失控更短，代价是范围与留痕都收窄。"
        }),
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 18, 1),
        PokemonSkills.number("ai.minFoes", "罩住人数", 1, 5, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
