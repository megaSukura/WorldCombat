/**
 * 银色旋风 / silverwind —— 伙伴 AI 用途。
 *
 * 什么局面下出手：一扇向前铺开的中距鳞粉。`available` 要求目标可见、敌对、存活，且在自己
 *   `ai.maxChase`（默认 12）格内；焦点目标不受距离限制。它不挑目标站不站在地上（鳞粉是一扇，空中也扫）。
 * 选择倾向：`ai.preferCrowd`（默认开）打开时，按本个体真实的扇面长度与张角，沿自己指向目标的真实 3D 扇向
 *   数一数还挤着几个非友方（含目标、须视线可达）——侧后方堆着的人不算被这一扇覆盖，仰射/俯射也按同一三维扇面数；
 *   关闭则只看距离与常规攻击排序。
 * 够不到交给共享接近逻辑；进了射程就抖翅。放完交回共享交战计划。
 */
namespace PokemonSkills {
    /** 沿自己→目标的真实 3D 扇向，按真实扇长与张角数一数扇内的可及非友方（含目标）。 */
    function silverwindCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const world = CompanionBehavior.world(context);
        // 扇长与张角按本个体真实公式求值（含体型与浓鳞式），求值失败退回设计基准。
        let reach = Math.max(4, typeof capability.data.range === "number" ? capability.data.range : 7.5), span = 70;
        try {
            const values = { world: world, actor: world.source(), skill: skills["silverwind"], detail: { values: capability.data.config } };
            reach = Math.max(4, p("silverwind", "reach", values));
            span = Math.max(40, p("silverwind", "span", values));
        } catch (error) { }
        const cosHalf = Math.cos(Math.min(180, span) * Math.PI / 360);
        const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length < 1e-6) return 1;
        const ux = dx / length, uy = dy / length, uz = dz / length;
        let count = 1;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oy = other.point[1] - self.point[1], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oy * oy + oz * oz);
            // 与执行一致：整段径长不超过 reach，仰射/俯射按真实 3D 方向数，不再忽略高度。
            if (distance > reach || distance < 1e-6) continue;
            if ((ox * ux + oy * uy + oz * uz) / distance < cosHalf - 1e-12) continue;
            if (!world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(other.point))) continue;
            count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("silverwind", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            let base = 17;
            if (CompanionBehavior.ai<boolean>(capability, "preferCrowd", true)) {
                const count = silverwindCrowd(context, capability, target);
                if (count >= 2) base += Math.min(18, (count - 1) * 6);
            }
            return base;
        }
    });

    addPreferences("silverwind", {}, [
        field(pathOf("dense"), "浓鳞式", "boolean", {
            help: "开启：扇面长度约 ×0.82、张角约 ×0.8、威力约 ×1.1、反哺概率 +0.05，但冷却更长，适合只割点名的一个方向、更重。关闭（疏鳞式，默认）：铺得更远更宽、出手更快，适合一次扫过并排的一小片。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动抖翅，先走近；越大越愿意对更远的目标扫去。"
        }),
        field(pathOf("ai.preferCrowd"), "成片时优先", "boolean", {
            help: "开启后，按自己指向目标的真实三维扇面数到里面还站着别的可达敌人时优先，一扇能同时割到好几个人；侧后方的人不算。关闭则只按普通攻击排序。"
        })
    ]);
}
