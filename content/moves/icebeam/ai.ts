/**
 * 冰冻光束 / icebeam 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 之内；够不到交给共享接近逻辑。
 * 对谁出手：默认（ai.preferLines 开）优先挑「身后还排着别人」的目标——这一束光会穿过去，值得先手；
 *   关闭后按射程与目标血量排序，不再找连线。
 * 放完之后：命中即结算，冰冻是概率；伙伴交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    PokemonSkills.addPreferences("icebeam", {}, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 4, 24, 1),
        PokemonSkills.flag("ai.preferLines", "优先连线目标")
    ]);

    /** 目标身后（沿施法者→目标方向更远处、光轴半宽以内、光束长度以内）还有几个敌人；按 8 刻后的位置把正在穿线的人也算进来。 */
    function icebeamLineCount(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const self = source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.2) return 0;
        const ux = dx / length, uz = dz / length;
        // 用本招真实光束半宽、长度与穿透上限来估值，而不是一份固定的 1.4 横阈、也不越过远端。
        let halfWidth = 0.7, beamLength = 13, pierce = 3;
        try {
            const access = world(context);
            const values = { world: access, actor: access.source(), detail: { values: item.data.config } };
            halfWidth = Math.max(0.2, PokemonSkills.p("icebeam", "beamWidth", values));
            beamLength = Math.max(4, PokemonSkills.p("icebeam", "beamLength", values));
            pierce = Math.max(1, Math.round(PokemonSkills.p("icebeam", "pierce", values)));
        } catch (error) { }
        const nearby = (context.facts.nearby as Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            let ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            if (other.velocity) { ox += other.velocity[0] * 8; oz += other.velocity[2] * 8; }
            const forward = ox * ux + oz * uz;
            if (forward <= length + 0.5 || forward > beamLength) continue;
            const lateral = Math.abs(ox * uz - oz * ux);
            if (lateral <= halfWidth) count++;
        }
        // 目标自己占一个穿透名额，身后最多再穿 pierce − 1 个。
        return Math.min(count, Math.max(0, pierce - 1));
    }

    registerUse("icebeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (target.health <= 0 || target.friendly || !target.visible) return false;
            return distance(source(context).point, target.point) <= ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = source(context);
            const inRange = distance(self.point, target.point) <= capability.data.range;
            let score = inRange ? 24 : 0;
            if (ai<boolean>(capability, "preferLines", true)) score += Math.min(20, icebeamLineCount(context, capability, target) * 10);
            return score + Math.round(ratio(target) * 6);
        }
    });
}
