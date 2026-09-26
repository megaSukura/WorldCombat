/**
 * 连环巴掌 / doubleslap 的伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack 位上。带连环巴掌的伙伴把它当**贴身连抽**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 4，本族最短）以内就出手；更远交给共享接近逻辑先走近。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.steady`（默认开）打开时，几乎不移动的
 *   目标排得更前——它不挪步就会被整串抽满；高速绕侧的目标排后，因为拨动加上走位会让它很快脱离掌扇、这串提前断。
 * 够不到怎么办：reach 就是本招射程，不够先走近；掌与掌之间目标若倒下或被拨出掌扇，这一串自然收住。
 * 放完之后：这一串抽完就收势，交回共享交战计划等冷却。
 * 优先级：基础 15；已在射程内 +6；`ai.steady` 开启时按目标水平速度加减：几乎站定 +9，高速移动 −6。仅剩本招可选时，它仍在普通顺序里被选中。
 */
namespace CompanionBehavior {
    function doubleslapWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 4);
    }

    /** 目标当前的水平速度；没有速度事实时按「站住」处理。 */
    function doubleslapSpeed(target: Entity): number {
        const velocity = target.velocity;
        if (!velocity || velocity.length < 3) return 0;
        return Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
    }

    registerUse("doubleslap", {
        protocols: ["world_combat:attack"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return doubleslapWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !doubleslapWants(context, item, target)) return 0;
            const gap = CompanionBehavior.distance(source(context).point, target.point);
            let score = 15;
            if (gap <= item.data.range) score += 6;
            if (ai<boolean>(item, "steady", true)) {
                const speed = doubleslapSpeed(target);
                if (speed < 0.02) score += 9;
                else if (speed > 0.12) score -= 6;
            }
            return score;
        }
    });

    PokemonSkills.addPreferences("doubleslap", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("cross"), "交叉式", "boolean", {
            help: "开启（交叉）：左右开弓，每掌把对手朝对侧拨开、掌数可到 5 掌；代价是单掌威力 ×0.85、够得略近、冷却 +2 刻。关闭（直抽，原生式）：同一侧连续重掴，单掌威力 ×1.2、够得略远；代价是掌数收在 4 掌、完全不拨动对手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 10, step: 1,
            help: "超过这个距离就不主动起掌，先走近。本招射程很短，默认值也小。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.steady"), "优先站定的目标", "boolean", {
            help: "开启：几乎不移动的目标（被逼住、贴墙、原地站定）排得更前，因为整串会被它吃满；高速移动、容易绕到掌扇外的目标排后。关闭则所有目标同价。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为连环巴掌离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
