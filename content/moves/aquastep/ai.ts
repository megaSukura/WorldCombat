/**
 * 流水旋舞 / aquastep 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * 这是一支要贴身跳的舞：目标已在旋舞半径附近（`capability.data.range`）时排到前面，太远则先走近。
 * `twirl` 开启时，站在对手正面时更愿意绕到背后再收势（站位更刁，但多在场上停留两拍）；
 * 关闭则就在正面左右点踏，收得更快。
 * 放完之后：既然刚提了速，伙伴会退到 `ai.spacing` 外再决定下一步——戏耍的本意是不在刀口上多站。
 */
namespace PokemonSkills {
    function aquastepAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        const spacing = progress.spacing !== undefined ? progress.spacing : 3;
        const gap = CompanionBehavior.distance(self.point, threat.point);
        if (gap >= spacing) return;
        const away = [self.point[0] + (self.point[0] - threat.point[0]), self.point[1], self.point[2] + (self.point[2] - threat.point[2])];
        const navigation = CompanionBehavior.navigate(context, away, spacing);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("aquastep", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability, purpose) {
            const twirl = !!(capability.data.config && capability.data.config.twirl);
            return capability.data.range + (twirl ? 1 : 0);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 9);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            let score = 20;
            const twirl = !!(capability.data.config && capability.data.config.twirl);
            if (twirl && gap <= capability.data.range + 1) score += 8;
            return score;
        },
        after: function (context, capability, target, progress) {
            progress.spacing = CompanionBehavior.ai<number>(capability, "spacing", 3);
            return aquastepAfter(context, progress);
        }
    });

    addPreferences("aquastep", {}, [
        field(pathOf("twirl"), "旋身", "boolean", {
            help: "开启：几拍绕着对手转、从背后收势，站位更刁；关闭：在正面左右点踏，收得更快、更安全。"
        }),
        field(pathOf("ai.maxChase"), "起舞距离", "number", {
            min: 2, max: 16, step: 1,
            help: "对手离自己这么远以内才起舞；调小只贴身跳，调大愿意先跑近再起第一拍。"
        }),
        field(pathOf("ai.spacing"), "收势后间距", "number", {
            min: 1, max: 8, step: 1,
            help: "旋身收势后拉开到这个距离再决定下一步；越大越不恋战，越小越会接着压。"
        })
    ]);
}
