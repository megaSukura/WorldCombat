/**
 * 三旋击 / tripleaxel 的参数与数值来源。
 *
 * 原生事实：冰／物理／威力 20／命中 90／PP 10／接触；连续 3 次、每一下独立掷命中（multiaccuracy），
 * 每中一次威力提高（20→40→60），中途落空这串就断（Cobblemon 1.8，42 位学习者）。
 *
 * 翻译：把「一脚比一脚重的三段旋转踢」落成**原地转身、每转一圈扫出一脚**——三脚都在身前一段扇形里判定，
 * 第 n 脚威力 = kick × (1 + ramp × 已中脚数)。每脚独立掷命中，落空这串就停；扫的是扇形而不是一条线，
 * 所以站得近的第二个对手也会被旋到。原生的固定 20×n 拆成「基础威力 × 递增」两个参数，分别吃不同数据。
 * 与三连踢分开：三旋击是**原地旋转、宽弧横扫**、单脚更重、够得更远；三连踢是**朝前的窄走廊直踢**、更快更准。
 *
 * 数值分散（每个参数各吃不同的精灵数据，小差距才在场上看得出来）：
 *   kick      第一脚威力：物攻定踢得多沉；再乘递增。
 *   kicks     脚数：固定 3 脚。
 *   ramp      每中一脚的递增系数：等级决定这串越踢越重的斜率。
 *   arc       扫过角度：本招「旋转」的身份落在这一项；横扫式更宽。
 *   reach     踢击距离：速度与身高决定旋身够到多远，也是本招实际射程来源。
 *   gap       脚间隔：速度决定三脚连得多紧。
 *   accuracy  每脚命中率：速度提高它；横扫式因旋得宽而略降。
 *   sparks    冰屑点数：物攻派生，表现按它发射。
 *   tempo／recover／recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `widen`（横扫）双向取舍（默认关）：
 *   开（横扫）：扫过角度 170°（能旋到身旁的第二个目标），代价是每脚 ×0.88、命中率 −4%、间隔 +1 刻、收招 +2、冷却 +4。
 *   关（收势，原生形态）：扫过 70°，单体更重、命中率 +2%、连得更紧、冷却更短，代价是照顾不到旁边的目标。
 *
 * 伤害段 `kick` 走共享换算（对手防御、相性与暴击在每脚命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const tripleaxelId = "tripleaxel";
    export const tripleaxelScene = "world_combat:move_tripleaxel";
    export const tripleaxelMissText = "world_combat.move.tripleaxel.text.miss";
    export const tripleaxelRiseText = "world_combat.move.tripleaxel.text.rise";

    actionParameters.define(tripleaxelId, {
        /** 第一脚威力：(12 + 物攻偏移[−2,10]) × 横扫 0.88；夹 8..26。 */
        kick: formula(
            F.base(12)
                .plus(F.stat("attack").minus(50).times(0.1).clamp(-2, 10))
                .times(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(0.88), F.const(1)))
                .clamp(8, 26).round(1),
            "第一脚威力", {
                unit: "威力",
                description: "三旋击第一脚的威力；物攻越高踢得越沉，后两脚在此基础上按 ramp 递增。对手防御、相性与暴击在每脚命中时另算。"
            }),
        /** 脚数：固定 3 脚。 */
        kicks: formula(
            F.base(3).round(0),
            "脚数", {
                unit: "脚",
                description: "这套旋转踢一共几脚；每脚独立掷命中，落空这串就停。"
            }),
        /** 每中一脚的递增系数：1.0 + (等级 − 25) × 0.004 [0,0.25]；夹 0.8..1.3。 */
        ramp: formula(
            F.base(1.0).plus(F.level().minus(25).times(0.004).clamp(0, 0.25)).clamp(0.8, 1.3).round(2),
            "每中递增", {
                unit: "倍",
                description: "每多中一脚，下一脚威力再加这么多倍的基础值（原生为每脚 +1 倍）；等级越高斜率越陡。"
            }),
        /** 扫过角度：横扫 170° / 收势 70°。 */
        arc: formula(
            F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(170), F.const(70)).round(0),
            "扫过角度", {
                unit: "度",
                description: "每一脚在身前扫过多大一片扇形；横扫式更宽，能把身旁的第二个目标也卷进来。"
            }),
        /** 踢击距离：2.8 + 速度偏移[−0.2,0.5] + 身高偏移[−0.1,0.35]，横扫 ×0.95 / 收势 ×1.03；夹 2.3..3.8。 */
        reach: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(50).times(0.006).clamp(-0.2, 0.5))
                .plus(F.body("height").minus(1.4).times(0.08).clamp(-0.1, 0.35))
                .times(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(0.95), F.const(1.03)))
                .clamp(2.3, 3.8).round(2),
            "踢击距离", {
                unit: "格",
                description: "旋身一脚能够到多远；速度与身高决定贴上去的短距，也是本招实际射程来源。"
            }),
        /** 脚间隔：5 − 速度偏移[−1,1.5]，横扫 +1 / 收势 −1；夹 3..8。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(1), F.const(-1)))
                .clamp(3, 8).round(0),
            "脚间隔", "两脚之间隔多久；速度越快连得越紧，横扫式更慢一些。"),
        /** 每脚命中率：0.9 + 速度偏移[−0.04,0.06]，横扫 −0.04 / 收势 +0.02；夹 0.72..0.97。 */
        accuracy: percent(
            F.base(0.9)
                .plus(F.stat("speed").minus(50).times(0.001).clamp(-0.04, 0.06))
                .plus(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(-0.04), F.const(0.02)))
                .clamp(0.72, 0.97).round(3),
            "每脚命中率", "每一脚独立掷的命中率（原生 90% 起）；速度提高它，横扫式因旋得宽而略降。一脚落空这串就停。"),
        /** 冰屑点数：16 + 物攻偏移[−3,16]；夹 12..44。 */
        sparks: formula(
            F.base(16).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 16)).clamp(12, 44).round(0),
            "冰屑点数", {
                unit: "点",
                description: "每一脚踢中时迸出的冰屑数量，随物攻增长；粒子直接按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−0.8,1.5]；夹 4..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5)).clamp(4, 9).round(0),
            "起手", "转身蓄势到第一脚扫出的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−0.8,1.6]，横扫 +2；夹 4..11。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.6))
                .plus(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(2), F.const(0)))
                .clamp(4, 11).round(0),
            "收招", "三脚落定后收住旋转的时间；速度越快收得越快，横扫式更慢。"),
        /** 冷却：30 − 速度偏移[−2,5]，横扫 +4 / 收势 −4；夹 18..42。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(50).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("widen", { key: "worldcombat.skill.tripleaxel.preference.widen", fallback: "横扫" }), F.const(4), F.const(-4)))
                .clamp(18, 42).round(0),
            "冷却", "再起一轮三旋击前的等待；速度越快回得越快，横扫更费、收势更短。PP 10 的代价。")
    });

    defineDamage(tripleaxelId, "kick", {}, { contact: true });

    stages(tripleaxelId, [
        { level: 25, values: { kick: 14 } },
        { level: 48, values: { kick: 17, reach: 3.1 } }
    ]);

    describe(tripleaxelId, [
        { key: "description.0", values: ["kick","kicks","ramp"] },
        { key: "description.1", values: ["arc","reach","accuracy","gap"] },
        { key: "description.additional", values: [] },
        { key: "widen.on", values: [], when: function (context) { return read(context.detail.values, ["widen"]) === true; } },
        { key: "widen.off", values: [], when: function (context) { return read(context.detail.values, ["widen"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.reach"] }
    ]);
}
