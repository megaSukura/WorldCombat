/**
 * 冰锥的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 11）格之内；更远交给共享接近逻辑。
 *   它是同向齐排、不追不散的覆盖型齐射，适合正对着一个宽目标或一排敌人时出手。
 * 对谁出手：体型宽的目标（Boss 等）会被整排多根同时穿中，排得更前；目标周围还有别的敌人（横排）也加分。
 *   反过来，远而小的目标只有一两根够得着，命中根数少，优先级被压低；近处照常压上。
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

    /** 目标的体型乘积（宽 × 高）；优先用决策帧已有事实，缺失时才读一次世界观察。 */
    function iciclespearBulk(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const width = Number(target.width), height = Number(target.height);
        if (isFinite(width) && isFinite(height) && width > 0 && height > 0) return width * height;
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        const body = actor !== null ? world.observe(actor) : null;
        return body !== null ? body.width() * body.height() : 0;
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
            const bulk = iciclespearBulk(context, target);
            let score = 16;
            if (distance <= capability.data.range) score += 5;
            if (bulk >= 3) score += 6;
            else if (bulk >= 1.6) score += 3;
            const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
            let row = 0;
            for (let i = 0; i < nearby.length; i++) {
                const other = nearby[i];
                if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3) row++;
            }
            if (row >= 1) score += 3;
            if (distance > 7 && bulk < 1.6) score -= 6;
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
