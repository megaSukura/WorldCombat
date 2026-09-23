/**
 * 反射壁 / reflect 的参数与数值来源。
 *
 * 原生事实：Psychic、变化、威力 —、命中 必中、PP 20、目标己方场地／side reflect，持续 5 回合，
 *   期间己方（施法者一侧）受到的物理攻击伤害减半。
 * 核心念头：在身侧立起一圈由硬光板拼成的壁，物理的打击撞在板上被削掉一块；镜面形态还把削下的那份弹回近身者。
 * 世界化：施法者挂共享身份 world_combat:status/reflect 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并以自身为锚每 20 刻把同一面壁补给半径内的友方；每面壁的削减份额与反弹份额写在该活体自己的
 *   领域的独立贡献里，物理伤害结算读取当前有效保护。壁跟着施法者走，领域结束时收回自己的贡献。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   plateTicks   基础 260 刻 + 等级 ×2 + 防御 ×0.5，夹 180..560；壁能立多久，防御高的人立得久。
 *   plateRadius  基础 3 格 + 身高 ×0.8 + 防御 ×0.008，夹 2.5..6；壁罩住多大一圈，身板大、防御高则更广。
 *   plates       基础 6 块 + 防御 ×0.06 + 等级 ×0.15，夹 4..16；环绕身体的硬光板数，粒子按它发射。
 *   cut          基础 0.34 + 防御 ×0.0012，再乘形态系数（镜面 ×0.8、坚壁 ×1.18），夹 0.2..0.55；物理减伤比例。
 *   rebound      基础 0.30 + 攻击 ×0.0012，再乘形态系数（镜面 ×1.3、坚壁 ×0，坚壁不反弹），夹 0..0.6。
 *   tempo        基础 11 刻 − 速度 ×0.03，加形态修正（镜面 −2、坚壁 +3），夹 4..17；立壁的起手。
 *   aftercast    基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge     基础 150 刻 − 速度 ×0.1，再乘形态系数（镜面 ×0.9、坚壁 ×1.12），夹 80..200；两次立壁的等待。
 * 配置 mirror 双向取舍：镜面立得快（起手 −2、冷却 ×0.9）、近身物理被挡下的部分按比例弹回攻击者（攻击越高弹得越重），
 *   代价是减伤只有坚壁的约七成；坚壁减伤厚（×1.18）但不反弹，代价是起手 +3、冷却 ×1.12。
 */
namespace PokemonSkills {
    export const reflectId = "reflect";
    export const reflectEffect = "world_combat:reflect_plates";
    export const reflectMark = "world_combat:reflect_mark";
    export const reflectScene = "world_combat:move_reflect";
    export const reflectStatus = "reflect";
    export const reflectRaiseText = "world_combat.move.reflect.text.raise";
    export const reflectBlockText = "world_combat.move.reflect.text.block";
    export const reflectReboundText = "world_combat.move.reflect.text.rebound";
    export const reflectFadeText = "world_combat.move.reflect.text.fade";

    actionParameters.define(reflectId, {
        plateTicks: seconds(
            F.base(260).plus(F.level().times(2)).plus(F.stat("defence").times(0.5)).clamp(180, 560).round(0),
            "护壁时长", "这面壁能立多久；等级与防御让硬光板撑得更久。"),
        plateRadius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.stat("defence").times(0.008)).clamp(2.5, 6),
            "护壁半径", { unit: " 格", description: "护壁罩住多大一圈队友；身板越大、防御越高罩得越广。" }),
        plates: formula(
            F.base(6).plus(F.stat("defence").times(0.06)).plus(F.level().times(0.15)).clamp(4, 16).round(0),
            "硬光板数", { unit: " 块", description: "环绕身体的硬光板数量；防御与等级越高板越多，粒子按它发射。" }),
        cut: percent(
            F.base(0.34).plus(F.stat("defence").times(0.0012))
                .times(F.when(F.pref("mirror"), F.const(0.8), F.const(1.18)))
                .clamp(0.2, 0.55),
            "物理减伤", "穿过护壁的物理伤害被削掉的比例；防御越高越厚，镜面 ×0.8、坚壁 ×1.18。"),
        rebound: percent(
            F.base(0.3).plus(F.stat("attack").times(0.0012))
                .times(F.when(F.pref("mirror"), F.const(1.3), F.const(0)))
                .clamp(0, 0.6),
            "反弹份额", "近身物理攻击撞上护壁时，被挡下的那份伤害有多大比例弹回攻击者；只有镜面会反弹，攻击越高弹得越重。"),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("mirror"), F.const(-2), F.const(3)))
                .clamp(4, 17).round(0),
            "起手", "立起护壁需要多久；速度越快越短，镜面 −2 刻、坚壁 +3 刻。"),
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0),
            "收招", "立壁之后的收势。"),
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("mirror"), F.const(0.9), F.const(1.12)))
                .clamp(80, 200).round(0),
            "冷却", "两次立壁之间的等待；镜面 ×0.9、坚壁 ×1.12。")
    });
    describe(reflectId, [
        { key: "description.0", values: ["plateTicks","plateRadius"] },
        { key: "description.1", values: ["cut", "rebound"] },
        { key: "form.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.mirror); } },
        { key: "form.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.mirror); } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
