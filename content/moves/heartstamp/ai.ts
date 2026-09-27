/**
 * 爱心印章 / heartstamp 的伙伴 AI 用途。
 *
 * 什么局面下出手：近身的一记骗招，目标可见、敌对、存活且在 `ai.maxChase`（默认 8）格内。
 * 对谁出手：射程内的目标优先，越近越先；`ai.seizeFirst`（默认开）按「卖萌间隔 + 行程」对照目标剩余窗口——
 *   赶得上才算乘机，赶不上就只当一次普通扑击，不一律偏好没窗口的目标。
 * 够不到怎么办：射程交给 `lunge`，共享任务把身位收进射程后再出手；扑击方向在出扑时锁死，侧移能让它落空。
 * 放完接什么：交回共享交战计划；它是一记近身重击，不负责收尾。
 */
namespace PokemonSkills {
    function heartstampWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    /** 这次扑击从卖萌到够到目标大约要几刻（卖萌间隔 + 按扑速走的行程）。 */
    function heartstampArrival(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const values: FactContext = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const feint = Math.max(1, p("heartstamp", "feint", values));
        const pace = Math.max(0.05, p("heartstamp", "pace", values));
        return feint + CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) / pace;
    }

    /** 这一击落地时目标会有的疏忽窗口：卖萌会刷新旧窗口，取新窗口与旧剩余中的较大者。 */
    function heartstampWindow(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const world = CompanionBehavior.world(context);
        const values: FactContext = { world: world, actor: world.source(), detail: { values: capability.data.config } };
        const fresh = Math.max(1, p("heartstamp", "charmTicks", values));
        const actor = world.actor(String(target.ref));
        if (actor !== null) {
            const carrier = world.mobEffect(actor, "world_combat:heartstamp_offguard");
            if (carrier !== null) return Math.max(fresh, carrier.duration() < 0 ? 2400 : carrier.duration());
        }
        return fresh;
    }

    CompanionBehavior.registerUse("heartstamp", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return heartstampWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !heartstampWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const at = CompanionBehavior.distance(self.point, target.point);
            const close = at <= capability.data.range;
            let value = close ? 24 : 6;
            if (CompanionBehavior.ai<boolean>(capability, "seizeFirst", true)) {
                // 赶得上窗口才算乘机；已有窗口一样能直接判断，不一律偏好没窗口的目标。
                value += heartstampArrival(context, capability, target) <= heartstampWindow(context, capability, target) ? 12 : -10;
            }
            if (close) value += Math.max(0, Math.round((capability.data.range - at) * 2));
            return value;
        }
    });

    addPreferences("heartstamp", {}, [
        field(pathOf("guile"), "心机", "boolean", {
            help: "开启：卖萌更久、疏忽窗口更长、乘机加成更高，但基础一击约少 14%%、起手与冷却更长，适合先骗再打。关闭：直球，基础一击约多 16%%、起手更快，但乘机收益更小。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 16, step: 1,
            help: "只在威胁离自己这么远以内才卖萌起手；调大愿意先追一段，调小只在贴身时补击。"
        }),
        field(pathOf("ai.seizeFirst"), "确认窗口", "boolean", {
            help: "开启：按「卖萌间隔 + 行程」对照目标剩余窗口，赶得上才优先乘机，赶不上就降低优先级；关闭：只按普通近战的远近排序，不判断窗口。"
        })
    ]);
}
