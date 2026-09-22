/**
 * 闪焰高歌 / torchsong 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内时列入候选——这是远程火锥，够不到交给共享接近逻辑。
 * 它要站定唱几拍，所以 `ai.minGap` 是它的站位偏好：距离在这个间距之外时排到前面；被贴到脸上时降到 0，
 * 不再主动抢这一嗓子（但只有它可选时仍会放）。`marcato` 开启时更倾向在安全距离外长唱。
 * 放完之后：既然刚刚站定挨了几拍，伙伴会退到 `ai.minGap` 之外再决定下一步。
 */
namespace PokemonSkills {
    function torchsongMarcato(capability: WorldBehavior.Capability): boolean {
        return !!(capability.data.config && capability.data.config.marcato);
    }

    function torchsongAfter(context: WorldBehavior.Context, progress: WorldBehavior.Bag): WorldBehavior.Result | void {
        const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
        if (!threat || threat.health <= 0) return;
        const self = CompanionBehavior.source(context);
        const spacing = progress.spacing !== undefined ? progress.spacing : 4;
        const gap = CompanionBehavior.distance(self.point, threat.point);
        if (gap >= spacing) return;
        const away = [self.point[0] + (self.point[0] - threat.point[0]), self.point[1], self.point[2] + (self.point[2] - threat.point[2])];
        const navigation = CompanionBehavior.navigate(context, away, spacing);
        return navigation === "moving" || navigation === "arrived" ? WorldBehavior.running() : undefined;
    }

    CompanionBehavior.registerUse("torchsong", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const gap = CompanionBehavior.distance(self.point, target.point);
            if (gap > capability.data.range) return 0;
            const minGap = CompanionBehavior.ai<number>(capability, "minGap", 4);
            let score = gap >= minGap ? 20 : 0;
            if (gap >= minGap && !torchsongMarcato(capability)) score += 4;
            return score;
        },
        after: function (context, capability, target, progress) {
            progress.spacing = CompanionBehavior.ai<number>(capability, "minGap", 4);
            return torchsongAfter(context, progress);
        }
    });

    addPreferences("torchsong", {}, [
        field(pathOf("marcato"), "长音", "boolean", {
            help: "开启：唱得更久、锥面更开、总量更高，但站定更久、冷却更长；关闭：短啸一声，出手利落。"
        }),
        field(pathOf("ai.maxChase"), "起唱距离", "number", {
            min: 3, max: 24, step: 1,
            help: "对手离自己这么远以内才起唱；调小只在中近距唱，调大隔着老远就开始。"
        }),
        field(pathOf("ai.minGap"), "站位间距", "number", {
            min: 1, max: 12, step: 1,
            help: "对手近于这个距离时不再主动抢唱（只有本招可选时仍会放）；越大越保持距离，越小越敢贴脸唱。"
        })
    ]);
}
