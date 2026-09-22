/**
 * 真气拳 / focuspunch 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活且在 `ai.maxChase`（默认 8）格内就列入候选；够不到交给共享接近逻辑。
 * `ai.patient`（默认开）要求**最近没有被对手打到**（`hurtAgo` 不小于 3 秒）——长收势最怕被盯着打，
 * 所以刚挨过打的个体先缓缓、等对手这一轮过去再聚气；关闭后刚挨过打也照聚，赌它这一下打不中。
 *
 * priority：最近没挨打时最高（对手忙别的、或在远处时 55；单纯在附近时 42），刚挨过打时（仅 patient 关闭
 * 才会走到这里）降到 8；自身生命低于一半再减 10。放了之后把伤害交回共用交战计划。
 */
namespace PokemonSkills {
    function focuspunchWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 8)) return false;
        if (CompanionBehavior.ai<boolean>(item, "patient", true)) {
            const hurtAgo = (self as any).hurtAgo;
            if (typeof hurtAgo === "number" && hurtAgo < 60) return false;
        }
        return true;
    }

    CompanionBehavior.registerUse(focuspunchId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return focuspunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !focuspunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            let base = gap <= capability.data.range ? 42 : 30;
            if (target.attacking && target.attacking !== self.ref) base = 55;
            return base - (CompanionBehavior.ratio(self) < 0.5 ? 10 : 0);
        }
    });

    addPreferences(focuspunchId, {}, [
        field(pathOf("steady"), "沉势以待", "boolean", {
            help: "开启：聚气长 1.35 倍、拳力多一成，代价是起手更久、更容易被打断，收招多 3 刻、冷却多 8 刻。关闭：收势更短、出拳更快，单发略轻。"
        }),
        field(pathOf("ai.maxChase"), "聚气距离", "number", {
            min: 2, max: 14, step: 1,
            help: "对手离自己这么远以内才会考虑聚气；调大愿意提前起势，但长收势也更容易落空。"
        }),
        field(pathOf("ai.patient"), "挨打后先缓一缓", "boolean", {
            help: "开启：最近三秒内被对手打到就先不出手，等这一轮过去再聚气（长收势最稳）；关闭：刚挨过打也照聚，赌它这一下打不中。"
        })
    ]);
}
