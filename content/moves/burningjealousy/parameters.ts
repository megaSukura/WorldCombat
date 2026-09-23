/** burningjealousy：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const burningjealousyId = "burningjealousy";
    export const burningjealousyScene = "world_combat:move_burningjealousy";
    export const burningjealousyHitText = "world_combat.move.burningjealousy.text.hit";
    export const burningjealousyEnvyText = "world_combat.move.burningjealousy.text.envy";
    /** 表现里的参考半径：`data.scale = 实际扇面半径 / 这个数`。 */
    export const burningjealousyReferenceReach = 4.5;

    /** 目标当前正面能力等级合计（五项，不含命中率/闪避）；0 表示它此刻没有正在生效的强化。 */
    export function burningJealousyBoost(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const stages = NativeEffects.effectiveStages(world, actor);
        const names = ["atk", "def", "spa", "spd", "spe"];
        let total = 0;
        for (let index = 0; index < names.length; index++) {
            const value = stages[names[index]] || 0;
            if (value > 0) total += value;
        }
        return total + MobEffects.levels(world, actor, "beneficial");
    }

    /** 扇面顶点：以 origin 为心、朝 direction 张开 angleDegrees、半径 reach；判定与表现共用。 */
    export function burningJealousyFan(origin: CombatPoint, direction: CombatPoint, reach: number, angleDegrees: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const half = Math.max(0, Math.min(180, angleDegrees)) / 2 * Math.PI / 180;
        const base = Math.atan2(heading.z(), heading.x());
        const steps = Math.max(3, Math.round(angleDegrees / 16) + 1);
        const vertices: CombatPoint[] = [origin];
        for (let index = 0; index <= steps; index++) {
            const angle = base - half + (2 * half) * (index / steps);
            vertices.push(origin.plus(WorldCombat.point(Math.cos(angle) * reach, 0, Math.sin(angle) * reach)));
        }
        return vertices;
    }
    export function burningJealousyPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    actionParameters.define(burningjealousyId, {
        /** 妒火威力：70 + (特攻 − 65) × 0.22，夹 45..130；妒噬式 ×1.2、燎原式 ×0.85。 */
        flare: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(65).times(0.22).clamp(-14, 32))
                .times(F.when(F.pref("fixate"), F.const(1.2), F.const(0.85)))
                .clamp(45, 130).round(1),
            "妒火威力", {
                unit: "威力",
                description: "扫过扇面的基础威力；特攻越高烧得越旺。妒噬式把这团火收紧加重，燎原式摊薄成更大一片。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扇面半径：4.5 + (碰撞箱高度 − 1.4) × 0.5 + (特攻 − 60) × 0.02 格；燎原式 ×1.3、妒噬式 ×0.8。 */
        reach: formula(
            F.base(4.5)
                .plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.6, 1.4))
                .times(F.when(F.pref("fixate"), F.const(0.8), F.const(1.3)))
                .clamp(2.8, 8.5).round(2),
            "扇面半径", {
                unit: "格",
                description: "妒火从身前窜出多远，也是本招实际射程的来源；体型越大、特攻越高铺得越远。"
            }),
        /** 张角：100 + (等级 − 30) × 0.8 度；燎原式 ×1.25、妒噬式 ×0.7；夹 55..170 度。 */
        angle: formula(
            F.base(100).plus(F.level().minus(30).times(0.8).clamp(-12, 40))
                .times(F.when(F.pref("fixate"), F.const(0.7), F.const(1.25)))
                .clamp(55, 170).round(0),
            "张角", {
                unit: "度",
                description: "扇形铺开多大；等级越高、燎原式越宽，一次能扫到更多敌人。"
            }),
        /** 每级增伤：0.04 + (特攻 − 60) × 0.0004 倍/级，夹 0.02..0.10。 */
        envyStep: formula(
            F.base(0.04).plus(F.stat("specialAttack").minus(60).times(0.0004).clamp(-0.015, 0.05))
                .clamp(0.02, 0.10).round(3),
            "每级增伤", {
                unit: "倍/级",
                description: "目标每带着一级正面能力等级，这一击对它的威力加多少；特攻越高妒意越盛。"
            }),
        /** 增伤上限：0.25 + 等级 × 0.002，夹 0.2..0.5。 */
        envyCap: formula(
            F.base(0.25).plus(F.level().times(0.002)).clamp(0.2, 0.5).round(3),
            "增伤上限", {
                unit: "倍",
                description: "单个目标最多因强化被加多少威力；等级越高上限越高，但不会无上限。"
            }),
        /** 灼伤基础时长：120 + 等级 × 1.3 刻；妒噬式 ×1.3、燎原式 ×0.8。 */
        burnBase: seconds(
            F.base(120).plus(F.level().times(1.3))
                .times(F.when(F.pref("fixate"), F.const(1.3), F.const(0.8)))
                .clamp(80, 360).round(0),
            "灼伤基础时长", "被妒火咬住后灼伤持续多久；等级越高烧得越久，妒噬式更长、燎原式更短。"),
        /** 每级延烧：15 + 特攻 × 0.06 刻/级，夹 10..50。 */
        burnPerStage: seconds(
            F.base(15).plus(F.stat("specialAttack").times(0.06)).clamp(10, 50).round(0),
            "每级延烧", "目标每带着一级正面能力等级，灼伤再延长多久；特攻越高烧得越久。"),
        /** 火点数：20 + 特攻 × 0.3，夹 16..90。 */
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.3)).clamp(16, 90).round(0),
            "火点数", {
                unit: "个",
                description: "扇面里的火点数量；随特攻增长，也决定画面的密度。"
            }),
        /** 起手：7 − (速度 − 55) × 0.02 刻，妒噬式 +2，夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("fixate"), F.const(2), F.const(0))).clamp(4, 12).round(0),
            "起手", "从聚火到喷出之间的时间；速度快的个体烧得更急，妒噬式先憋一口气。"),
        /** 收招：8 刻，妒噬式 +3，夹 5..16。 */
        settle: seconds(
            F.base(8).plus(F.when(F.pref("fixate"), F.const(3), F.const(0))).clamp(5, 16).round(0),
            "收招", "喷完收住的时间；妒噬式余势更久。"),
        /** 冷却：32 − (速度 − 55) × 0.12 刻，妒噬式 +6，夹 18..50。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("fixate"), F.const(6), F.const(0))).clamp(18, 50).round(0),
            "冷却", "两次喷火之间的等待；速度快回得更快，妒噬式更费。"),
        maxTargets: n(6, "最多命中数")
    });

    defineDamage(burningjealousyId, "flare", {});

    stages(burningjealousyId, [
        { level: 32, values: { flare: 84 } },
        { level: 48, values: { flare: 98 } }
    ]);

    describe(burningjealousyId, [
        { key: "description.0", values: ["flare", "reach", "angle", "maxTargets"] },
        { key: "description.1", values: ["envyStep", "envyCap"] },
        { key: "description.2", values: ["burnBase", "burnPerStage"] },
        { key: "fixate.on", values: [], when: function (context) { return read(context.detail.values, ["fixate"]) === true; } },
        { key: "fixate.off", values: [], when: function (context) { return read(context.detail.values, ["fixate"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flare"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.flare"] }
    ]);
}
