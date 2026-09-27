/**
 * 虫扑 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，在 `ai.maxChase` 之内。它是一记中距离的扑击，价值在于贴上去并缠住对方。
 * 对谁出手：当前威胁；不可见、友方或已倒下的不接受。`ai.preferFresh` 开启时，已经带着 clung 身份的目标排后。
 * 弧线净空：跳跃拱顶处放不下自己的身体（低顶棚、洞穴、贴墙）时大幅降低推荐，不在低顶棚下盲选高扑；
 *   较远、且在射程内的目标更贴合这条高弧的用途，优先度更高。
 * 够不到怎么办：`reach` 就是本招射程，不够就先走近；它负责把距离一口气缩掉，不负责远程骚扰。
 * 放完之后：目标被缠身、速度等级下降，交回共享交战计划；残血目标让这一扑更有收尾价值。
 */
namespace PokemonSkills {
    /**
     * 沿整条弧逐点检查身体净空，并核对终点支撑：不只看拱顶一个点；目标高过拱顶、或沿弧有实体/方块占位时返回 false。
     * 明确可接触的空中目标不要求落脚面；同一决策帧内缓存。
     */
    function pounceArcClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "pounce:arc:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const apex = p("pounce", "apex", world), leap = p("pounce", "leap", world);
            const width = self.width === undefined ? 0.9 : self.width, height = self.height === undefined ? 1.4 : self.height;
            const selfFeet = self.point[1] - height / 2;
            const targetFeet = target.point[1] - (target.height === undefined ? 1.4 : target.height) / 2;
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const gap = Math.sqrt(dx * dx + dz * dz);
            if (gap < 0.01) return false;
            const distance = Math.min(leap, Math.max(1.5, gap));
            const ux = dx / gap, uz = dz / gap, drop = targetFeet - selfFeet;
            if (drop > apex - 0.15) return false;
            for (let i = 0; i <= 6; i++) {
                const t = i / 6;
                const y = selfFeet + drop * t + apex * 4 * t * (1 - t);
                if (!world.freeSpace(CompanionBehavior.point([self.point[0] + ux * distance * t, y, self.point[2] + uz * distance * t]), width, height)) return false;
            }
            // 贴地目标要有真实落脚支撑；空中目标只要弧线可达即可。
            return drop >= 0.3 || SurfacePaths.support(world,
                CompanionBehavior.point([self.point[0] + ux * distance, selfFeet + drop, self.point[2] + uz * distance]), 0.6, 3) !== null;
        });
    }

    CompanionBehavior.registerUse("pounce", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (gap > capability.data.range) return 0;
            const clear = pounceArcClear(context, target);
            let score = 19;
            if (!clear) score -= 16;
            else if (gap >= capability.data.range * 0.55) score += 6;
            if (CompanionBehavior.ai<boolean>(capability, "preferFresh", true) && CompanionBehavior.status(context, target, "clung")) score -= 12;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            if (CompanionBehavior.fleeing(context, target)) score += 8;
            return score;
        }
    });

    addPreferences("pounce", {}, [
        field(pathOf("cling"), "缠身", "boolean", {
            help: "开启：缠得更久、掉速更深、把腿别住更久，但单发更轻、收招与冷却更久。关闭：一记更重更干脆的蹬扑，缠身很短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离就不主动扑击，先走近。越大越愿意从更远处扑上去。"
        }),
        field(pathOf("ai.preferFresh"), "先扑没缠住的", "boolean", {
            help: "开启：已经带着 clung 身份的目标排到最后，先换一个新目标缠；关闭：当普通近身候选排序。"
        })
    ]);
}
