/** 伙伴依据同一磁场资格读取器选出正负电伙伴、铁傀儡和金属护甲友方，再决定是否展开磁场。 */
namespace CompanionBehavior {
    const magneticfluxChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    magneticfluxChase.help = "威胁与要罩住的伙伴进入这个距离内才考虑立磁场；越大越早开始、越愿意跑过去。";
    const magneticfluxPack = PokemonSkills.number("ai.pack", "磁场范围", 2, 10, 1);
    magneticfluxPack.help = "把这招眼里的一圈算多大；调大更愿意为稍远的正负电伙伴立磁场，也离得更远就落场。";

    PokemonSkills.addPreferences(PokemonSkills.magneticfluxId, {}, [magneticfluxChase, magneticfluxPack]);

    /** 只读探针：把一只宝可梦的现行特性换算成 plus／minus／空，供 AI 挑选要罩住的伙伴。 */
    registerFact("world_combat:magneticflux_polarity", function (access: CombatWorld, actor: CombatActor, _argument: any): string {
        return PokemonSkills.magneticfluxPolarity(access, actor);
    });

    function magneticfluxIsPolar(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<string>(context, "world_combat:magneticflux_polarity", target);
    }
    /** 最近的、还没被磁场咬住的正负电己方（自己也算）；没有就返回 null。 */
    function magneticfluxPick(context: WorldBehavior.Context, item: WorldBehavior.Capability): Entity | null {
        const self = source(context), chase = ai<number>(item, "maxChase", 12);
        let best: Entity | null = null, reach = Infinity;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref)) {
                if (!other.friendly || other.health <= 0 || !other.visible) return;
                if (distance(self.point, other.point) > chase) return;
            }
            if (!magneticfluxIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.magneticfluxStatus)) return;
            const span = String(other.ref) === String(self.ref) ? 0 : distance(self.point, other.point);
            if (span < reach) { reach = span; best = other; }
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return best;
    }
    /** 一圈（ai.pack）里还没被咬住的正负电友方数量，以及有几个是别人（自己以外）。 */
    function magneticfluxCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; others: number } {
        const self = source(context), pack = ai<number>(item, "pack", 6);
        let friends = 0, others = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > pack) return;
            if (String(other.ref) !== String(self.ref) && !other.friendly) return;
            if (!magneticfluxIsPolar(context, other)) return;
            if (status(context, other, PokemonSkills.magneticfluxStatus)) return;
            friends++;
            if (String(other.ref) !== String(self.ref)) others++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, others: others };
    }

    registerUse(PokemonSkills.magneticfluxId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return Math.max(1.5, ai<number>(item, "pack", 6) * 0.5); },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const pick = magneticfluxPick(context, item);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return !!pick;
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) {
            const counts = magneticfluxCount(context, item);
            if (counts.friends === 0) return 0;
            return counts.others > 0 ? 84 : 60;
        }
    });
}
