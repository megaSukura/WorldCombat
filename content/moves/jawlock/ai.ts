/**
 * 紧咬不放 / jawlock 的伙伴 AI 用途。
 *
 * 什么局面下出手：一记贴身擒咬。`available` 要求目标可见、敌对、存活、在 `ai.maxChase`（默认 7）以内，
 *   且身上还没有 trapped 身份；自己也必须还有 `ai.minSelf`（默认 0.35）以上的生命——咬住后双方都走不了，
 *   血太少时把自己钉在别人刀下不划算。第一次咬不到就交给共享接近逻辑再扑。
 * 对谁出手：越满血、越难缠的目标越值得先咬住（咬住的是「不让你走」而不是「补最后一下」）；焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑走到 `reach` 以内；走到射程内就压身咬下。
 * 放完之后：目标与自己都被钉住，直到任一方倒下或被外力拉开，随后交回共享顺序。
 */
namespace CompanionBehavior {
    function jawlockWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (status(context, target, "trapped")) return false;
        if (ratio(source(context)) < ai<number>(item, "minSelf", 0.35)) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 7);
    }

    registerUse("jawlock", {
        protocols: ["world_combat:attack", "world_combat:control"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return jawlockWants(context, item, target);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible && !status(context, target, "trapped");
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !jawlockWants(context, item, target)) return 0;
            let base = 16 + Math.round(ratio(target) * 40);
            if (context.facts.focus === target.ref) base += 20;
            base += Math.round((1 - ratio(source(context))) * 20);
            return base;
        }
    });

    PokemonSkills.addPreferences("jawlock", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("vise"), "死咬式", "boolean", {
            help: "开启（死咬式）：咬住后锁得更久（对峙 ×1.25）、维持距离 +0.4，更难被拉开，但咬合 ×0.9、冷却 +8 刻。关闭（快咬式）：咬合 ×1.1、出手更麻利，但锁得短一些。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 1, max: 12, step: 1,
            help: "威胁离自己这么远以内才考虑咬住；调小只在贴身时出手，调大愿意先绕着对方走近再咬。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minSelf"), "自身生命下限", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命比例低于此值就不主动咬住（把自己也钉住不划算）；调到 0 表示残血也照咬。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时离位", "boolean", {
            help: "开启后，驻守命令下也会离开原位去咬住目标；关闭则只在原地够得到时出手。"
        })
    ]);
}
