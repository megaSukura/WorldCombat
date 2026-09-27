/**
 * 冰锥的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格之内；更远交给共享接近逻辑。
 *   它是同向齐排、不追不散的覆盖型齐射，适合正对着一个宽目标或一排敌人时出手。
 * 对谁出手：按**整排真实罩住主目标的根数**估值——用本招的锥数／间距／判定与「本体到 muzzle 无墙 +
 *   muzzle 到目标有视线」逐根算；罩得住的根数越多排得越前，附近还有别人也被同一排真罩到时再加分。
 *   不再用 width×height 或「附近 3 格有人」冒充多锥覆盖。
 * 对 Boss：霜寒可能被原生免控拒绝，但每根命中都照常结算物理伤害，所以不因免疫减速而放弃。
 * 够不到怎么办：reach 就是本招射程，不够先走近；整排平行直飞，方向可空放，墙会碎掉撞上的冰锥。
 * 放完之后：这一排射完就收势，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function iciclespearWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 11);
    }

    /** 目标横向半宽：优先决策帧已有宽度事实，缺失时读一次原生碰撞箱。 */
    function iciclespearHalfWidth(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const width = Number(target.width);
        if (isFinite(width) && width > 0) return width / 2;
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref), body = actor !== null ? world.observe(actor) : null;
        return body !== null ? (body.boundsMax().x() - body.boundsMin().x()) / 2 : 0.45;
    }

    /** 这一排真正罩住某个身体的根数：逐根算平行线到身体的横向间距，再过「本体到 muzzle 无墙、muzzle 到身体通视」。 */
    function iciclespearHitsOn(context: WorldBehavior.Context, capability: WorldBehavior.Capability,
            self: number[], target: CompanionBehavior.Entity, shots: number, spacing: number, coneRadius: number, reach: number): number {
        const world = CompanionBehavior.world(context);
        const dx = target.point[0] - self[0], dz = target.point[2] - self[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01 || length > reach + 1.5) return 0;
        const hx = dx / length, hz = dz / length, sx = -hz, sz = hx;
        const span = iciclespearHalfWidth(context, target) + coneRadius;
        const half = (shots - 1) / 2;
        let hits = 0;
        for (let i = 0; i < shots; i++) {
            const offset = (i - half) * spacing;
            if (Math.abs(offset) > span) continue;
            const muzzle = WorldCombat.point(self[0] + sx * offset, self[1], self[2] + sz * offset);
            if (WorldGeometry.blockHit(world, CompanionBehavior.point(self), muzzle) !== null) continue;
            if (!world.clear(muzzle, CompanionBehavior.point(target.point))) continue;
            hits++;
        }
        return hits;
    }

    /** 主目标被罩住的根数，以及附近还有几个敌对目标被这一排真罩到。 */
    function iciclespearCoverage(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): { primary: number; extras: number } {
        const world = CompanionBehavior.world(context), actor = world.source();
        const args = { world: world, actor: actor, skill: skills["iciclespear"], detail: { values: capability.data.config } };
        const shots = Math.max(2, Math.min(5, Math.round(p("iciclespear", "shots", args))));
        const radius = Math.max(0.1, p("iciclespear", "radius", args));
        const spacing = Math.max(0.28, radius * 2.4);
        const reach = Math.max(1, Number(capability.data.range) || p("iciclespear", "reach", args));
        const self = CompanionBehavior.source(context).point;
        const primary = iciclespearHitsOn(context, capability, self, target, shots, spacing, radius, reach);
        let extras = 0;
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self, other.point) > reach + 1.5) continue;
            if (iciclespearHitsOn(context, capability, self, other, shots, spacing, radius, reach) > 0) extras++;
        }
        return { primary: primary, extras: extras };
    }

    CompanionBehavior.registerUse("iciclespear", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return iciclespearWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !iciclespearWants(context, capability, target)) return 0;
            const source = CompanionBehavior.source(context).point;
            const distance = CompanionBehavior.distance(source, target.point);
            const coverage = iciclespearCoverage(context, capability, target);
            let score = 16;
            if (distance <= capability.data.range) score += 5;
            if (coverage.primary >= 3) score += 8;
            else if (coverage.primary === 2) score += 4;
            else if (coverage.primary <= 0) score -= 6;
            if (coverage.extras > 0) score += Math.min(6, coverage.extras * 3);
            if (distance > 7 && coverage.primary < 2) score -= 6;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) < 0.4) score += 9;
            return Math.max(1, score);
        }
    });

    addPreferences("iciclespear", {}, [
        field(pathOf("rime"), "霜附式", "boolean", {
            help: "开启：每根命中的霜寒高一个减速档次、霜寒时长 ×1.6、冰屑范围 ×1.3，适合粘住目标；代价是锥数收在 3 根、单锥威力 ×0.9、起手 +2 刻、冷却 +4 刻。关闭（纯碎式）：锥数可到 5 根、单锥威力 ×1.1、冷却 −4 刻，代价是只留最浅的霜寒与更小的冰屑范围。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "超过这个距离就不主动射锥，先走近。越大越愿意从更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这一排冰锥收尾；关闭则所有目标同价。"
        })
    ]);
}
