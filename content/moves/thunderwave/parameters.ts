/**
 * 电磁波 / Thunder Wave — 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Electric／变化／威力 0／命中 90／PP 20／单体，命中后目标陷入麻痹；
 *   flags 不含 powder（它是电，不是粉）。电属性对麻痹免疫（原生默认规则，共享层自动生效）。
 *
 * 世界化：把「发出微弱电击」翻成一记**瞬发、不飞行的直线电击**——施法者一放电，电流沿一条通视的直线
 *   瞬间打到目标身上，把共享的麻痹身份按上去；它不造成伤害（原生威力 0），靠的是必中与可靠。
 *   因为它走直线，掩体和挡在中间的身体会把它拦下：躲在墙后，或让同伴站在线上，就能替目标吃掉这一记。
 *   这是三式麻痹里唯一「只点一个、但不会被走位甩掉」的那个：跑得再快也躲不开一条瞬间的直线，只能不给线。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   reach        实际射程：等级（经验越足放电越远）＋ 特攻（电流越强打得到越远）。
 *   lockTicks    麻痹时长：特攻决定电击的穿透力，电得越透麻得越久。
 *   shockRadius  命中判定半径：碰撞箱高度（大个子更容易被电到）。
 *   arcs         电弧条数：特攻（电流越足分叉越多）＋ 等级台阶；它同时是画面里电弧的数量。
 *   joltSpeed    电流速度：速度（快个体放电更急），它决定画面里边走边炸的火花密度。
 *   tempo        起手：速度（越快越早放完）。
 *   recharge     冷却：等级（越熟练回得越快）。
 *
 * 配置 `surge`（蓄长）双向取舍：开启＝射程 ×1.3、麻痹 ×1.2，但起手 +3、冷却 ×1.25，用来隔远了点住跑得快的目标；
 *   关闭＝快放式，射程 ×0.9、麻痹 ×0.9，换来更短的起手与冷却，贴身乱战里更跟得上。两个方向各有适用局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const thunderwaveId = "thunderwave";

    actionParameters.define(thunderwaveId, {
        /** 射程：8 + 等级(≥25)偏移[0,2.4] + 特攻偏移[−1.5,3]；蓄长 ×1.3 / 快放 ×0.9；夹 6..15。 */
        reach: formula(
            F.base(8)
                .plus(F.level().minus(25).times(0.08).clamp(0, 2.4))
                .plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1.5, 3))
                .times(F.when(F.pref("surge"), F.const(1.3), F.const(0.9)))
                .clamp(6, 15).round(2),
            "放电距离", {
                unit: "格",
                description: "电流能沿直线打到多远；等级越高、特攻越强够得越远。它也是本招的实际射程，且需要一条没有被挡住的视线。"
            }),
        /** 麻痹时长：180 + 特攻偏移[−30,90]；蓄长 ×1.2 / 快放 ×0.9；夹 120..420。 */
        lockTicks: seconds(
            F.base(180).plus(F.stat("specialAttack").minus(60).times(0.8).clamp(-30, 90))
                .times(F.when(F.pref("surge"), F.const(1.2), F.const(0.9)))
                .clamp(120, 420).round(0),
            "麻痹时长", "目标肌肉锁住多久；电击越透（特攻越高）麻得越久。"),
        /** 判定半径：0.3 + 身高偏移[−0.12,0.3]；夹 0.18..0.6。 */
        shockRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.18, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "直线电击的横向判定半径；大个子更容易被电到。"
            }),
        /** 电弧条数：4 + 特攻偏移[0,10]；夹 4..20；等级台阶再抬。 */
        arcs: formula(
            F.base(4).plus(F.stat("specialAttack").minus(60).times(0.08).clamp(0, 10)).clamp(4, 20).round(0),
            "电弧条数", {
                unit: "条",
                description: "电流放出来时分叉的电弧数量；特攻越高越密，也是画面里电弧的数量。"
            }),
        /** 电流速度：2.0 + 速度偏移[−0.6,1.6]；夹 1.4..4.2。 */
        joltSpeed: formula(
            F.base(2.0).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.6, 1.6)).clamp(1.4, 4.2).round(2),
            "电流速度", {
                unit: "格/刻",
                description: "电流沿直线爬过去的快慢；速度快的个体放得更急，画面里火花也炸得更密。"
            }),
        /** 起手：8 − 速度偏移[−2,3] + 蓄长 3；夹 5..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("surge"), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把电攒到指尖需要多久；速度越快越短，蓄长式多攒一拍。"),
        /** 冷却：34 − 等级(≥25)偏移[0,8]；蓄长 ×1.25 / 快放 ×0.9；夹 18..60。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(25).times(0.15).clamp(0, 8))
                .times(F.when(F.pref("surge"), F.const(1.25), F.const(0.9)))
                .clamp(18, 60).round(0),
            "冷却", "两次放电之间的等待；等级越高回得越快，蓄长式缓得更久。")
    });

    stages(thunderwaveId, [
        { level: 40, values: { arcs: 12 } },
        { level: 55, values: { arcs: 15, lockTicks: 280 } }
    ]);

    describe(thunderwaveId, [
        { key: "description.0", values: ["reach","shockRadius"] },
        { key: "description.1", values: ["lockTicks"] },
        { key: "description.paralysis", values: [] },
        { key: "surge.on", values: [], when: function (context) { return read(context.detail.values, ["surge"]) === true; } },
        { key: "surge.off", values: [], when: function (context) { return read(context.detail.values, ["surge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lockTicks"] }
    ]);
}
