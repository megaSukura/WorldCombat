/** alluringvoice：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const alluringvoiceId = "alluringvoice";
    export const alluringvoiceScene = "world_combat:move_alluringvoice";
    export const alluringvoiceSong = "world_combat:alluring_voice_song";
    export const alluringvoiceStrikeText = "world_combat.move.alluringvoice.text.strike";
    export const alluringvoiceDazeText = "world_combat.move.alluringvoice.text.daze";
    export const alluringvoiceRecoilText = "world_combat.move.alluringvoice.text.recoil";
    /** 反噬基数（最大生命比例）；被歌惑乱的目标打中别人时按攻击放大。 */
    export const alluringvoiceRecoilFraction = 0.05;
    /** 表现里的参考半径：`data.scale = 实际声场半径 / 这个数`。 */
    export const alluringvoiceReferenceReach = 7;

    /** 目标当前正面能力等级合计；0 表示它此刻没有正在生效的强化。 */
    export function alluringVoiceBoost(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        const stages = NativeEffects.effectiveStages(world, actor);
        const names = ["atk", "def", "spa", "spd", "spe"];
        let total = 0;
        for (let index = 0; index < names.length; index++) {
            const value = stages[names[index]] || 0;
            if (value > 0) total += value;
        }
        total += MobEffects.levels(world, actor, "beneficial");
        // 普通生物正追击、玩家刚命中过人时也会被歌声扰乱；强化仍按实际层数延长混乱。
        if (total === 0 && String(actor.domain()) !== "cobblemon") {
            const body = world.observe(actor);
            if (body && body.attacking() !== null || DamageSemantics.recentAttack(world, actor, 80) !== null) total = 1;
        }
        return total;
    }

    /** 声场顶点：以 origin 为心、朝 direction 张开 angleDegrees、半径 reach；判定与表现共用。 */
    export function alluringVoiceFan(origin: CombatPoint, direction: CombatPoint, reach: number, angleDegrees: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const half = Math.max(0, Math.min(180, angleDegrees)) / 2 * Math.PI / 180;
        const base = Math.atan2(heading.z(), heading.x());
        const steps = Math.max(3, Math.round(angleDegrees / 12) + 1);
        const vertices: CombatPoint[] = [origin];
        for (let index = 0; index <= steps; index++) {
            const angle = base - half + (2 * half) * (index / steps);
            vertices.push(origin.plus(WorldCombat.point(Math.cos(angle) * reach, 0, Math.sin(angle) * reach)));
        }
        return vertices;
    }
    export function alluringVoicePath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    actionParameters.define(alluringvoiceId, {
        /** 窄锥群伤与反强化控制共占收益预算；等级成长从设计基值起算。 */
        voice: formula(
            F.base(54)
                .plus(F.stat("specialAttack").minus(65).times(0.15).clamp(-10, 24))
                .times(F.when(F.pref("echo"), F.const(0.85), F.const(1.1)))
                .clamp(36, 92).round(1),
            "歌声威力", {
                base: 54, unit: "威力",
                description: "扫过声场的基础威力；特攻越高唱得越透。直诉式把力气集中在这一条窄声里，回响式摊薄成更宽的一片。对手防御、相性与暴击在命中时另算。"
            }),
        /** 声场长度：7 + (碰撞箱高度 − 1.4) × 0.4 + (特攻 − 60) × 0.02 格，回响式 ×1.1，夹 4..11。 */
        reach: formula(
            F.base(7)
                .plus(F.body("height").minus(1.4).times(0.4))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.6, 1.4))
                .times(F.when(F.pref("echo"), F.const(1.1), F.const(1)))
                .clamp(4, 11).round(2),
            "声场长度", {
                unit: "格",
                description: "歌声沿身前铺出多远，也是本招实际射程的来源；体型越大、特攻越高送得越远。"
            }),
        /** 张角：46 + (等级 − 30) × 0.4 度，回响式 ×1.35、直诉式 ×0.85，夹 30..90 度。 */
        angle: formula(
            F.base(46).plus(F.level().minus(30).times(0.4).clamp(-6, 20))
                .times(F.when(F.pref("echo"), F.const(1.35), F.const(0.85)))
                .clamp(30, 90).round(0),
            "张角", {
                unit: "度",
                description: "这条歌声锥张多宽；等级越高、回响式越宽，一次能扫到更多人。"
            }),
        /** 失手概率：0.22 + (特攻 − 60) × 0.0025，夹 0.15..0.45。 */
        fumble: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.0025).clamp(-0.05, 0.2)).clamp(0.15, 0.45).round(3),
            "失手概率", "被这首歌惑乱的目标每次试图出手被打散的概率；特攻越高，歌声越让人失准。"),
        /** 错乱基础时长：110 + 等级 × 1.2 刻，回响式 ×1.4，夹 80..340。 */
        confuseBase: seconds(
            F.base(110).plus(F.level().times(1.2))
                .times(F.when(F.pref("echo"), F.const(1.4), F.const(1)))
                .clamp(80, 340).round(0),
            "错乱基础时长", "陷入错乱后持续多久；等级越高、回响式越久。"),
        /** 每级延长：20 + 特攻 × 0.08 刻/级，夹 10..60。 */
        confusePerStage: seconds(
            F.base(20).plus(F.stat("specialAttack").times(0.08)).clamp(10, 60).round(0),
            "每级延长", "目标每带着一级正面能力等级，错乱再延长多久；特攻越高唱得越缠人。"),
        /** 音符数：18 + 特攻 × 0.3，夹 12..80。 */
        motes: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.3)).clamp(12, 80).round(0),
            "音符数", {
                unit: "个",
                description: "声场里的音符数量；随特攻增长，也决定画面的密度。"
            }),
        /** 起手：7 − (速度 − 55) × 0.02 刻，回响式 +3，夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("echo"), F.const(3), F.const(0))).clamp(4, 14).round(0),
            "起手", "从起调到歌声荡出之间的时间；速度快的个体开口更急，回响式先让声场铺开。"),
        /** 收招：8 刻，回响式 +3，夹 5..16。 */
        settle: seconds(
            F.base(8).plus(F.when(F.pref("echo"), F.const(3), F.const(0))).clamp(5, 16).round(0),
            "收招", "唱完收住的时间；回响式余音更久。"),
        /** 冷却：34 − (速度 − 55) × 0.12 刻，回响式 +6，夹 20..52。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("echo"), F.const(6), F.const(0))).clamp(20, 52).round(0),
            "冷却", "两段歌声之间的等待；速度快回得更快，回响式更费。"),
        maxTargets: n(5, "最多命中数")
    });

    defineDamage(alluringvoiceId, "voice", {}, { sound: true });

    stages(alluringvoiceId, [
        { level: 32, values: { voice: 62 } },
        { level: 48, values: { voice: 70 } }
    ]);

    describe(alluringvoiceId, [
        { key: "description.0", values: ["voice", "reach", "angle", "maxTargets"] },
        { key: "description.1", values: ["confuseBase", "confusePerStage", "fumble"] },
        { key: "echo.on", values: [], when: function (context) { return read(context.detail.values, ["echo"]) === true; } },
        { key: "echo.off", values: [], when: function (context) { return read(context.detail.values, ["echo"]) !== true; } },
        { key: "world", values: [] },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.voice"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.voice"] }
    ]);
}
