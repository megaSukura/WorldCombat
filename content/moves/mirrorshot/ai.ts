/**
 * 镜光射击 / mirrorshot 的伙伴 AI 用途。
 *
 * 什么局面下出手：一道又细又快、射程最长的单点光矛；有可见威胁、在 `ai.maxChase`（默认 17）格内即可出手，
 *   通常在共享接近之前就能打。它靠削命中创造价值，所以优先已经进入真实射程、且还没被晃到的人。
 * 对谁出手：当前威胁；已经带着共享身份 aim_impaired 的目标降一档（重复晃眼价值低）。
 *   散射式下以后方人数决定是否更值得打——张角读本招实际 `refractSpan`，且每个后方目标都要与命中点通视。
 * 够不到怎么办：reach 就是本招射程，不够先走入射程；这是笔直的一束光，站得正对更划算。
 * 放完之后：目标命中下降、眼前带 glare 一段时间；散射式下还会顺手溅到它身后的旁人。伙伴交回共享顺序。
 */
namespace PokemonSkills {
    function mirrorshotWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (context.facts.focus !== target.ref
            && CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 17)) return false;
        return true;
    }

    /** 本招当前实际反射张角（含体型），用行动携带的偏好配置求值，和真正施放时一致。 */
    function mirrorshotRefractSpan(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            const span = PokemonSkills.p(mirrorshotId, "refractSpan",
                { world: world, actor: world.source(), detail: { values: capability.data.config } });
            return isFinite(span) ? span : 80;
        } catch (error) { return 80; }
    }

    /** 主命中点身后扇区、与命中点通视且够得到的非友方数量；张角用实际 refractSpan，不固定 80 度。 */
    function mirrorshotFoesBehind(context: WorldBehavior.Context, self: CompanionBehavior.Entity, target: CompanionBehavior.Entity, span: number): number {
        const world = CompanionBehavior.world(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz) || 1;
        const hx = dx / length, hz = dz / length, cosHalf = Math.cos(span * Math.PI / 360);
        const hit = CompanionBehavior.point(target.point);
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.ref === self.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - target.point[0], oz = other.point[2] - target.point[2];
            const gap = Math.sqrt(ox * ox + oz * oz);
            if (gap > 4.5 || gap < 0.001) continue;
            if ((ox / gap * hx + oz / gap * hz) < cosHalf) continue;
            if (!world.clear(hit, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse(mirrorshotId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return mirrorshotWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !mirrorshotWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 18;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 4;
            if (CompanionBehavior.status(context, target, "aim_impaired")) score -= 8;
            if (capability.data.config && capability.data.config.scatter === true) {
                const behind = mirrorshotFoesBehind(context, self, target, mirrorshotRefractSpan(context, capability));
                if (behind >= 1) score += 6 + Math.min(6, (behind - 1) * 2);
            }
            return score;
        }
    });

    addPreferences(mirrorshotId, {}, [
        field(pathOf("scatter"), "散射式", "boolean", {
            help: "开启：光在目标身上反射开，顺射击方向溅到它身后一片旁人（吃反射伤害、半数概率被晃到）；代价是威力 ×0.85、射程 −1.5 格、晃眼概率 −6%、冷却 +4 刻，适合打一簇人。关闭（聚光）：威力 ×1.12、射程 +1.5 格、晃眼概率 +8%、起手 +1 刻，适合点掉一个人。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 24, step: 1,
            help: "超过这个距离就不主动射光，先走近。越大越愿意从更远处先手。"
        })
    ]);
}
