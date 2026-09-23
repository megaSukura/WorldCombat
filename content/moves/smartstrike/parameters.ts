/**
 * 修长之角 / smartstrike 的参数与伤害段。
 *
 * 原生事实：Steel、物理、威力 70、命中必定（accuracy true）、PP 10、接触，无次要效果（Cobblemon 1.8）。
 * 翻译：把「用尖尖的角刺入对手，攻击必定命中」翻成一记**自我制导的长角突刺**——角尖自己锁定目标并一路修正方向，
 * 所以对手挪开也躲不掉；刺的是甲缝，对手防御越高，角咬得越深。
 * 数据分散：物攻定突刺威力、**目标防御定咬入的额外威力**（越硬的甲越吃这招）、速度定锁定距离与转向修正、
 * 速度还定冲锋速度、体型高度定角尖判定半径、等级定成长。
 * 配置 focus（定准）把资源在「锁得更远更死」与「一刺更重」之间取舍。
 *
 * 伤害段：thrust 是那一下角刺。
 */
namespace PokemonSkills {
    actionParameters.define("smartstrike", {
        /** 突刺威力：物攻每比 60 多 1 加 0.16，再加目标防御 ×0.35，定准 ×0.88、速刺 ×1.12，夹在 38..158。 */
        thrust: formula(
            F.base(54).plus(F.stat("attack").minus(60).times(0.16)).plus(F.target("stat.def").times(0.35))
                .times(F.when(F.pref("focus"), F.const(0.88), F.const(1.12)))
                .clamp(38, 158).round(1),
            "突刺威力", {
                unit: "威力",
                description: "角刺的威力；物攻越高越深，**目标防御越高角咬入的加成越大**（刺的是甲缝）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 锁定距离：基础 8，等级每比 30 高 1 加 0.04，定准 ×1.18、速刺 ×0.92，夹在 6..12。 */
        lockRange: formula(
            F.base(8).plus(F.level().minus(30).times(0.04))
                .times(F.when(F.pref("focus"), F.const(1.18), F.const(0.92)))
                .clamp(6, 12).round(1),
            "锁定距离", {
                unit: "格",
                description: "角尖能锁定并追到多远的对手；也是射程与指示线长度。定准把锁定距离拉长。"
            }),
        /** 冲锋速度：基础 1.0 格/刻，速度每比 60 快 1 加 0.004，夹在 0.85..1.35。 */
        chargeSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.85, 1.35).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "追击途中每刻前进的速度；越快接触来得越早。"
            }),
        /** 转向修正：基础 12 度/刻，速度每比 60 快 1 加 0.06，定准 +4，夹在 8..24。 */
        steering: formula(
            F.base(12).plus(F.stat("speed").minus(60).times(0.06)).plus(F.when(F.pref("focus"), F.const(4), F.const(0)))
                .clamp(8, 24).round(1),
            "转向修正", {
                unit: "度/刻",
                description: "冲锋中每刻朝目标修正的最大角度；速度快的个体拐得更急，追得更死。定准再抬高修正。"
            }),
        /** 角尖半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.1，夹在 0.4..0.85。 */
        stabRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.4, 0.85).round(2),
            "角尖半径", {
                unit: "格",
                description: "角刺的横向判定半径；大个子角更粗、更易扎中。"
            }),
        /** 顶退：基础 0.5 格，物攻每比 60 多 1 加 0.004，夹在 0.3..1.1。 */
        push: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.004)).clamp(0.3, 1.1).round(2),
            "顶退", {
                unit: "格",
                description: "刺中后把目标顶开的距离；物攻高的个体顶得更远。"
            })
    });

    defineDamage("smartstrike", "thrust", {}, { contact: true });

    stages("smartstrike", [
        { level: 36, values: { thrust: 62, steering: 15 } },
        { level: 52, values: { thrust: 74, lockRange: 9.6 } }
    ]);

    describe("smartstrike", [
        { key: "description.0", values: ["thrust"] },
        { key: "description.1", values: ["lockRange","chargeSpeed","steering","stabRadius"] },
        { key: "description.2", values: ["push"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.thrust", "tier.0.steering"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.thrust", "tier.1.lockRange"] }
    ]);
}
