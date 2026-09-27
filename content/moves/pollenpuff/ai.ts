/**
 * 花粉团 / pollenpuff 的伙伴 AI 用途。
 *
 * 同一团花粉有两个用途，注册在两条协议上：
 *   `world_combat:attack`——朝敌人扔，撞到第一个活体（通常是目标）就炸伤它；
 *   `world_combat:heal`  ——朝受伤的同伴（或自己）扔，撞到就散成回血的花粉。是否主动照看别的同伴由**根配置
 *     `helpFriends`**（默认开）决定，阈值由 `ai.healBelow` 决定；关掉它只改变 AI 挑同伴的倾向，
 *     手动落点仍按真实敌我关系结算。
 * 什么局面下出手：考虑距离 `ai.maxChase`（默认 9）内有可见、敌对且在血量内的目标，或（开着照看同伴时）
 *   有生命低于 `ai.healBelow`（默认 0.8）的同伴。
 * 对谁出手：攻击分支挑最近的敌人；救助分支挑生命比例最低的同伴（共享 `world_combat:patient` 感官已经排序）。
 * 因为团子会被第一具身体接走，攻击前会看弹道上有没有自己人先拦：有同伴比目标更靠前时压低这次攻击的分，
 *   免得把救援团子浪费在队友身上（救助分支不受影响）。
 * 优先级：同伴生命低于 0.4 时抬到 100 抢在共享交战次序前先救。
 * 站位：共享接近逻辑把身位收到投掷射程以内，再朝目标落点抛出。
 * 配置：`nurture`（偏回复）改两向数值；`helpFriends` 决定是否照顾同伴；`ai.maxChase`／`ai.healBelow` 调范围与阈值。
 */
namespace PokemonSkills {
    function pollenpuffHelp(item: WorldBehavior.Capability): boolean { return item.data.config.helpFriends !== false; }

    function pollenpuffAccepts(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.health <= 0) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 9)) return false;
        if (target.friendly) {
            if (String(target.ref) !== String(self.ref) && !pollenpuffHelp(item)) return false;
            return target.health < target.maximum && CompanionBehavior.ratio(target) < CompanionBehavior.ai<number>(item, "healBelow", 0.8);
        }
        return target.visible;
    }

    /** 目标点附近有没有敌我混在一起，用来让「一团两用」的落点更值得走。 */
    function pollenpuffMixed(context: WorldBehavior.Context, item: WorldBehavior.Capability, point: number[]): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], threshold = CompanionBehavior.ai<number>(item, "healBelow", 0.8);
        let friends = 0, foes = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.health <= 0 || CompanionBehavior.distance(other.point, point) > 2.2) continue;
            if (other.friendly) { if (other.health < other.maximum && CompanionBehavior.ratio(other) < threshold) friends++; }
            else if (other.visible) foes++;
        }
        return friends > 0 && foes > 0 ? 6 : 0;
    }

    /** 自己人会不会比目标更早接住飞向目标点的团子：近似取直线上比目标更近、横向又贴近弹道的同伴。 */
    function pollenpuffIntercepted(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const dx = target.point[0] - self.point[0], dy = target.point[1] - self.point[1], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (!(length > 0.5)) return false;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || String(other.ref) === String(self.ref) || other.health <= 0) continue;
            const ox = other.point[0] - self.point[0], oy = other.point[1] - self.point[1], oz = other.point[2] - self.point[2];
            const along = (ox * dx + oy * dy + oz * dz) / length;
            if (along <= 0.4 || along >= length - 0.3) continue;
            const px = ox - dx * (along / length), py = oy - dy * (along / length), pz = oz - dz * (along / length);
            if (Math.sqrt(px * px + py * py + pz * pz) <= 1.2) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse("pollenpuff", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return pollenpuffAccepts(context, capability, target);
        },
        accepts: function (context, capability, target) { return pollenpuffAccepts(context, capability, target); },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (target.friendly) {
                if (String(target.ref) !== String(CompanionBehavior.source(context).ref) && !pollenpuffHelp(capability)) return 0;
                if (CompanionBehavior.ratio(target) < 0.4) return 100;
                return 40 + pollenpuffMixed(context, capability, target.point);
            }
            if (!pollenpuffAccepts(context, capability, target)) return 0;
            return pollenpuffIntercepted(context, target) ? 6 : 22 + pollenpuffMixed(context, capability, target.point);
        }
    });

    addPreferences("pollenpuff", {}, [
        field(pathOf("nurture"), "偏回复", "boolean", {
            help: "开启：回复比例约 ×1.3，代价爆炸威力约 ×0.8、冷却 +6 刻，用来救助同伴与自己。关闭（偏伤害）：爆炸威力约 ×1.25，代价回复比例约 ×0.75，用来砸敌人。"
        }),
        field(pathOf("helpFriends"), "照看同伴", "boolean", {
            help: "开启：伙伴会把花粉团扔向受伤的同伴（生命低于阈值时），把自己的一次出手让给救助。关闭：只对自己与敌人用，专注输出；手动把团子扔到同伴身边仍然照常回血。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 16, step: 1,
            help: "伙伴只在目标离自己这么远以内时才考虑花粉团；调小只在贴身时扔，调大愿意先追进去。"
        }),
        field(pathOf("ai.healBelow"), "救助阈值", "number", {
            min: 0.3, max: 0.95, step: 0.05,
            help: "同伴生命低于该比例时才把团子当治疗扔过去；调低更倾向继续输出，调高一有人掉血就去救。"
        })
    ]);
}
