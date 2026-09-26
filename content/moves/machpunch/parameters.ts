/**
 * 音速拳 / machpunch —— 参数与伤害段。
 *
 * 原生事实：格斗／物理／威力 40／命中 100／PP 30／优先度 +1／接触／punch（Cobblemon 1.8，15 位学习者）。
 *   描述「以迅雷不及掩耳之势出拳。必定能够先制攻击」。
 *
 * 翻译：本招把「先制」翻成一记**脚不动、拳头过隙的直拳**：起手最短（默认 0 刻，提交即打），施法者不位移，
 *   拳头以一条瞬时的直线打出去——拳锋先到，音爆后到。它只在已经贴近到一臂之内时才成立（射程最长的形态也只有
 *   三格多），所以玩家能读出「要贴上去才能打」。全族唯一不移动的一招：它不改变你的位置，只把这一拳送出去，
 *   因此可以在别的招之后立刻衔接、或站在掩体里伸手打人。它是 punch：走共享伤害元数据里的 punch 标记，
 *   将来拳类特性与道具接进来时自动受益。音爆是它的画面身份（一道压缩空气环 + 一记拳影），延后极短 1–2 刻、
 *   纯声音与小冲环，不二次伤害；伤害被拒时只在真实接触点显示格挡，不报伤害数。
 *   自由瞄准 `kind: "aim"`：任一方向的短 3D 直线都成立，空拳照常结算；墙会挡住拳，身体不位移。
 *   与最像的快手还击分开：快手还击只在对手出手时闪身刺、有闪身；音速拳**任何时候都能出、不闪身**。
 *   与击掌奇袭分开：击掌奇袭只在刚出场、拍懵并打断；音速拳没有懵、没有打断，只是最快的贴身一拳。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   jab             拳威力：攻击给份量、速度给拳速；重拳式 ×1.2。
 *   reach           拳程：体高决定臂展、物攻决定够得稍远；重拳式 ×1.06；也是射程来源。
 *   collisionRadius 判定半径：身高决定拳面多宽。
 *   push            顶开距离：攻击决定这一拳把人推开多远；重拳式 ×1.25。
 *   boom            音爆环半径：速度决定环张多开，直接驱动画面。
 *   ring            音爆粒子数量：速度驱动，表现按它发射。
 *   tempo           起手：默认 0（瞬发）；重拳式 +2。
 *   settle/recharge 速度决定收招与冷却；重拳式更久。
 *
 * 配置 `heavy`（重拳式）双向取舍：开启＝这一拳重两成、顶开更远、够得稍远，但要先蓄一拍（起手 +2 刻）、
 *   收招 +2、冷却 +6；关闭＝纯粹瞬发的快拳，伤害与冷却都更轻。一个换「一下更狠」，一个换「快得没有前摇」。
 *
 * 伤害段 `jab` 与参数同名；接触与 punch 标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    export const machpunchId = "machpunch";
    export const machpunchScene = "world_combat:move_machpunch";
    export const machpunchBoomText = "world_combat.move.machpunch.text.boom";
    export const machpunchWhiffText = "world_combat.move.machpunch.text.whiff";

    actionParameters.define(machpunchId, {
        /** 拳威力：40 +（物攻 − 55）× 0.24 [−10,26] +（速度 − 55）× 0.14 [−4,16]；重拳 ×1.2；夹 26..100。 */
        jab: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.24).clamp(-10, 26))
                .plus(F.stat("speed").minus(55).times(0.14).clamp(-4, 16))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(1.2), F.const(1)))
                .clamp(26, 100).round(1),
            "拳威力", {
                unit: "威力",
                description: "这一记直拳的威力；物攻给份量、速度给拳速。重拳式重两成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拳程：2.2 +（身高 − 1.4）× 0.35 [−0.15,0.9] +（物攻 − 55）× 0.004 [−0.08,0.2]；重拳 ×1.06；夹 1.9..3.4。 */
        reach: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.9))
                .plus(F.stat("attack").minus(55).times(0.004).clamp(-0.08, 0.2))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(1.06), F.const(1)))
                .clamp(1.9, 3.4).round(2),
            "拳程", {
                unit: "格",
                description: "拳头能打到多远，也是本招的实际射程来源；臂长的个体够得更远，力大的出拳带得更前。它在全族里最短。"
            }),
        /** 判定半径：0.36 +（身高 − 1.4）× 0.08 [−0.05,0.2]；夹 0.30..0.62。 */
        collisionRadius: formula(
            F.base(0.36).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.05, 0.2)).clamp(0.30, 0.62).round(2),
            "判定半径", { unit: "格", description: "拳面扫过活体的横向半径；身板越大拳面越宽。" }),
        /** 顶开距离：0.30 +（物攻 − 55）× 0.004 [−0.06,0.3]；重拳 ×1.25；夹 0.12..0.9。 */
        push: formula(
            F.base(0.30).plus(F.stat("attack").minus(55).times(0.004).clamp(-0.06, 0.3))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(1.25), F.const(1)))
                .clamp(0.12, 0.9).round(2),
            "顶开距离", { unit: "格", description: "这一拳把目标推开多远；物攻越高推得越远，重拳式再远四分之一。" }),
        /** 音爆环半径：0.7 +（速度 − 55）× 0.006 [−0.1,0.4]；夹 0.5..1.4。 */
        boom: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.1, 0.4)).clamp(0.5, 1.4).round(2),
            "音爆环半径", {
                unit: "格",
                description: "拳锋过后炸开的那道压缩空气环张多大；速度越快音爆越开，画面按它画出环的大小。"
            }),
        /** 音爆粒子数量：14 +（速度 − 55）× 0.25 [−2,12]；夹 10..34。 */
        ring: formula(
            F.base(14).plus(F.stat("speed").minus(55).times(0.25).clamp(-2, 12)).clamp(10, 34).round(0),
            "音爆粒子数量", {
                unit: "点",
                description: "音爆环与拳影的粒子数量，也直接驱动画面的发射量；速度越快越密。"
            }),
        /** 起手：0 + 重拳 2；夹 0..2 刻。 */
        tempo: seconds(
            F.base(0).plus(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(2), F.const(0)))
                .clamp(0, 2).round(0),
            "起手", "从起念到出拳之间的时间；默认 0（提交即打，没有前摇），重拳式先蓄一拍。"),
        /** 收招：5 −（速度 − 55）× 0.02 [−0.6,1.5] + 重拳 2；夹 3..9 刻。 */
        settle: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "收拳站定的时间；它不位移，所以收得干脆，重拳式多带回一点余势。"),
        /** 冷却：14 −（速度 − 55）× 0.08 [−2,3] + 重拳 6；夹 9..26 刻。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.08).clamp(-2, 3))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.machpunch.preference.heavy")), F.const(6), F.const(0)))
                .clamp(9, 26).round(0),
            "冷却", "两次出拳之间的等待；瞬发快拳回得最快，重拳式要重新蓄力。")
    });

    defineDamage(machpunchId, "jab", {}, { contact: true, punch: true });

    stages(machpunchId, [
        { level: 20, values: { jab: 50 } },
        { level: 38, values: { jab: 60, reach: 2.5 } }
    ]);

    describe(machpunchId, [
        { key: "description.0", values: ["jab", "reach", "collisionRadius"] },
        { key: "description.1", values: ["push"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.reach"] }
    ]);
}
