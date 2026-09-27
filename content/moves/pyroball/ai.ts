/**
 * 火焰球 / pyroball 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 20）格内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finishLow`（默认开）打开时，残血目标排前，用这一记高威力火球收尾；有**脚前低弧**可达
 *   的目标更靠前，被墙挡住或低弧撞地的排后——单看身体中心通视不够，出膛点低、走的是弧线；
 *   已经带着共享灼伤身份的目标排后（再点一次意义不大）。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：它是一记高威力单体点射，不负责收尾之外的事，交回共享交战计划。
 *
 * 低弧可达性读本个体**当前实际公式**（`PokemonSkills.p` 以现场 world/actor 与本招配置求值出膛速度、
 * 下坠、半径），再用 LivingActions 的真实弹道解，不用硬编码速度/下坠近似；目标存在且可见时取其真实
 * 活体位置（world.actor + observe），不从记忆点反查隐藏实体。
 */
namespace PokemonSkills {
    /** 本个体、当前配置下这一招的真实参数值；读不到返回 NaN。 */
    function pyroballAiValue(context: WorldBehavior.Context, capability: WorldBehavior.Capability, key: string): number {
        const world = CompanionBehavior.world(context);
        try {
            const base: FactContext = { world: world, actor: world.source(),
                skill: skills["pyroball"], detail: { values: capability.data.config || {} } };
            const value = p("pyroball", key, base);
            return typeof value === "number" && isFinite(value) ? value : NaN;
        } catch (error) { return NaN; }
    }

    function pyroballWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 20);
    }

    /** 脚前起点到目标的低弧是否可达：用本个体实际公式解一条低弧并逐段检查无实心方块挡住。 */
    function pyroballReachable(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const height = self.height || 1.4;
        // 目标可见时取真实活体位置；不可见不接受出手，也不用记忆点反查。
        const foe = target.visible ? world.actor(String(target.ref)) : null;
        const body = foe === null ? null : world.observe(foe);
        const aim = body !== null ? body.position() : CompanionBehavior.point(target.point);
        const speed = pyroballAiValue(context, capability, "velocity");
        const gravity = pyroballAiValue(context, capability, "gravity");
        const radius = pyroballAiValue(context, capability, "radius");
        const foot = CompanionBehavior.point([self.point[0], self.point[1] - height * 0.5 + (isFinite(radius) && radius > 0 ? radius : 0), self.point[2]]);
        if (!isFinite(speed) || speed <= 0 || !isFinite(gravity) || gravity <= 0) {
            // 公式不可读时退回真实脚前到目标的通视检查，不编造弹道近似。
            return world.clear(foot, aim);
        }
        const flat = CompanionBehavior.point([aim.x() - foot.x(), 0, aim.z() - foot.z()]);
        const horizontal = flat.length();
        const kick = Math.max(0.3, Math.min(1.2, (isFinite(radius) && radius > 0 ? radius : 0.26) * 2 + 0.35));
        const launch = horizontal > 1e-4 ? foot.plus(flat.unit().scale(kick)) : foot;
        if (!world.clear(CompanionBehavior.point(self.point), launch)) return false;
        const solved = LivingActions.ballistic(launch, aim, speed, gravity);
        if (!solved) return false;
        const ticks = Math.max(2, Math.ceil(launch.minus(aim).length() / speed) + 2);
        const path = LivingActions.ballisticPath(launch, solved.scale(speed), gravity, ticks);
        for (let i = 1; i < path.length; i++) if (!world.clear(path[i - 1], path[i])) return false;
        return true;
    }

    CompanionBehavior.registerUse("pyroball", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return pyroballWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !pyroballWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 26;
            if (CompanionBehavior.ai<boolean>(capability, "finishLow", true) && CompanionBehavior.ratio(target) < 0.4) score += 12;
            // 有脚前低弧才值得踢；低弧撞地或被地形挡住的直点排在后面。
            if (pyroballReachable(context, capability, target)) score += 6; else score -= 6;
            // 蛮踢式散布更大、低弧更野，命中更没把握时再降一点。
            if (capability.data.config && capability.data.config.savage === true) score -= 4;
            if (CompanionBehavior.status(context, target, "burn")) score -= 6;
            return score;
        }
    });

    addPreferences("pyroball", {}, [
        field(pathOf("savage"), "蛮踢式", "boolean", {
            help: "开启：威力 ×1.1、灼伤概率 +4%%、焦土更大，但出膛散布 +6 度（更难踢正）、射程 −1.5 格、起手与冷却更久。关闭（精准抽射）：踢得更直更远更快，代价是威力与引燃都略低。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 28, step: 1,
            help: "超过这个距离就不主动踢球，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用这记高威力火球收尾；关闭则只按普通远程攻击排序。"
        })
    ]);
}
