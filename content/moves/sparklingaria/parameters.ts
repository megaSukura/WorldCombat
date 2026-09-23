/**
 * 泡影的咏叹调 / sparklingaria 的参数与伤害段。
 *
 * 原生事实：Water／Special／威力 90／命中 100／PP 10／flags sound＋bypasssub／target allAdjacent（身边全体）。
 *   歌声散出大量气泡，被气泡碰到的宝可梦若中了灼伤会被治愈——唱歌的人自己不算在内。
 *
 * 翻译：把「唱着歌放出一大圈气泡」翻成**以自身为中心的一次气泡浪**：身周一片里的敌人被水压轰中
 *   （越靠中心越重），同一片里所有**别人**身上的灼伤被气泡洗净并回一点血。它是这一招里唯一的
 *   支援位——打与治同时发生，代价是它必须以自己为圆心、站得很近。
 *
 * 与别的歌／声音招分开：爆音波是纯声压、不看地面与属性、把人吹开；泡影的咏叹调是水系气泡、不看属性、
 *   不吹人，而是把一片里的灼伤洗掉。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   burst     气泡浪威力 90 + 特攻偏移；高音配置 ×0.85 / 收束 ×1.15。
 *   falloff   边缘保留 0.6 − 特攻偏移（特攻越高声压越均匀）。
 *   radius    波及半径 4.5 格 + 体型高度偏移 + 等级；高音 ×1.25 / 收束 ×0.85。
 *   bubbles   气泡数量 22 + 特攻偏移 + 等级偏移（同时驱动画面密度）。
 *   cureHeal  洗净灼伤后回血比例 5% + 特攻偏移（越会唱、水泡越养人）。
 *
 * 配置 `highNote`（高音）：开启＝范围 ×1.25、气泡 ×1.3、单点 ×0.85，起手 +2 刻、冷却 +8 刻，用来一次洗
 *   更大一片；关闭（收束咏叹调）＝范围 ×0.85、单点 ×1.15、更快收手，用来啃近身的一两个目标。
 *
 * 伤害段 `burst` 与参数同名，走共享换算（原生类别 Special、属性 Water、sound）。
 */
namespace PokemonSkills {
    actionParameters.define("sparklingaria", {
        /** 气泡浪威力：90 + 特攻偏移[−16,50]；高音 ×0.85 / 收束 ×1.15；夹 60..170。 */
        burst: formula(
            F.base(90)
                .plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-16, 50))
                .times(F.when(F.pref("highNote"), F.const(0.85), F.const(1.15)))
                .clamp(60, 170).round(1),
            "气泡浪威力", { base: 90,
                unit: "威力",
                description: "气泡浪在中心炸开时对每个敌人结算的基础威力；特攻越高唱得越响。离中心越远按边缘保留系数衰减；对手特防、相性与暴击在命中时另算。"
            }),
        /** 边缘保留：0.6 − 特攻偏移[−0.1,0.16]；夹 0.35..0.8。 */
        falloff: percent(
            F.base(0.6).minus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.1, 0.16)).clamp(0.35, 0.8).round(2),
            "边缘保留", "气泡浪推到最外圈时还剩多少威力；特攻越高的个体水压越均匀、衰减越小。"),
        /** 波及半径：4.5 + 身高偏移[−0.35,1.6] + 等级偏移[0,1.5]；高音 ×1.25 / 收束 ×0.85；夹 3..7.5 格。 */
        radius: formula(
            F.base(4.5)
                .plus(F.body("height").minus(1.4).times(1.0).clamp(-0.35, 1.6))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .times(F.when(F.pref("highNote"), F.const(1.25), F.const(0.85)))
                .clamp(3.0, 7.5).round(2),
            "波及半径", { base: 4.5,
                unit: "格",
                description: "气泡浪罩住身周多大一圈；体型高、等级高的个体炸得更开，高音配置最广。它也是本招的实际射程与指示圈半径。"
            }),
        /** 气泡数量：22 + 特攻偏移[−6,30] + 等级偏移[0,8]；高音 ×1.3 / 收束 ×0.85；夹 14..70。 */
        bubbles: formula(
            F.base(22)
                .plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-6, 30))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("highNote"), F.const(1.3), F.const(0.85)))
                .clamp(14, 70).round(0),
            "气泡数量", {
                unit: "个",
                description: "一次咏叹调放出多少个气泡；特攻越高、等级越高越多，也决定画面的密集程度。"
            }),
        /** 洗净回血：5% + 特攻偏移[−1.5%,6%]；夹 3%..14% 最大生命。 */
        cureHeal: percent(
            F.base(0.05).plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.015, 0.06)).clamp(0.03, 0.14),
            "洗净回血", "每洗掉一处灼伤，那只宝可梦回复的最大生命比例；特攻越高水泡越养人。"),
        maxTargets: hidden(10)
    });

    defineDamage("sparklingaria", "burst", {}, { sound: true });

    stages("sparklingaria", [
        { level: 34, values: { burst: 104 } },
        { level: 52, values: { burst: 118, radius: 5.4 } }
    ]);

    describe("sparklingaria", [
        { key: "description.0", values: ["burst", "falloff"] },
        { key: "description.additional", values: ["maxTargets"] },
        { key: "description.1", values: ["radius"] },
        { key: "description.2", values: ["cureHeal"] },
        { key: "note.on", values: [], when: function (context) { return read(context.detail.values, ["highNote"]) === true; } },
        { key: "note.off", values: [], when: function (context) { return read(context.detail.values, ["highNote"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.burst"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.burst", "tier.1.radius"] }
    ]);
}
