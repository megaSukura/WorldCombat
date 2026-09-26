/**
 * 飞叶风暴 / leafstorm 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 15）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.line`（默认开）打开时，目标身后沿同一条线还排着敌人的目标排前——移动的风暴能一路卷过去；
 *   宽高明显大于中型的对手也加分，移动旋切更容易在它身上卷到多次。特攻高于物攻的个体更愿意用它。
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

    /** 目标身后沿同一条线还排着几个敌人（供贯穿加分）。 */
    function leafstormAligned(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        const self = CompanionBehavior.source(context).point;
        const ax = target.point[0] - self[0], az = target.point[2] - self[2];
        const length = Math.sqrt(ax * ax + az * az);
        if (length < 0.5) return 0;
        const ux = ax / length, uz = az / length;
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const dx = other.point[0] - self[0], dz = other.point[2] - self[2];
            const along = dx * ux + dz * uz;
            if (along <= length || along > length + 9) continue;
            const across = Math.abs(dx * uz - dz * ux);
            if (across <= 1.2) count++;
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
            if (CompanionBehavior.ai<boolean>(capability, "line", true) && leafstormAligned(context, target) > 0) score += 8;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            if (CompanionBehavior.ratio(target) > 0.6) score += 3;
            if ((target.width || 0) >= 1.4 || (target.height || 0) >= 2.0) score += 5;
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
            help: "开启：目标身后还排着敌人的目标排前，用移动的风暴一次卷过一列；关闭则只按普通远程攻击排序。"
        })
    ]);
}
