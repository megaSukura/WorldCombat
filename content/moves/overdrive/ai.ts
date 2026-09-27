/**
 * 破音 / overdrive 的伙伴 AI 用途。
 *
 * 什么局面下出手：朝当前威胁那条线推出的窄声路，三下连打、每一下都可能把目标震到麻痹。收益按
 *   **实际走廊**计算——只数从自身指向目标、落在真实长度、真实半宽与真实上下高度内的可见非友方，
 *   再要求至少 `ai.minFoes`（默认 1）个。它单体也够看（多段 + 概率麻痹），所以见一个也能拨。
 * `available` 另外要求目标在考虑距离 `ai.maxChase`（默认 10）内。
 * 站位：共享接近逻辑把身位收到走廊长度以内，然后朝目标方向连拨三下。
 * 另外：三拍要全部落下才吃满收益，走廊里成排的威胁越多越值得起三段（`priority` 按实际命中数抬分）；
 *   目标已经麻痹或血量见底时 priority 略降——状态已经兑现在别处；开余响且走廊里还有成排威胁时再抬一段，
 *   把这条旧路留给迟到的声浪。宽度、高度都用本招真实公式/同一份 `overdriveBand`，不写死近似值。
 * 放完之后：交给共享顺序继续交战；冷却没转好前不重复。
 * 配置：`ai.maxChase` 限制考虑距离；`ai.minFoes` 决定走廊方向上要几个目标才值得起三段。
 */
namespace PokemonSkills {
    /** 朝目标方向的走廊里，落在真实长度、半宽与上下高度内的非友方数量。 */
    function overdriveCaught(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const span = Math.sqrt(dx * dx + dz * dz);
        const hx = span < 1e-4 ? 0 : dx / span, hz = span < 1e-4 ? 1 : dz / span;
        const world = CompanionBehavior.world(context);
        const halfWidth = Math.max(0.5, p("overdrive", "width", { world: world, actor: world.source(),
            skill: skills["overdrive"], detail: { values: item.data.config } }));
        const reach = Number(item.data.range);
        const low = self.point[1] - overdriveBand.below, high = self.point[1] + overdriveBand.above;
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (other.point[1] < low || other.point[1] > high) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const along = ox * hx + oz * hz;
            if (along < 0 || along > reach) continue;
            if (Math.abs(ox * -hz + oz * hx) > halfWidth) continue;
            count++;
        }
        return count;
    }

    function overdriveWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 10)) return false;
        return overdriveCaught(context, item, target) >= CompanionBehavior.ai<number>(item, "minFoes", 1);
    }

    CompanionBehavior.registerUse("overdrive", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return overdriveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !overdriveWants(context, capability, target)) return 0;
            let base = 24;
            const count = overdriveCaught(context, capability, target);
            // 三拍要全部落下才吃满；走廊里成排的威胁越多，越值得一次连打。
            if (count >= 3) base += Math.min(18, (count - 2) * 6);
            // 目标已经麻痹时，状态已经兑现，少花一次三段。
            if (CompanionBehavior.status(context, target, "paralysis")) base -= 10;
            // 余响会留在第三拨的旧路上；这条线上还有成排威胁时更值得起。
            if (capability.data.config.echo === true && count >= 2) base += 6;
            return base;
        }
    });

    addPreferences("overdrive", {}, [
        field(pathOf("echo"), "余响", "boolean", {
            help: "开启：三下拨完动作收束，隔一段在第三下的原位置重放一记更重的迟到声浪（每下威力约 ×0.82、总量摊到更多下），多一次麻痹机会、冷却 +8 刻，用来赌状态或封住敌人追来的路。关闭：三下紧凑收束、出手更快，用来快进快出。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑破音；调小只在贴身时拨，调大愿意先追进去再拨。"
        }),
        field(pathOf("ai.minFoes"), "走廊人数", "number", {
            min: 1, max: 6, step: 1,
            help: "朝目标方向的走廊上至少站着这么多可见、敌对的敌人才出手；调大只在人排成列时拨、省 PP，调 1 见一个也拨。"
        })
    ]);
}
