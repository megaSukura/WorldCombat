/**
 * 飞叶风暴 / leafstorm 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 15）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.line`（默认开）且当前是卷叶式时，目标身后沿同一条线还排着敌人的目标排前——慢速移动的风暴
 *   能一路卷过去；随后按真实射程/风柱半径/高度与墙判定后排是否真的会被卷到，宽高明显大于中型的对手也加分。
 *   特攻高于物攻的个体更愿意用它。
 *   自身特攻已经被压低时（例如刚卷过一次风暴），`ai.regain`（默认开）会明显收敛，不无脑继续付代价。
 * 够不到怎么办：reach 就是本招射程，不够就靠近；前方被地形挡住（`world.clear` 不通）时降权。
 * 放完之后：一记沿准线卷过的特殊草；用完自身特攻会掉 2 级，交回共享交战计划。
 */
namespace PokemonSkills {
    function leafstormWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 15);
    }

    /** 目标身后沿同一条线还排着几个敌人（供贯穿加分）。仅卷叶式有意义：穿叶式撞上第一个就散，不奖励排队；
     *  按本个体真实贯穿数/射程/风柱半径，并排除高度差与墙后的目标。 */
    function leafstormAligned(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const values = { world: world, actor: world.source(), skill: skills["leafstorm"], detail: { values: capability.data.config } };
        if (p("leafstorm", "carry", values) <= 0) return 0;
        const reach = typeof capability.data.range === "number" ? capability.data.range : p("leafstorm", "reach", values);
        const girth = Math.max(0.2, p("leafstorm", "girth", values));
        const src = CompanionBehavior.point(CompanionBehavior.source(context).point);
        const ax = target.point[0] - src.x(), az = target.point[2] - src.z();
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 0;
        const ux = ax / length, uz = az / length;
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - src.x(), dy = other.point[1] - src.y(), dz = other.point[2] - src.z();
            const along = dx * ux + dz * uz;
            if (along <= length || along > reach) continue;
            if (Math.abs(dx * uz - dz * ux) > girth) continue;
            if (Math.abs(dy) > 3.0) continue;
            if (!world.clear(src, CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("leafstorm", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return leafstormWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !leafstormWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            let score = 22;
            if (distance <= capability.data.range) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "line", true) && leafstormAligned(context, capability, target) > 0) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            if (CompanionBehavior.ratio(target) > 0.6) score += 3;
            if ((target.width || 0) >= 1.4 || (target.height || 0) >= 2.0) score += 5;
            if (CompanionBehavior.ai<boolean>(capability, "regain", true)) {
                const dropped = Math.min(0, CompanionBehavior.stage(context, self, "spa"));
                score += dropped * 6;
            }
            const world = CompanionBehavior.world(context);
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point)))
                score = Math.max(3, score - 12);
            return score;
        }
    });

    addPreferences("leafstorm", {}, [
        field(pathOf("maelstrom"), "卷叶式", "boolean", {
            help: "开启：风速 ×0.62，风暴继续沿准线穿过至多若干敌人、每个只卷一次后继续，到射程尽头一次散开；代价是单发威力 ×0.85、起手 +3 刻、冷却 +6 刻，适合成排的敌人。关闭（穿叶式）：更快的叶刃撞上第一个敌人即散，单发更重、出手更快，适合单点。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 20, step: 1,
            help: "超过这个距离就不主动卷风暴，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.line"), "纵列优先", "boolean", {
            help: "仅在卷叶式生效：目标身后沿同一条线还排着敌人的目标排前，用慢速移动的风暴一次卷过一列（按真实射程/风柱半径/高度与墙判定）；穿叶式不越体，本项无效。关闭则只按普通远程攻击排序。"
        }),
        field(pathOf("ai.regain"), "耗后收敛", "boolean", {
            help: "开启：自身特攻已被压低时（例如刚卷过一次风暴）明显降低再卷的优先级，避免不断付同样的代价；关闭则不顾当前特攻等级，只按普通排序。"
        })
    ]);
}
