/**
 * 鸟嘴加农炮 / beakblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 16）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.punish`（默认开）打开时，身边已经有敌人贴进本招实际的加热接触半径（guard），或正朝自己压上来的
 *   敌人就先抬优先——贴上来的人要么被加热窗口烫伤、要么躲开；`ai.finishLow`（默认开）打开时残血目标排前，用更重的一炮收尾。
 * 够不到怎么办：reach 就是本招射程，不够先交给共享任务走入射程；加热窗口要站定，别在追击中被反打。
 * 放完之后：交回共享交战计划；喙弹独立飞行、命中后结算，接着打还是走位由共享顺序决定。
 */
namespace PokemonSkills {
    /** 加热接触半径取本招实际公式（与真实施放同一来源），不写死固定格数。 */
    function beakblastGuard(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.2, Math.min(3.0, p("beakblast", "guard", {
                world: world, actor: world.source(), skill: skills["beakblast"],
                detail: { values: capability.data.config } })));
        } catch (error) { return 3.2; }
    }

    /** 已有敌人贴进 guard 内，或正朝自己压上来的真实接近威胁：贴上来时加热窗口更有价值。 */
    function beakblastPressed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context);
        const guard = beakblastGuard(context, capability);
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || !(other.health > 0) || other.ref === self.ref) continue;
            const gap = CompanionBehavior.distance(self.point, other.point);
            if (gap <= guard) return true;
            // 真实接近威胁：还在 guard 外一点，但它的速度已经指向自己。
            const v = other.velocity;
            if (gap <= guard + 2 && v && v.length >= 3) {
                const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
                const dx = self.point[0] - other.point[0], dz = self.point[2] - other.point[2];
                const span = Math.sqrt(dx * dx + dz * dz) || 1;
                if (speed >= 0.02 && (v[0] * dx + v[2] * dz) / span > 0.01) return true;
            }
        }
        return false;
    }

    CompanionBehavior.registerUse("beakblast", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "punish", true) && beakblastPressed(context, capability)) score += 10;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 8;
            return score;
        }
    });

    addPreferences("beakblast", {}, [
        field(pathOf("forge"), "赤热式", "boolean", {
            help: "开启：加热时长 ×1.5、喙弹威力 ×1.15、弹体更大，但喙弹飞得更慢、射程 −1 格、起手 +2 刻、冷却 +8 刻——加热窗口越久越容易被贴上来烫回去。关闭（速射式）：加热 ×0.7、弹速 ×1.08、冷却 −6 刻，暴露更短更安全，代价是喙弹威力 ×0.92。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 26, step: 1,
            help: "超过这个距离就不主动开炮，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.punish"), "优先惩罚贴身", "boolean", {
            help: "开启：身边已经有敌人贴着时优先开炮，让加热窗口惩罚贴上来的人；关闭：只按普通远程招排序。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用更重的一炮收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
