/**
 * 流星突击的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在挥弧半径之内。这是晃晕最久的一记，所以只在自身生命高于
 * `ai.minHealth` 时主动挥；面前挤着两个以上敌人时（`ai.preferMultiple` 开启）明显更值得，因为一条弧能同时扫到。
 * 对谁出手：焦点目标优先，其余是可接近、活着、非友方的目标。
 * 怎么够到：共享接近把身位收到挥程以内；挥弧由招式自己的扇形判定。
 * 出手前后：放完交回共享交战计划；晃晕期间招式自动不可用。
 */
namespace PokemonSkills {
    function meteorassaultFront(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= capability.data.range) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("meteorassault", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.4);
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth) return true;
            return CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const close = CompanionBehavior.distance(self.point, target.point) <= capability.data.range;
            if (!close) return 0;
            const preferMultiple = CompanionBehavior.ai<boolean>(capability, "preferMultiple", true);
            const front = meteorassaultFront(context, capability, target);
            if (preferMultiple && front >= 2) return 52;
            return CompanionBehavior.ratio(target) <= 0.3 ? 60 : 26;
        }
    });

    addPreferences("meteorassault", {}, [
        field(pathOf("swings"), "挥击段数", "number", {
            min: 2, max: 5, step: 1,
            help: "这条弧上连续重挥几下。段数越多总伤害越高，但晃晕更久、动作更久；段数少则收招更快、风险更低。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动流星突击（除非目标已残）。越高越怕挥完被晃晕挨打。"
        }),
        field(pathOf("ai.preferMultiple"), "偏好群战", "boolean", {
            help: "开启：面前挤着两个以上敌人时优先横扫，用一条弧拿到多份伤害；关闭：只看单个目标，近身就挥。"
        })
    ]);
}
